-- 大分類封面圖：後台可上傳，儲存圖片網址
-- 在 Supabase 的 SQL Editor 執行一次即可（可重複執行，不會出錯）。
-- 沒有執行時網站照常運作（封面改用該分類第一個產品的照片）；後台儲存封面時會提示先執行本檔。
alter table public.categories add column if not exists cover_image text;
