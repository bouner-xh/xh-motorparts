import {getAllProducts, getProductsByCategory, findProduct} from '@/data/products';
import {categoryDescriptions, categoryKeys, categoryNames, type CategoryKey, type Locale} from '@/lib/catalog';
import {getSupabaseServerClient} from '@/lib/supabase/server';

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
      name: categoryNames[locale][key],
      description: categoryDescriptions[locale][key]
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

    return data
      .filter((item) => categoryKeys.includes(item.slug as CategoryKey))
      .map((item) => ({
        key: item.slug as CategoryKey,
        name: item.name_i18n?.[locale] || categoryNames[locale][item.slug as CategoryKey],
        description:
          item.description_i18n?.[locale] || categoryDescriptions[locale][item.slug as CategoryKey]
      }));
  } catch {
    return categoryKeys.map((key) => ({
      key,
      name: categoryNames[locale][key],
      description: categoryDescriptions[locale][key]
    }));
  }
}

export async function getCategoryProducts(category: CategoryKey) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getProductsByCategory(category);
  }

  try {
    const {data, error} = await supabase
      .from('products')
      .select('id,model_number,name_i18n,stock_quantity,specifications,category:categories!inner(slug)')
      .eq('category.slug', category)
      .eq('is_active', true)
      .order('model_number', {ascending: true});

    if (error || !data?.length) {
      throw error;
    }

    return data.map((item) => ({
      id: item.id,
      category,
      model: item.model_number,
      name: item.name_i18n?.['zh-TW'] || item.model_number,
      image: 'images/no-image.jpg',
      stock: item.stock_quantity ?? 0,
      specifications: item.specifications ?? []
    }));
  } catch {
    return getProductsByCategory(category);
  }
}

export async function getCatalogProduct(category: CategoryKey, modelNumber: string) {
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

    return {
      id: data.id,
      category,
      model: data.model_number,
      name: data.name_i18n?.['zh-TW'] || data.model_number,
      image: 'images/no-image.jpg',
      stock: data.stock_quantity ?? 0,
      specifications: data.specifications ?? []
    };
  } catch {
    return findProduct(category, modelNumber);
  }
}

export async function getCatalogProducts() {
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

    return data
      .filter((item) => {
        const categoryRef = item.category as {slug?: string} | Array<{slug?: string}> | null;
        const categorySlug = Array.isArray(categoryRef) ? categoryRef[0]?.slug : categoryRef?.slug;
        return categoryKeys.includes(categorySlug as CategoryKey);
      })
      .map((item) => {
        const categoryRef = item.category as {slug?: string} | Array<{slug?: string}> | null;
        const categorySlug = Array.isArray(categoryRef) ? categoryRef[0]?.slug : categoryRef?.slug;

        return {
        id: item.id,
        category: categorySlug as CategoryKey,
        model: item.model_number,
        name: item.name_i18n?.['zh-TW'] || item.model_number,
        image: 'images/no-image.jpg',
        stock: item.stock_quantity ?? 0,
        specifications: item.specifications ?? []
      };
      });
  } catch {
    return getAllProducts();
  }
}
