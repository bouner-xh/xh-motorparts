import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import {getAllProducts, getProductsByCategory, findProduct, type Product} from '@/data/products';
import {categoryDescriptions, categoryKeys, categoryNames, type CategoryKey, type Locale} from '@/lib/catalog';
import {getSupabaseServerClient} from '@/lib/supabase/server';
import {searchProducts} from '@/lib/product-search';
import {matchCanonicalSegments} from '@/lib/canonical-path';
import {NO_IMAGE_URL} from '@/lib/product-image-url';
import {encodeSegment} from '@/lib/url-segment';
import {urlKeyColumnExists} from '@/lib/product-url-key';
import {isRealQueryFailure, rethrowUnlessFallback} from '@/lib/catalog-fallback';

const defaultImagePath = NO_IMAGE_URL;

// 資料庫已有網址代號欄位時，查詢要多選 url_key；還沒執行 SQL 時不選，網址仍用型號
// 欄位清單是執行時才決定的字串，型別推導不出欄位，所以標成 '*'（資料列都是 any）
const columns = (value: string) => value as '*';

async function urlKeySelect(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>) {
  return (await urlKeyColumnExists(supabase)) ? ',url_key' : '';
}

function getPrimaryCategorySlug(categoryRef: {slug?: string} | Array<{slug?: string}> | null) {
  return Array.isArray(categoryRef) ? categoryRef[0]?.slug : categoryRef?.slug;
}

function getLocalizedName(nameI18n: Record<string, string> | undefined, locale: Locale, modelNumber: string) {
  if (!nameI18n) {
    return modelNumber;
  }

  return nameI18n[locale] || nameI18n.en || nameI18n['zh-TW'] || modelNumber;
}

async function getPrimaryImageMap(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, productIds: string[] | null) {
  const imageMap = new Map<string, string>();

  if (productIds && !productIds.length) {
    return imageMap;
  }

  try {
    let query = supabase.from('product_images').select('product_id,storage_path,sort_order');
    if (productIds) query = query.in('product_id', productIds);
    const {data, error} = await query.order('sort_order', {ascending: true});
    if (error) throw error;

    (data || []).forEach((item) => {
      if (!imageMap.has(item.product_id)) {
        imageMap.set(item.product_id, item.storage_path || defaultImagePath);
      }
    });
  } catch (error) {
    // 正式環境圖片查詢失敗就不要快取「全部沒圖」的頁面
    rethrowUnlessFallback(error, 'getPrimaryImageMap');
    return imageMap;
  }

  return imageMap;
}

// 一個產品的所有圖片（依順序，第一張是主圖）
async function getProductImages(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, productId: string) {
  try {
    const {data, error} = await supabase
      .from('product_images')
      .select('storage_path,sort_order')
      .eq('product_id', productId)
      .order('sort_order', {ascending: true});
    if (error) throw error;
    return (data || []).map((item) => item.storage_path as string | null).filter((path): path is string => Boolean(path));
  } catch (error) {
    rethrowUnlessFallback(error, 'getProductImages');
    return [];
  }
}

// 產品的 OEM 對照料號與適用車型名稱（P8）；productIds 為 null 代表全部已上架產品。
// 資料庫還沒執行更新語法時查不到，回傳空的，網站其他功能照常運作
async function getVehicleInfo(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, productIds: string[] | null) {
  const oem = new Map<string, string[]>();
  const models = new Map<string, string[]>();
  if (productIds && !productIds.length) return {oem, models};

  // 對照料號與車型是兩組互不相依的查詢，同時發出（資料庫在遠端，每次往返都要等）
  const loadOem = async () => {
    try {
      let query = supabase.from('products').select('id, oem_numbers');
      if (productIds) query = query.in('id', productIds);
      const {data, error} = await query;
      if (!error) ((data as Array<{id: string; oem_numbers: string[] | null}> | null) || []).forEach((row) => row.oem_numbers?.length && oem.set(row.id, row.oem_numbers));
    } catch {
      // products.oem_numbers 還沒建立
    }
  };

  const loadModels = async () => {
    try {
      let linkQuery = supabase.from('product_vehicle_models').select('product_id, vehicle_model_id');
      if (productIds) linkQuery = linkQuery.in('product_id', productIds);
      const [{data: links, error}, {data: names}] = await Promise.all([linkQuery, supabase.from('vehicle_models').select('id, name')]);
      if (!error && links?.length) {
        const nameById = new Map(((names as Array<{id: string; name: string}> | null) || []).map((row) => [row.id, row.name]));
        for (const link of links as Array<{product_id: string; vehicle_model_id: string}>) {
          const name = nameById.get(link.vehicle_model_id);
          if (name) models.set(link.product_id, [...(models.get(link.product_id) || []), name]);
        }
        models.forEach((list, id) => models.set(id, [...list].sort((a, b) => a.localeCompare(b, 'en', {sensitivity: 'base'}))));
      }
    } catch {
      // 車型清單還沒建立
    }
  };

  await Promise.all([loadOem(), loadModels()]);
  return {oem, models};
}

