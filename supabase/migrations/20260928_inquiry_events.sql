-- 詢價處理紀錄（A6 ③④）
-- 記錄誰、在什麼時候、對哪張詢價單做了什麼（改狀態、改備忘、寄出回覆、刪除）
-- 執行方式：Supabase → SQL Editor → 貼上整段 → Run（只新增資料表，不會改動或刪除現有資料）
-- 還原方式：drop table if exists public.inquiry_events;

create table if not exists public.inquiry_events (
  id uuid primary key default gen_random_uuid(),
  -- 詢價單刪除後保留紀錄（改為 null），才查得到是誰刪的
  inquiry_id uuid references public.inquiry_requests(id) on delete set null,
  -- 公司名稱與 Email 的快照，詢價單刪除後仍看得出是哪一張
  inquiry_label text not null default '',
  actor_email text not null,
  action text not null check (action in ('status', 'notes', 'reply', 'delete')),
  from_value text,
  to_value text,
  -- 寄出回覆時的主旨、內容、附件檔名等
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_inquiry_events_inquiry on public.inquiry_events(inquiry_id, created_at desc);

-- 只有伺服器（service role）可以讀寫；前台訪客與一般登入者都無法存取
alter table public.inquiry_events enable row level security;
revoke all on table public.inquiry_events from anon, authenticated;
