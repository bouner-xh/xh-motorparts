-- 後台操作紀錄（U10）：哪個管理員帳號、何時、對產品或分類做了什麼（含改前改後）
-- 執行方式：Supabase → SQL Editor → 貼上整段 → Run（只新增資料表，不會改動或刪除現有資料；可重複執行）
-- 沒有執行時網站與後台照常運作，只是「操作紀錄」分頁會顯示尚未啟用。
-- 還原方式：drop table if exists public.admin_audit_log;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- 做這個操作的管理員帳號（由伺服器從登入狀態取得）
  actor_email text not null,
  -- create／update／delete／import／sort 等
  action text not null,
  -- product／category／sub_category／vehicle_model
  entity_type text not null,
  entity_id uuid,
  -- 對象名稱的快照（例如型號、分類代號），對象被刪除後仍看得出是哪一筆
  entity_label text not null default '',
  -- 改前改後：{"欄位": ["改前", "改後"]}；匯入等操作放摘要
  changes jsonb not null default '{}'::jsonb
);

create index if not exists idx_admin_audit_log_created on public.admin_audit_log(created_at desc);
create index if not exists idx_admin_audit_log_actor on public.admin_audit_log(actor_email, created_at desc);

-- 只有伺服器（service role）可以讀寫；前台訪客與一般登入者都無法存取
alter table public.admin_audit_log enable row level security;
revoke all on table public.admin_audit_log from anon, authenticated;
