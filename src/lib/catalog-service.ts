import {getAllProducts, getProductsByCategory, findProduct} from '@/data/products';
import {categoryDescriptions, categoryKeys, categoryNames, type CategoryKey, type Locale} from '@/lib/catalog';
import {getSupabaseServerClient} from '@/lib/supabase/server';

const defaultImagePath = 'images/no-image.jpg';

function getPrimaryCategorySlug(categoryRef: {slug?: string} | Array<{slug?: string}> | null) {
  return Array.isArray(categoryRef) ? categoryRef[0]?.slug : categoryRef?.slug;
}

function getLocalizedName(nameI18n: Record<string, string> | undefined, locale: Locale, modelNumber: string) {
  if (!nameI18n) {
    return modelNumber;
  }

  return nameI18n[locale] || nameI18n['zh-TW'] || nameI18n.en || modelNumber;
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
}

export async function getCategorySummaries(locale: Locale): Promise<CategorySummary[]> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return categoryKeys.map((key) => ({
      key,
      name: categoryNames[locale][key] || key,
      description: categoryDescriptions[locale][key] || ''
    }));
  }

  try {
    const {data, error} = await supabase
      .from('categories')
      .select('slug,name_i18n,description_i18n')
      .order('sort_order', {ascending: true});

    if (error || !data?.length) {
      throw error;
    }

    return data.map((item) => ({
      key: item.slug,
      name: item.name_i18n?.[locale] || categoryNames[locale][item.slug] || item.slug,
      description:
        item.description_i18n?.[locale] || categoryDescriptions[locale][item.slug] || ''
    }));
  } catch {
    return categoryKeys.map((key) => ({
      key,
      name: categoryNames[locale][key] || key,
      description: categoryDescriptions[locale][key] || ''
    }));
  }
}

export async function getCategoryProducts(category: CategoryKey, subCategoryId: string | null = null, locale: Locale = 'zh-TW') {
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
}

export async function getCatalogProduct(category: CategoryKey, modelNumber: string, locale: Locale = 'zh-TW') {
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
}

export async function getCatalogProducts(locale: Locale = 'zh-TW') {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getAllProducts();
  }

  try {
    const {data, error} = await supabase
      .from('products')
      .select('id,model_number,name_i18n,stock_quantity,specifications,category:categories!inner(slug)')
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
        model: item.model_number,
        name: getLocalizedName(item.name_i18n, locale, item.model_number),
        image: imageMap.get(item.id) || defaultImagePath,
        stock: item.stock_quantity ?? 0,
        specifications: item.specifications ?? []
      };
      });
  } catch {
    return getAllProducts();
  }
}

export interface SubCategorySummary {
  id: string;
  slug: string;
  name: string;
}

export async function getSubCategories(category: CategoryKey, locale: Locale = 'zh-TW'): Promise<SubCategorySummary[]> {
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
}

export async function getSubCategoryBySlug(category: CategoryKey, slug: string, locale: Locale = 'zh-TW'): Promise<SubCategorySummary | null> {
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
}

export interface SubCategoryWithCategory {
  slug: string;
  categorySlug: string;
}

export async function getAllSubCategories(): Promise<SubCategoryWithCategory[]> {
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
}

export interface CategoryDetail {
  slug: string;
  name: string;
  description: string;
}

export async function getCategoryBySlug(slug: string, locale: Locale): Promise<CategoryDetail | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    if (categoryKeys.includes(slug)) {
      return {
        slug,
        name: categoryNames[locale][slug] || slug,
        description: categoryDescriptions[locale][slug] || '',
      };
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      // Fallback to static config
      if (categoryKeys.includes(slug)) {
        return {
          slug,
          name: categoryNames[locale][slug] || slug,
          description: categoryDescriptions[locale][slug] || '',
        };
      }
      return null;
    }

    return {
      slug: data.slug,
      name: data.name_i18n?.[locale] || categoryNames[locale][data.slug] || data.slug,
      description: data.description_i18n?.[locale] || categoryDescriptions[locale][data.slug] || '',
    };
  } catch {
    if (categoryKeys.includes(slug)) {
      return {
        slug,
        name: categoryNames[locale][slug] || slug,
        description: categoryDescriptions[locale][slug] || '',
      };
    }
    return null;
  }
}
