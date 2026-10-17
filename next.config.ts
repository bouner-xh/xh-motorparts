import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import {buildSecurityHeaders} from './src/lib/security-headers';

const isProduction = process.env.NODE_ENV === 'production';

const securityHeaders = buildSecurityHeaders({isProduction, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL});

const nextConfig: NextConfig = {
  // 不回傳 X-Powered-By: Next.js
  poweredByHeader: false,
  // 根網址一律轉到英文（預設語系）。沒有根頁面，<html> 由 [locale]/layout 提供，
  // 所以轉址放在這裡；專案根目錄的 middleware.ts 因為程式在 src/ 底下而不會被載入
  async redirects() {
    return [{ source: '/', destination: '/en', permanent: false }];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // 後台 API 一律不快取（明確列出，不依賴下方頁面規則碰巧比對）
        source: '/api/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/:locale/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