export interface CategorySummary {
  key: CategoryKey;
  name: string;
  description: string;
  // 分類封面圖：分類自己上傳的封面，沒有就用第一個已上架且有照片的產品的照片
  coverImage?: string;
}

// 每個分類取第一個已上架且有照片的產品的照片，給分類卡片當封面
async function getCategoryCoverImages(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>) {
  const covers = new Map<string, string>();
  try {
    const {data, error} = await supabase
      .from('products')
      .select('id,category:categories!inner(slug)')
      .eq('is_active', true)
      .order('model_number', {ascending: true});
    if (error) throw error;
    const rows = (data || []) as Array<{id: string; category: {slug?: string} | Array<{slug?: string}> | null}>;
    const imageMap = await getPrimaryImageMap(supabase, rows.map((row) => row.id));
    for (const row of rows) {
      const slug = getPrimaryCategorySlug(row.category);
      const image = imageMap.get(row.id);
      if (slug && image && image !== defaultImagePath && !covers.has(slug)) covers.set(slug, image);
    }
  } catch (error) {
    // 查不到就用預設圖（正式環境則丟出錯誤，不快取沒有封面的頁面）
    rethrowUnlessFallback(error, 'getCategoryCoverImages');
  }
  return covers;
}

function staticCategorySummaries(locale: Locale): CategorySummary[] {
  return categoryKeys.map((key) => ({
    key,
    name: categoryNames[locale][key] || key,
    description: categoryDescriptions[locale][key] || ''
  }));
}

export const getCategorySummaries = cache(async (locale: Locale): Promise<CategorySummary[]> => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return staticCategorySummaries(locale);
  }

  try {
    // 資料庫還沒有封面欄位時，改用不含封面的查詢，網站照常運作
    let result: {data: Array<{slug: string; name_i18n: Record<string, string> | null; description_i18n: Record<string, string> | null; cover_image?: string | null}> | null; error: unknown} = await supabase
      .from('categories')
      .select('slug,name_i18n,description_i18n,cover_image')
      .order('sort_order', {ascending: true});
    if (result.error) {
      result = await supabase.from('categories').select('slug,name_i18n,description_i18n').order('sort_order', {ascending: true});
    }
    const {data, error} = result;

    if (error) throw error;
    // 資料庫沒有任何分類（還沒建立資料）時沿用舊行為：顯示預設分類
    if (!data?.length) return staticCategorySummaries(locale);

    const covers = await getCategoryCoverImages(supabase);
    return data.map((item) => ({
      key: item.slug as CategoryKey,
      name: item.name_i18n?.[locale] || categoryNames[locale][item.slug as CategoryKey] || item.slug,
      description:
        item.description_i18n?.[locale] || categoryDescriptions[locale][item.slug as CategoryKey] || '',
      // 封面順序：分類自己上傳的封面 → 該分類第一個已上架且有照片的產品的照片
      coverImage: item.cover_image || covers.get(item.slug)
    }));
  } catch (error) {
    rethrowUnlessFallback(error, 'getCategorySummaries');
    return staticCategorySummaries(locale);
  }
});

export const getCategoryProducts = cache(async (category: CategoryKey, subCategoryId: string | null = null, locale: Locale = 'en') => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getProductsByCategory(category);
  }

  try {
    const keyColumn = await urlKeySelect(supabase);
    let query = supabase
      .from('products')
      .select(columns(`id,model_number${keyColumn},name_i18n,stock_quantity,specifications,category:categories!inner(slug)`))
      .eq('category.slug', category)
      .eq('is_active', true)
      .order('model_number', {ascending: true});

    if (subCategoryId) {
      query = query.eq('sub_category_id', subCategoryId);
    }

    const {data, error} = await query;

    if (error) throw error;
    // 這個分類還沒有任何產品：沿用舊行為
    if (!data?.length) return getProductsByCategory(category);

    const imageMap = await getPrimaryImageMap(
      supabase,
      data.map((item) => item.id)
    );

    return data.map((item) => ({
      id: item.id,
      category,
      model: item.model_number,
      slug: (item as {url_key?: string | null}).url_key || item.model_number,
      name: getLocalizedName(item.name_i18n, locale, item.model_number),
      image: imageMap.get(item.id) || defaultImagePath,
      stock: item.stock_quantity ?? 0,
      specifications: item.specifications ?? []
    }));
  } catch (error) {
    rethrowUnlessFallback(error, 'getCategoryProducts');
    return getProductsByCategory(category);
  }
});

