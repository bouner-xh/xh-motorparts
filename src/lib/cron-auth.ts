// Vercel 排程（Cron）呼叫的驗證
// 設定 CRON_SECRET 環境變數後，Vercel 排程會自動帶上 Authorization: Bearer <CRON_SECRET>
// 純函式、不依賴框架，方便單元測試（tests/security/cron-auth.test.mts）
import {timingSafeEqual} from 'node:crypto';

export function isAuthorizedCron(authorization: string | null | undefined, secret: string | undefined): boolean {
  // 沒有設定密碼時一律拒絕，避免任何人都能呼叫
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization || '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
