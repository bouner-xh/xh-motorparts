import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // 不封鎖 /_next/：Google 需要讀取網站的樣式與程式，才能正確判斷網頁在手機上的呈現（SEO 調整）
        disallow: ['/*/admin/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