export const getCatalogProduct = cache(async (category: CategoryKey, modelNumber: string, locale: Locale = 'en') => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return findProduct(category, modelNumber);
  }

  try {
    const keyColumn = await urlKeySelect(supabase);
    const {data, error} = await supabase
      .from('products')
      .select(columns(`id,model_number${keyColumn},name_i18n,stock_quantity,specifications,category:categories!inner(slug),sub_category:sub_categories(slug)`))
      .eq('category.slug', category)
      .eq(keyColumn ? 'url_key' : 'model_number', modelNumber)
      .eq('is_active', true)
      .maybeSingle();

    if (isRealQueryFailure(error)) throw error;
    // 查無此產品（或型號重複查到多筆）：沿用舊行為
    if (!data) return findProduct(category, modelNumber);

    // 圖片與車型互不相依，同時查
    const [images, vehicle] = await Promise.all([getProductImages(supabase, data.id), getVehicleInfo(supabase, [data.id])]);

    return {
      id: data.id,
      category,
      model: data.model_number,
      slug: (data as {url_key?: string | null}).url_key || data.model_number,
      // 產品目前所在的子分類代號（網址裡的子分類不對時，頁面會轉到正確網址）
      subCategory: getPrimaryCategorySlug((data as {sub_category?: {slug?: string} | Array<{slug?: string}> | null}).sub_category ?? null) || '',
      name: getLocalizedName(data.name_i18n, locale, data.model_number),
      image: images[0] || defaultImagePath,
      images,
      oemNumbers: vehicle.oem.get(data.id) || [],
      vehicleModels: vehicle.models.get(data.id) || [],
      stock: data.stock_quantity ?? 0,
      specifications: data.specifications ?? []
    };
  } catch (error) {
    rethrowUnlessFallback(error, 'getCatalogProduct');
    return findProduct(category, modelNumber);
  }
});

// 所有已上架產品（sitemap 使用）；subCategory 為子分類代號，用來組出實際的產品網址（P10）
export const getCatalogProducts = cache(async (locale: Locale = 'en'): Promise<Array<Product & {subCategory: string}>> => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getAllProducts().map((p) => ({...p, subCategory: ''}));
  }

  try {
    const keyColumn = await urlKeySelect(supabase);
    const {data, error} = await supabase
      .from('products')
      .select(columns(`id,model_number${keyColumn},name_i18n,stock_quantity,specifications,category:categories!inner(slug),sub_category:sub_categories(slug)`))
      .eq('is_active', true)
      .order('model_number', {ascending: true});

    if (error) throw error;
    if (!data?.length) return getAllProducts().map((p) => ({...p, subCategory: ''}));

    const imageMap = await getPrimaryImageMap(
      supabase,
      data.map((item) => item.id)
    );

    return data
      .map((item) => {
        const categoryRef = item.category as {slug?: string} | Array<{slug?: string}> | null;
        const categorySlug = getPrimaryCategorySlug(categoryRef);

        return {
        id: item.id,
        category: (categorySlug || '') as CategoryKey,
        subCategory: getPrimaryCategorySlug(item.sub_category as {slug?: string} | Array<{slug?: string}> | null) || '',
        model: item.model_number,
        slug: (item as {url_key?: string | null}).url_key || item.model_number,
        name: getLocalizedName(item.name_i18n, locale, item.model_number),
        image: imageMap.get(item.id) || defaultImagePath,
        stock: item.stock_quantity ?? 0,
        specifications: item.specifications ?? []
      };
      });
  } catch (error) {
    rethrowUnlessFallback(error, 'getCatalogProducts');
    return getAllProducts().map((p) => ({...p, subCategory: ''}));
  }
});

export interface ProductSearchResult {
  id: string;
  category: CategoryKey;
  // 子分類代號；沒有子分類資料時為空字串（只能連到大分類頁）
  subCategory: string;
  model: string;
  slug?: string;
  name: string;
  image: string;
  stock: number;
  specifications: string[];
}

