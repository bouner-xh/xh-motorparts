import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xh-motorparts.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/*/admin/', '/api/', '/_next/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
