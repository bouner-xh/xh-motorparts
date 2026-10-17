// 後台寫入 API 的來源檢查（SX-13）：擋掉跨網站送來的 POST／PUT／DELETE／PATCH
// 規則：請求有 Origin 標頭、且與 Host（或 x-forwarded-host）不同源 → 拒絕；
// 沒有 Origin（伺服器對伺服器、curl）不擋，這類請求仍須通過登入驗證

export const WRITE_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

export function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.includes(method.toUpperCase());
}

function normalizeHost(value: string | null | undefined): string {
  // x-forwarded-host 可能有多個值（逗號分隔），第一個才是使用者看到的網域
  return (value ?? '').split(',')[0].trim().toLowerCase();
}

// 回傳 true 代表可以放行
export function isSameOriginRequest(headers: {origin?: string | null; host?: string | null; forwardedHost?: string | null}): boolean {
  const origin = headers.origin?.trim();
  if (!origin) return true;

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    // 'null'（沙盒 iframe 等）或格式錯誤的 Origin 一律拒絕
    return false;
  }

  const allowed = [normalizeHost(headers.host), normalizeHost(headers.forwardedHost)].filter(Boolean);
  return allowed.includes(originHost);
}
