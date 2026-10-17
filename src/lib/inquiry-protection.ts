// 詢價表單防護設定檢查
// 正式環境必須同時啟用機器人驗證（Turnstile）與流量限制（Upstash），
// 缺少任何一項就停止收單，避免設定遺漏時表單在沒有防護的情況下對外開放。

import { createHash } from 'node:crypto';

const REQUIRED_PROTECTION_ENV = [
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN'
] as const;

type Env = Record<string, string | undefined>;

// Vercel 以 VERCEL_ENV 區分 production / preview；其他主機以 NODE_ENV 判斷
export function isProductionDeployment(env: Env = process.env): boolean {
  if (env.VERCEL_ENV) {
    return env.VERCEL_ENV === 'production';
  }

  return env.NODE_ENV === 'production';
}

export function getMissingProtectionConfig(env: Env = process.env): string[] {
  return REQUIRED_PROTECTION_ENV.filter((key) => !env[key]);
}

// ---- 工作包 B（2026-10-17 網站健診 SX-5）：確認信額度與 Turnstile 網域檢查 ----

// 同一收件信箱每天最多寄出的確認信數（超過仍收下詢價單，只是不再寄確認信）
export const CONFIRMATION_EMAIL_DAILY_LIMIT = 3;

// 每日額度的 Redis 鍵：以信箱（轉小寫）的雜湊取代明文，避免把買家信箱原文放進 Redis；日期以 UTC 計
export function confirmationQuotaKey(email: string, now: Date = new Date()): string {
  const digest = createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32);
  return `inquiry-confirm:${now.toISOString().slice(0, 10)}:${digest}`;
}

// Turnstile 驗證通過後，回傳的 hostname 必須是本站網域（localhost 供測試使用）
const ALLOWED_TURNSTILE_HOSTNAMES = ['xh-motorparts.com', 'www.xh-motorparts.com', 'localhost'];

export function isAllowedTurnstileHostname(hostname: unknown): boolean {
  return typeof hostname === 'string' && ALLOWED_TURNSTILE_HOSTNAMES.includes(hostname.trim().toLowerCase());
}

// 取 x-forwarded-for 的第一個位址作為買家 IP；沒有時回傳空字串
export function firstForwardedIp(header: string | null | undefined): string {
  return header?.split(',')[0]?.trim() || '';
}
