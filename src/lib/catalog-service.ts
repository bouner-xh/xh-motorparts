import { cache } from 'react';
import {getAllProducts, getProductsByCategory, findProduct, type Product} from '@/data/products';
import {categoryDescriptions, categoryKeys, categoryNames, type CategoryKey, type Locale} from '@/lib/catalog';
import {getSupabaseServerClient} from '@/lib/supabase/server';
import {searchProducts} from '@/lib/product-search';
import {matchCanonicalSegments} from '@/lib/canonical-path';
import {encodeSegment} from '@/lib/url-segment';

const defaultImagePath = 'images/no-image.jpg';

function getPrimaryCategorySlug(categoryRef: {slug?: string} | Array<{slug?: string}> | null) {
  return Array.isArray(categoryRef) ? categoryRef[0]?.slug : categoryRef?.slug;
}

function getLocalizedName(nameI18n: Record<string, string> | undefined, locale: Locale, modelNumber: string) {
  if (!nameI18n) {
    return modelNumber;
  }

  return nameI18n[locale] || nameI18n.en || nameI18n['zh-TW'] || modelNumber;
}

async function getPrimaryImageMap(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, productIds: string[]) {
  const imageMap = new Map<string, string>();

  if (!productIds.length) {
    return imageMap;
  }

  try {
    const {data} = await supabase
      .from('product_images')
      .select('product_id,storage_path,sort_order')
      .in('product_id', productIds)
      .order('sort_order', {ascending: true});

    (data || []).forEach((item) => {
      if (!imageMap.has(item.product_id)) {
        imageMap.set(item.product_id, item.storage_path || defaultImagePath);
      }
    });
  } catch {
    return imageMap;
  }

  return imageMap;
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
    const {data} = await supabase
      .from('products')
      .select('id,category:categories!inner(slug)')
      .eq('is_active', true)
      .order('model_number', {ascending: true});
    const rows = (data || []) as Array<{id: string; category: {slug?: string} | Array<{slug?: string}> | null}>;
    const imageMap = await getPrimaryImageMap(supabase, rows.map((row) => row.id));
    for (const row of rows) {
      const slug = getPrimaryCategorySlug(row.category);
      const image = imageMap.get(row.id);
      if (slug && image && image !== defaultImagePath && !covers.has(slug)) covers.set(slug, image);
    }
  } catch {
    // 查不到就用預設圖
  }
  return covers;
}

export const getCategorySummaries = cache(async (locale: Locale): Promise<CategorySummary[]> => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return categoryKeys.map((key) => ({
      key,
      name: categoryNames[locale][key] || key,
      description: categoryDescriptions[locale][key] || ''
    }));
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

    if (error || !data?.length) {
      throw error;
    }

    const covers = await getCategoryCoverImages(supabase);
    return data.map((item) => ({
      key: item.slug as CategoryKey,
      name: item.name_i18n?.[locale] || categoryNames[locale][item.slug as CategoryKey] || item.slug,
      description:
        item.description_i18n?.[locale] || categoryDescriptions[locale][item.slug as CategoryKey] || '',
      // 封面順序：分類自己上傳的封面 → 該分類第一個已上架且有照片的產品的照片
      coverImage: item.cover_image || covers.get(item.slug)
    }));
  } catch {
    return categoryKeys.map((key) => ({
      key,
      name: categoryNames[locale][key] || key,
      description: categoryDescriptions[locale][key] || ''
    }));
  }
});

export const getCategoryProducts = cache(async (category: CategoryKey, subCategoryId: string | null = null, locale: Locale = 'en') => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getProductsByCategory(category);
  }

  try {
    let query = supabase
      .from('products')
      .select('id,model_number,name_i18n,stock_quantity,specifications,category:categories!inner(slug)')
      .eq('category.slug', category)
      .eq('is_active', true)
      .order('model_number', {ascending: true});

    if (subCategoryId) {
      query = query.eq('sub_category_id', subCategoryId);
    }

    const {data, error} = await query;

    if (error || !data?.length) {
      throw error;
    }

    const imageMap = await getPrimaryImageMap(
      supabase,
      data.map((item) => item.id)
    );

    return data.map((item) => ({
      id: item.id,
      category,
      model: item.model_number,
      name: getLocalizedName(item.name_i18n, locale, item.model_number),
      image: imageMap.get(item.id) || defaultImagePath,
      stock: item.stock_quantity ?? 0,
      specifications: item.specifications ?? []
    }));
  } catch {
    return getProductsByCategory(category);
  }
});