// 搜尋用的產品索引：已上架產品＋OEM 對照料號＋適用車型＋主圖，一次讀完
type SearchIndexItem = {
  id: string;
  category: CategoryKey;
  subCategory: string;
  model: string;
  slug: string;
  name: string;
  names: string[];
  stock: number;
  specifications: string[];
  oemNumbers: string[];
  vehicleModels: string[];
  image: string;
};

// 讀取失敗時丟出錯誤（錯誤結果不會被快取）；各查詢互不相依，同時發出
async function buildSearchIndex(locale: Locale): Promise<SearchIndexItem[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error('Supabase is not configured');

  const loadProducts = async () => {
    const keyColumn = await urlKeySelect(supabase);
    return supabase
      .from('products')
      .select(columns(`id,model_number${keyColumn},name_i18n,stock_quantity,specifications,category:categories!inner(slug),sub_category:sub_categories(slug)`))
      .eq('is_active', true);
  };
  const [{data, error}, vehicle, imageMap] = await Promise.all([loadProducts(), getVehicleInfo(supabase, null), getPrimaryImageMap(supabase, null)]);
  if (error || !data) throw new Error(error?.message || 'product search failed');

  return data.map((item) => {
    const nameI18n = (item.name_i18n || {}) as Record<string, string>;
    const subRef = item.sub_category as {slug?: string} | Array<{slug?: string}> | null;
    return {
      id: item.id as string,
      category: (getPrimaryCategorySlug(item.category as {slug?: string} | null) || '') as CategoryKey,
      subCategory: getPrimaryCategorySlug(subRef) || '',
      model: item.model_number as string,
      slug: ((item as {url_key?: string | null}).url_key || item.model_number) as string,
      name: getLocalizedName(nameI18n, locale, item.model_number),
      names: Object.values(nameI18n).filter(Boolean),
      stock: (item.stock_quantity as number | null) ?? 0,
      specifications: (item.specifications as string[] | null) ?? [],
      oemNumbers: vehicle.oem.get(item.id as string) || [],
      vehicleModels: vehicle.models.get(item.id as string) || [],
      image: imageMap.get(item.id as string) || defaultImagePath
    };
  });
}

// 正式環境把索引快取 5 分鐘；後台儲存時 revalidateCatalog() 會清掉（tag: catalog），所以改完產品馬上搜得到。
// 開發與測試環境不快取，測試直接改資料庫後馬上就能搜到
const cachedSearchIndex = unstable_cache(buildSearchIndex, ['search-index-v1'], {revalidate: 300, tags: ['catalog']});

// 前台產品搜尋（P2）：只搜尋已上架產品；型號、三種語言名稱、規格、OEM 對照料號、適用車型都可以搜
export async function searchCatalogProducts(query: string, locale: Locale = 'en'): Promise<ProductSearchResult[]> {
  if (!getSupabaseServerClient()) {
    const fallback = getAllProducts().map((p) => ({...p, subCategory: '', names: [p.name]}));
    return searchProducts(fallback, query).map(({names: _names, ...p}) => p);
  }

  let index: SearchIndexItem[];
  try {
    index = process.env.NODE_ENV === 'production' ? await cachedSearchIndex(locale) : await buildSearchIndex(locale);
  } catch (error) {
    console.error('[catalog] product search failed:', error instanceof Error ? error.message : error);
    return [];
  }

  return searchProducts(index, query).map(({names: _names, oemNumbers: _oem, vehicleModels: _models, ...item}) => item);
}

export interface SubCategorySummary {
  id: string;
  slug: string;
  name: string;
}

export const getSubCategories = cache(async (category: CategoryKey, locale: Locale = 'en'): Promise<SubCategorySummary[]> => {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('sub_categories')
      .select('id, slug, name_i18n, category:categories!inner(slug)')
      .eq('category.slug', category)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!data) return [];

    return data.map(item => ({
      id: item.id,
      slug: item.slug,
      name: getLocalizedName(item.name_i18n as Record<string, string>, locale, item.slug)
    }));
  } catch (error) {
    rethrowUnlessFallback(error, 'getSubCategories');
    return [];
  }
});

