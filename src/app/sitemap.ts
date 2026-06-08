import type { MetadataRoute } from 'next';
import { locales } from '@/lib/catalog';
import { getCategorySummaries, getAllSubCategories, getCatalogProducts } from '@/lib/catalog-service';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xh-motorparts.com';

  const staticRoutes = ['', '/products', '/about', '/contact', '/legal/privacy'];

  // 1. 靜態路由（首頁、產品目錄、公司介紹等）
  const localeStaticRoutes = locales.flatMap((locale) =>
    staticRoutes.map((route) => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.8,
    }))
  );

  // 2. 大分類路由 (動態從資料庫讀取)
  const categories = await getCategorySummaries('zh-TW');
  const categoryRoutes = locales.flatMap((locale) =>
    categories.map((c) => ({
      url: `${baseUrl}/${locale}/products/${c.key}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  );

  // 3. 子目錄路由（三層架構）
  const subCategories = await getAllSubCategories();
  const subCategoryRoutes = locales.flatMap((locale) =>
    subCategories.map((sub) => ({
      url: `${baseUrl}/${locale}/products/${sub.categorySlug}/${encodeURIComponent(sub.slug)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    }))
  );

  // 4. 產品詳細頁路由
  const products = await getCatalogProducts();
  const productRoutes = locales.flatMap((locale) =>
    products.map((product) => ({
      url: `${baseUrl}/${locale}/products/${product.category}/${encodeURIComponent(product.model)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  );

  return [...localeStaticRoutes, ...categoryRoutes, ...subCategoryRoutes, ...productRoutes];
}
