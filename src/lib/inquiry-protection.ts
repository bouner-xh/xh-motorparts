// 詢價表單防護設定檢查
// 正式環境必須同時啟用機器人驗證（Turnstile）與流量限制（Upstash），
// 缺少任何一項就停止收單，避免設定遺漏時表單在沒有防護的情況下對外開放。

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