// 每個子分類取第一個已上架且有照片的產品的照片，給子分類卡片當封面（沒有照片的子分類不在結果裡）
export const getSubCategoryCoverImages = cache(async (subCategoryIds: string[]): Promise<Map<string, string>> => {
  const covers = new Map<string, string>();
  const supabase = getSupabaseServerClient();
  if (!supabase || !subCategoryIds.length) return covers;

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, sub_category_id')
      .eq('is_active', true)
      .in('sub_category_id', subCategoryIds)
      .order('model_number', { ascending: true });
    if (error) throw error;
    const rows = (data || []) as Array<{ id: string; sub_category_id: string | null }>;
    const imageMap = await getPrimaryImageMap(supabase, rows.map((row) => row.id));
    for (const row of rows) {
      const image = imageMap.get(row.id);
      if (row.sub_category_id && image && image !== defaultImagePath && !covers.has(row.sub_category_id)) covers.set(row.sub_category_id, image);
    }
  } catch (error) {
    // 查不到就用預設圖（正式環境則丟出錯誤，不快取沒有封面的頁面）
    rethrowUnlessFallback(error, 'getSubCategoryCoverImages');
  }
  return covers;
});

export const getSubCategoryBySlug = cache(async (category: CategoryKey, slug: string, locale: Locale = 'en'): Promise<SubCategorySummary | null> => {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('sub_categories')
      .select('id, slug, name_i18n, category:categories!inner(slug)')
      .eq('category.slug', category)
      .eq('slug', slug)
      .maybeSingle();

    if (isRealQueryFailure(error)) throw error;
    if (!data) return null;

    return {
      id: data.id,
      slug: data.slug,
      name: getLocalizedName(data.name_i18n as Record<string, string>, locale, data.slug)
    };
  } catch (error) {
    rethrowUnlessFallback(error, 'getSubCategoryBySlug');
    return null;
  }
});

export interface SubCategoryWithCategory {
  slug: string;
  categorySlug: string;
}

export const getAllSubCategories = cache(async (): Promise<SubCategoryWithCategory[]> => {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('sub_categories')
      .select('slug, category:categories!inner(slug)')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    if (!data) return [];

    return data.map((item: { slug: string; category: { slug?: string } | { slug?: string }[] | null }) => {
      const catSlug = Array.isArray(item.category) ? item.category[0]?.slug : item.category?.slug;
      return {
        slug: item.slug,
        categorySlug: catSlug || '',
      };
    });
  } catch (error) {
    rethrowUnlessFallback(error, 'getAllSubCategories');
    return [];
  }
});

export interface CategoryDetail {
  slug: string;
  name: string;
  description: string;
}

export const getCategoryBySlug = cache(async (slug: string, locale: Locale): Promise<CategoryDetail | null> => {
  const supabase = getSupabaseServerClient();
  const isStaticKey = (categoryKeys as readonly string[]).includes(slug);

  if (!supabase) {
    if (isStaticKey) {
      const k = slug as CategoryKey;
      return {
        slug,
        name: categoryNames[locale][k] || slug,
        description: categoryDescriptions[locale][k] || '',
      };
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (isRealQueryFailure(error)) throw error;
    if (!data) {
      // Fallback to static config
      if (isStaticKey) {
        const k = slug as CategoryKey;
        return {
          slug,
          name: categoryNames[locale][k] || slug,
          description: categoryDescriptions[locale][k] || '',
        };
      }
      return null;
    }

    const name = data.name_i18n?.[locale] || (isStaticKey ? categoryNames[locale][slug as CategoryKey] : data.slug);
    const desc = data.description_i18n?.[locale] || (isStaticKey ? categoryDescriptions[locale][slug as CategoryKey] : '');

    return {
      slug: data.slug,
      name,
      description: desc,
    };
  } catch (error) {
    rethrowUnlessFallback(error, 'getCategoryBySlug');
    if (isStaticKey) {
      const k = slug as CategoryKey;
      return {
        slug,
        name: categoryNames[locale][k] || slug,
        description: categoryDescriptions[locale][k] || '',
      };
    }
    return null;
  }
});

// 產品網址的大小寫與資料不同時，回傳正確的網址路徑（語系之後的部分，已編碼）；找不到或本來就正確則回傳 null
// 只在頁面找不到資料時才呼叫，用來把大小寫寫錯的網址轉到正確的網址
export async function resolveCanonicalProductPath(segments: string[]): Promise<string | null> {
  const [categories, subCategories, products] = await Promise.all([
    getCategorySummaries('en'),
    segments.length > 1 ? getAllSubCategories() : Promise.resolve([]),
    segments.length > 2 ? getCatalogProducts() : Promise.resolve([])
  ]);
  const match = matchCanonicalSegments(
    {
      categories: categories.map((category) => category.key as string),
      subCategories,
      products: products.map((product) => ({category: product.category as string, subCategory: product.subCategory, model: product.model, slug: product.slug}))
    },
    segments
  );
  return match ? `/products/${match.map(encodeSegment).join('/')}` : null;
}
