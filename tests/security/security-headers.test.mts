// 全站安全標頭與 CSP 組裝（SX-8／SX-9／SX-13）
// 執行：node --experimental-strip-types --test 'tests/security/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsp, buildSecurityHeaders, getSupabaseConnectSource } from '../../src/lib/security-headers.ts';

const SUPABASE = 'https://abcd1234.supabase.co';

function directive(csp: string, name: string) {
  return csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';
}

test('CSP 補上 base-uri、object-src、form-action、frame-ancestors', () => {
  const csp = buildCsp({ isProduction: true, supabaseUrl: SUPABASE });
  assert.ok(csp.includes("base-uri 'self'"));
  assert.ok(csp.includes("object-src 'none'"));
  assert.ok(csp.includes("form-action 'self'"));
  assert.ok(csp.includes("frame-ancestors 'none'"));
});

test('Turnstile 需要的 script 與 frame 來源保留', () => {
  const csp = buildCsp({ isProduction: true, supabaseUrl: SUPABASE });
  assert.ok(directive(csp, 'script-src').includes('https://challenges.cloudflare.com'));
  assert.equal(directive(csp, 'frame-src'), 'frame-src https://challenges.cloudflare.com');
});

test('維持 script-src unsafe-inline（先不做 nonce）；正式環境不含 unsafe-eval', () => {
  const prod = directive(buildCsp({ isProduction: true, supabaseUrl: SUPABASE }), 'script-src');
  assert.ok(prod.includes("'unsafe-inline'"));
  assert.ok(!prod.includes('unsafe-eval'));
  assert.ok(directive(buildCsp({ isProduction: false }), 'script-src').includes("'unsafe-eval'"));
});

test('connect-src 收斂成專案網域、移除 Resend', () => {
  const connect = directive(buildCsp({ isProduction: true, supabaseUrl: `${SUPABASE}/rest/v1` }), 'connect-src');
  assert.ok(connect.includes(SUPABASE));
  assert.ok(!connect.includes('*.supabase.co'));
  assert.ok(!connect.includes('resend'));
  assert.ok(connect.includes('https://*.google-analytics.com'), '分析服務保留');
});

test('沒設定或格式錯誤的 Supabase 網址退回寬鬆值', () => {
  assert.equal(getSupabaseConnectSource(undefined), 'https://*.supabase.co');
  assert.equal(getSupabaseConnectSource('not a url'), 'https://*.supabase.co');
  assert.ok(directive(buildCsp({ isProduction: false }), 'connect-src').includes('https://*.supabase.co'));
});

test('img-src 移除 cloudflare.com，產品圖片來源 supabase.co 保留', () => {
  const img = directive(buildCsp({ isProduction: true, supabaseUrl: SUPABASE }), 'img-src');
  assert.ok(!img.includes('cloudflare.com'));
  assert.ok(img.includes('https://*.supabase.co'));
  assert.ok(img.includes("'self'"));
});

test('標頭：Permissions-Policy、COOP、CORP', () => {
  const headers = buildSecurityHeaders({ isProduction: true, supabaseUrl: SUPABASE });
  const get = (k: string) => headers.find((h) => h.key === k)?.value;
  assert.equal(get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  assert.equal(get('Cross-Origin-Opener-Policy'), 'same-origin');
  assert.equal(get('Cross-Origin-Resource-Policy'), 'same-site');
  assert.equal(get('X-Frame-Options'), 'DENY');
});
