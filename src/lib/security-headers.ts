// 全站安全標頭（next.config.ts 使用）。抽成獨立檔案以便單元測試

// GA4 與 Clarity 送出資料、載入主程式所需的網域
// 參考：https://developers.google.com/tag-platform/security/guides/csp
const analyticsConnectHosts =
  'https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.clarity.ms https://c.bing.com';
const analyticsImgHosts =
  'https://*.google-analytics.com https://*.googletagmanager.com https://*.clarity.ms https://c.bing.com';

// 從 NEXT_PUBLIC_SUPABASE_URL 取出網域（origin）；沒設定或格式錯誤時退回原本較寬鬆的值，避免開發環境壞掉
export function getSupabaseConnectSource(supabaseUrl: string | undefined): string {
  if (supabaseUrl) {
    try {
      return new URL(supabaseUrl).origin;
    } catch {
      // 格式錯誤：退回寬鬆值
    }
  }
  return 'https://*.supabase.co';
}

export function buildCsp({isProduction, supabaseUrl}: {isProduction: boolean; supabaseUrl?: string}): string {
  const scriptSrc = isProduction
    ? "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com https://*.clarity.ms"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://challenges.cloudflare.com https://*.clarity.ms";

  const supabaseSource = getSupabaseConnectSource(supabaseUrl);
  // 瀏覽器端不會呼叫 Resend（寄信都在伺服器），所以 connect-src 不含 api.resend.com
  const connectSrc = isProduction
    ? `connect-src 'self' ${supabaseSource} ${analyticsConnectHosts}`
    : `connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* ${supabaseSource} ${analyticsConnectHosts}`;

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    // *.cloudflare.com 已移除（Turnstile 在自己的 iframe 內，圖片不受本站 CSP 影響）；
    // *.r2.dev 無法確認資料庫內是否還有舊圖片網址，先保留
    `img-src 'self' data: blob: https://*.r2.dev https://*.supabase.co ${analyticsImgHosts}`,
    connectSrc,
    'frame-src https://challenges.cloudflare.com',
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
}

export function buildSecurityHeaders({isProduction, supabaseUrl}: {isProduction: boolean; supabaseUrl?: string}) {
  return [
    {key: 'X-Frame-Options', value: 'DENY'},
    {key: 'X-Content-Type-Options', value: 'nosniff'},
    {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
    {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'},
    {key: 'Cross-Origin-Opener-Policy', value: 'same-origin'},
    {key: 'Cross-Origin-Resource-Policy', value: 'same-site'},
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload'
    },
    {key: 'Content-Security-Policy', value: buildCsp({isProduction, supabaseUrl})}
  ];
}
