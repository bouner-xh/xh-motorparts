// 後台 API 的錯誤回應（A9）
// 資料庫原始錯誤只記錄在伺服器 log，畫面上顯示看得懂的中文說明

export interface DbErrorLike {
  code?: string;
  message?: string;
}

export const INVALID_INPUT_MESSAGE = '輸入的資料格式不正確，請檢查必填欄位與長度';
export const INVALID_ID_MESSAGE = '資料編號格式不正確，請重新整理頁面後再試';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

// PostgreSQL 錯誤代碼 → 說明與 HTTP 狀態
export function describeDbError(error: DbErrorLike | null | undefined): {message: string; status: number} {
  const message = error?.message || '';
  switch (error?.code) {
    case '23505':
      return {message: '資料重複：代號（slug）或型號已經存在，請換一個', status: 409};
    case '23503':
      return {message: '這筆資料仍被其他資料使用，無法刪除或變更', status: 409};
    case '23502':
      return {message: '有必填欄位沒有填寫', status: 400};
    case '22P02':
    case '22001':
      return {message: INVALID_INPUT_MESSAGE, status: 400};
  }
  if (message.includes('permission denied')) {
    return {message: '資料庫權限不足，請聯絡網站管理員確認 Supabase 設定', status: 500};
  }
  if (message.includes('Invalid API key')) {
    return {message: 'Supabase 金鑰設定錯誤，請聯絡網站管理員', status: 500};
  }
  return {message: '資料庫操作失敗，請稍後再試；若持續發生請聯絡網站管理員', status: 500};
}

export function dbErrorResponse(context: string, error: DbErrorLike | null | undefined) {
  console.error(`[admin-api] ${context}`, error?.code || '', error?.message || '');
  const {message, status} = describeDbError(error);
  return Response.json({error: message}, {status});
}

export function invalidInputResponse(message = INVALID_INPUT_MESSAGE) {
  return Response.json({error: message}, {status: 400});
}
