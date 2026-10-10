-- 車型清單與 OEM 對照料號（P8）
-- 後台先建立一份「車型清單」，每個產品勾選適用的車型；另外每個產品可填多個 OEM／對照料號。
-- 執行方式：Supabase → SQL Editor → 貼上整段 → Run（只新增資料表與欄位，不會改動或刪除現有資料；可重複執行）
-- 沒有執行時網站與後台照常運作（產品頁不顯示車型與對照料號），後台儲存車型或對照料號時會提示先執行本檔。
-- 還原方式：
--   drop table if exists public.product_vehicle_models;
--   drop table if exists public.vehicle_models;
--   alter table public.products drop column if exists oem_numbers;

create table if not exists public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 名稱不分大小寫不可重複
create unique index if not exists vehicle_models_name_lower_key on public.vehicle_models (lower(name));

create table if not exists public.product_vehicle_models (
  product_id uuid not null references public.products(id) on delete cascade,
  vehicle_model_id uuid not null references public.vehicle_models(id) on delete cascade,
  primary key (product_id, vehicle_model_id)
);

create index if not exists idx_product_vehicle_models_model on public.product_vehicle_models(vehicle_model_id);

alter table public.products add column if not exists oem_numbers text[] not null default '{}';

-- 前台（匿名）可以讀取；寫入只有伺服器（service role）可以
alter table public.vehicle_models enable row level security;
alter table public.product_vehicle_models enable row level security;

drop policy if exists "Allow public read vehicle_models" on public.vehicle_models;
create policy "Allow public read vehicle_models" on public.vehicle_models for select using (true);

drop policy if exists "Allow public read product_vehicle_models" on public.product_vehicle_models;
create policy "Allow public read product_vehicle_models" on public.product_vehicle_models for select using (true);

revoke insert, update, delete on table public.vehicle_models from anon, authenticated;
revoke insert, update, delete on table public.product_vehicle_models from anon, authenticated;
