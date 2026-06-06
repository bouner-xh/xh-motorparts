import type { MetadataRoute } from 'next';
import { getAllProducts } from '@/data/products';
import { categoryKeys, locales } from '@/lib/catalog';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xh-motorparts.com';

  const staticRoutes = ['', '/products', '/about', '/contact', '/legal/privacy'];
  const products = getAllProducts();

  const localeStaticRoutes = locales.flatMap((locale) =>
    staticRoutes.map((route) => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.8,
    }))
  );

  const categoryRoutes = locales.flatMap((locale) =>
    categoryKeys.map((category) => ({
      url: `${baseUrl}/${locale}/products/${category}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  );

  const productRoutes = locales.flatMap((locale) =>
    products.map((product) => ({
      url: `${baseUrl}/${locale}/products/${product.category}/${encodeURIComponent(product.model)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  );

  return [...localeStaticRoutes, ...categoryRoutes, ...productRoutes];
}