export const getCatalogProduct = cache(async (category: CategoryKey, modelNumber: string, locale: Locale = 'en') => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return findProduct(category, modelNumber);
  }

  try {
    const {data, error} = await supabase
      .from('products')
      .select('id,model_number,name_i18n,stock_quantity,specifications,category:categories!inner(slug)')
      .eq('category.slug', category)
      .eq('model_number', modelNumber)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      throw error;
    }

    const imageMap = await getPrimaryImageMap(supabase, [data.id]);

    return {
      id: data.id,
      category,
      model: data.model_number,
      name: getLocalizedName(data.name_i18n, locale, data.model_number),
      image: imageMap.get(data.id) || defaultImagePath,
      stock: data.stock_quantity ?? 0,
      specifications: data.specifications ?? []
    };
  } catch {
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
    const {data, error} = await supabase
      .from('products')
      .select('id,model_number,name_i18n,stock_quantity,specifications,category:categories!inner(slug),sub_category:sub_categories(slug)')
      .eq('is_active', true)
      .order('model_number', {ascending: true});

    if (error || !data?.length) {
      throw error;
    }

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
        name: getLocalizedName(item.name_i18n, locale, item.model_number),
        image: imageMap.get(item.id) || defaultImagePath,
        stock: item.stock_quantity ?? 0,
        specifications: item.specifications ?? []
      };
      });
  } catch {
    return getAllProducts().map((p) => ({...p, subCategory: ''}));
  }
});

export interface ProductSearchResult {
  id: string;
  category: CategoryKey;
  // 子分類代號；沒有子分類資料時為空字串（只能連到大分類頁）
  subCategory: string;
  model: string;
  name: string;
  image: string;
  stock: number;
  specifications: string[];
}

// 前台產品搜尋（P2）：只搜尋已上架產品；型號、三種語言名稱、規格都可以搜
export async function searchCatalogProducts(query: string, locale: Locale = 'en'): Promise<ProductSearchResult[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    const fallback = getAllProducts().map((p) => ({...p, subCategory: '', names: [p.name]}));
    return searchProducts(fallback, query).map(({names: _names, ...p}) => p);
  }

  const {data, error} = await supabase
    .from('products')
    .select('id,model_number,name_i18n,stock_quantity,specifications,category:categories!inner(slug),sub_category:sub_categories(slug)')
    .eq('is_active', true);

  if (error || !data) {
    console.error('[catalog] product search failed:', error?.message);
    return [];
  }

  const searchable = data.map((item) => {
    const nameI18n = (item.name_i18n || {}) as Record<string, string>;
    const subRef = item.sub_category as {slug?: string} | Array<{slug?: string}> | null;
    return {
      id: item.id as string,
      category: (getPrimaryCategorySlug(item.category as {slug?: string} | null) || '') as CategoryKey,
      subCategory: getPrimaryCategorySlug(subRef) || '',
      model: item.model_number as string,
      name: getLocalizedName(nameI18n, locale, item.model_number),
      names: Object.values(nameI18n).filter(Boolean),
      stock: (item.stock_quantity as number | null) ?? 0,
      specifications: (item.specifications as string[] | null) ?? [],
      image: defaultImagePath
    };
  });

  const matched = searchProducts(searchable, query);
  const imageMap = await getPrimaryImageMap(
    supabase,
    matched.map((item) => item.id)
  );
  return matched.map(({names: _names, ...item}) => ({...item, image: imageMap.get(item.id) || defaultImagePath}));
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

    if (error || !data) return [];

    return data.map(item => ({
      id: item.id,
      slug: item.slug,
      name: getLocalizedName(item.name_i18n as Record<string, string>, locale, item.slug)
    }));
  } catch {
    return [];
  }
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

    if (error || !data) return null;

    return {
      id: data.id,
      slug: data.slug,
      name: getLocalizedName(data.name_i18n as Record<string, string>, locale, data.slug)
    };
  } catch {
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

    if (error || !data) return [];

    return data.map((item: { slug: string; category: { slug?: string } | { slug?: string }[] | null }) => {
      const catSlug = Array.isArray(item.category) ? item.category[0]?.slug : item.category?.slug;
      return {
        slug: item.slug,
        categorySlug: catSlug || '',
      };
    });
  } catch {
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

    if (error || !data) {
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
  } catch {
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
      products: products.map((product) => ({category: product.category as string, subCategory: product.subCategory, model: product.model}))
    },
    segments
  );
  return match ? `/products/${match.map(encodeSegment).join('/')}` : null;
}
