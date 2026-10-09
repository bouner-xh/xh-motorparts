// 大分類封面圖欄位（categories.cover_image）：資料庫還沒執行更新語法時，程式要能照常運作

export const COVER_COLUMN_MISSING_MESSAGE =
  '資料庫還沒有「分類封面」欄位。請先在 Supabase 的 SQL Editor 執行 supabase/migrations/20261009_category_cover.sql，再重新儲存。';

// 判斷是不是「缺少 cover_image 欄位」的資料庫錯誤（PostgREST 可能回 42703 或 PGRST204）
export function isMissingCoverColumn(error: {code?: string; message?: string} | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  return /cover_image/.test(error.message || '') && /(does not exist|schema cache|column)/i.test(error.message || '');
}
