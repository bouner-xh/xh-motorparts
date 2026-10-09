import type { MetadataRoute } from 'next';
import { locales } from '@/lib/catalog';
import { getBaseUrl } from '@/lib/site';
import { getCategorySummaries, getAllSubCategories, getCatalogProducts } from '@/lib/catalog-service';
import { encodeSegment } from '@/lib/url-segment';

// 英文排在最前面（主要客戶是國際買家），其他語言接在後面
const sitemapLocales = ['en', ...locales.filter((locale) => locale !== 'en')];

// 每個語言版本的網址都附上其他語言的對應頁（hreflang）；x-default 指向英文
// 不填 lastModified：沒有可靠的更新時間，填「現在」會讓 Google 不再相信這個欄位
function entries(baseUrl: string, paths: string[], priority: number): MetadataRoute.Sitemap {
  return paths.flatMap((path) => {
    const languages: Record<string, string> = Object.fromEntries(sitemapLocales.map((locale) => [locale, `${baseUrl}/${locale}${path}`]));
    languages['x-default'] = `${baseUrl}/en${path}`;
    return sitemapLocales.map((locale) => ({
      url: `${baseUrl}/${locale}${path}`,
      priority,
      alternates: { languages },
    }));
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  // 1. 靜態路由（首頁、產品目錄、公司介紹等）
  const staticRoutes = ['', '/products', '/about', '/contact', '/legal/privacy'];

  // 2. 大分類路由 (動態從資料庫讀取)
  const categories = await getCategorySummaries('en');
  const categoryPaths = categories.map((c) => `/products/${encodeSegment(c.key)}`);

  // 3. 子目錄路由（三層架構）
  const subCategories = await getAllSubCategories();
  const subCategoryPaths = subCategories.map((sub) => `/products/${encodeSegment(sub.categorySlug)}/${encodeURIComponent(sub.slug)}`);

  // 4. 產品詳細頁路由：實際網址為 /products/大分類/子分類/型號；沒有子分類的產品沒有產品頁，不列入（P10）
  const products = (await getCatalogProducts()).filter((product) => product.subCategory);
  const productPaths = products.map(
    (product) => `/products/${encodeSegment(product.category)}/${encodeURIComponent(product.subCategory)}/${encodeURIComponent(product.model)}`
  );

  return [
    ...entries(baseUrl, staticRoutes, 0.8),
    ...entries(baseUrl, categoryPaths, 0.7),
    ...entries(baseUrl, subCategoryPaths, 0.65),
    ...entries(baseUrl, productPaths, 0.6),
  ];
}
