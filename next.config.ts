import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const isProduction = process.env.NODE_ENV === 'production';

// GA4 與 Clarity 送出資料、載入主程式所需的網域
// 參考：https://developers.google.com/tag-platform/security/guides/csp
const analyticsConnectHosts =
  'https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.clarity.ms https://c.bing.com';
const analyticsImgHosts =
  'https://*.google-analytics.com https://*.googletagmanager.com https://*.clarity.ms https://c.bing.com';

const cspScriptSrc = isProduction
  ? "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com https://*.clarity.ms"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://challenges.cloudflare.com https://*.clarity.ms";

const cspConnectSrc = isProduction
  ? `connect-src 'self' https://*.supabase.co https://api.resend.com ${analyticsConnectHosts}`
  : `connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https://*.supabase.co https://api.resend.com ${analyticsConnectHosts}`;

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      cspScriptSrc,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://*.r2.dev https://*.cloudflare.com https://*.supabase.co ${analyticsImgHosts}`,
      cspConnectSrc,
      "frame-src https://challenges.cloudflare.com",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
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
