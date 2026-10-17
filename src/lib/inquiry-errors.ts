// 詢價 API 的穩定錯誤代碼（2026-10-17 網站健診 UX-03）
// API 仍保留原本的 HTTP 狀態碼與中文 error 欄位（向後相容），另外回傳 code；
// 前端依 code 對照 messages/*.json（inquiry.errors.*）顯示買家語系的訊息。

export const INQUIRY_ERROR_CODES = [
  'invalid_input',
  'rate_limited',
  'captcha_failed',
  'service_unavailable',
  'save_failed',
  'server_error'
] as const;

export type InquiryErrorCode = (typeof INQUIRY_ERROR_CODES)[number];

export function isInquiryErrorCode(value: unknown): value is InquiryErrorCode {
  return typeof value === 'string' && (INQUIRY_ERROR_CODES as readonly string[]).includes(value);
}

// 不認得的代碼（或沒有代碼）一律退回通用錯誤
export function inquiryErrorMessageKey(code: unknown): InquiryErrorCode {
  return isInquiryErrorCode(code) ? code : 'server_error';
}
