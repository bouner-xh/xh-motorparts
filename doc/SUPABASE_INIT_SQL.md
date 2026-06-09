# Supabase 初始化 SQL（Admin + Catalog）

說明：將以下 SQL 貼到 Supabase SQL Editor 一次執行，可建立目前後台 CRUD 與前台讀取需要的資料表、索引與政策。

```sql
-- Required extensions
create extension if not exists pgcrypto;

-- =========================================================
-- 1) Core tables
-- =========================================================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_i18n jsonb not null default '{}'::jsonb,
  description_i18n jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  model_number text not null,
  name_i18n jsonb not null default '{}'::jsonb,
  specifications text[] not null default '{}',
  stock_quantity int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_products_model unique (model_number)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 2) Indexes
-- =========================================================

create index if not exists idx_categories_sort on public.categories(sort_order);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active on public.products(is_active) where is_active = true;
create index if not exists idx_products_model on public.products(model_number);
create index if not exists idx_product_images_product_sort on public.product_images(product_id, sort_order);

-- =========================================================
-- 3) Updated-at trigger
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists trg_product_images_updated_at on public.product_images;
create trigger trg_product_images_updated_at
before update on public.product_images
for each row
execute function public.set_updated_at();

-- =========================================================
-- 4) Seed categories (upsert)
-- =========================================================

insert into public.categories (slug, sort_order, name_i18n, description_i18n)
values
  ('cylinder', 10, '{"zh-TW":"汽缸系列","zh-CN":"汽缸系列","en":"Cylinder Series"}'::jsonb, '{"zh-TW":"高品質汽缸套件，適用於各種摩托車型號","zh-CN":"高品质汽缸套件，适用于各种摩托车型号","en":"High-quality cylinder kits for various motorcycle models"}'::jsonb),
  ('chain', 20, '{"zh-TW":"鏈條系列","zh-CN":"链条系列","en":"Chain Series"}'::jsonb, '{"zh-TW":"專業傳動鏈條，確保最佳傳動效率","zh-CN":"专业传动链条，确保最佳传动效率","en":"Professional transmission chains ensuring optimal power delivery"}'::jsonb),
  ('clutch', 30, '{"zh-TW":"離合器系列","zh-CN":"离合器系列","en":"Clutch Series"}'::jsonb, '{"zh-TW":"耐用離合器組件，提供順暢的換檔體驗","zh-CN":"耐用离合器组件，提供顺畅的换档体验","en":"Durable clutch components for smooth shifting experience"}'::jsonb),
  ('piston', 40, '{"zh-TW":"活塞系列","zh-CN":"活塞系列","en":"Piston Series"}'::jsonb, '{"zh-TW":"精密活塞套件，確保引擎最佳性能","zh-CN":"精密活塞套件，确保引擎最佳性能","en":"Precision piston kits for optimal engine performance"}'::jsonb),
  ('valve', 50, '{"zh-TW":"汽門系列","zh-CN":"气门系列","en":"Valve Series"}'::jsonb, '{"zh-TW":"高精度汽門組件，確保引擎氣密性","zh-CN":"高精度气门组件，确保引擎气密性","en":"High-precision valve components ensuring engine sealing"}'::jsonb),
  ('sprocket', 60, '{"zh-TW":"齒輪系列","zh-CN":"齿轮系列","en":"Sprocket Series"}'::jsonb, '{"zh-TW":"耐磨齒輪，提供穩定的傳動效果","zh-CN":"耐磨齿轮，提供稳定的传动效果","en":"Wear-resistant sprockets for stable transmission"}'::jsonb),
  ('brake', 70, '{"zh-TW":"煞車片系列","zh-CN":"刹车片系列","en":"Brake Pad Series"}'::jsonb, '{"zh-TW":"高性能煞車片，確保行車安全","zh-CN":"高性能刹车片，确保行车安全","en":"High-performance brake pads for safe riding"}'::jsonb),
  ('oil-seal', 80, '{"zh-TW":"油封系列","zh-CN":"油封系列","en":"Oil Seal Series"}'::jsonb, '{"zh-TW":"優質油封，防止油料洩漏","zh-CN":"优质油封，防止油料泄漏","en":"Premium oil seals preventing oil leakage"}'::jsonb),
  ('cable', 90, '{"zh-TW":"線材系列","zh-CN":"线材系列","en":"Cable Series"}'::jsonb, '{"zh-TW":"耐用線材，確保操控靈敏度","zh-CN":"耐用线材，确保操控灵敏度","en":"Durable cables ensuring responsive control"}'::jsonb)
on conflict (slug) do update set
  sort_order = excluded.sort_order,
  name_i18n = excluded.name_i18n,
  description_i18n = excluded.description_i18n,
  updated_at = now();

-- =========================================================
-- 5) RLS policies
-- =========================================================

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

-- public read categories

drop policy if exists "public_read_categories" on public.categories;
create policy "public_read_categories"
on public.categories
for select
using (true);

-- public read only active products

drop policy if exists "public_read_active_products" on public.products;
create policy "public_read_active_products"
on public.products
for select
using (is_active = true);

-- public read product images

drop policy if exists "public_read_product_images" on public.product_images;
create policy "public_read_product_images"
on public.product_images
for select
using (true);

-- =========================================================
-- 6) Storage bucket (for image upload API)
-- =========================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

-- =========================================================
-- 7) B2B RFQ & CRM tables
-- =========================================================

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  company_name text,
  country text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiry_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  company_name text,
  country text,
  phone text,
  message text,
  items jsonb not null default '[]'::jsonb, -- Array of: { productId, modelNumber, nameZhTw, nameZhCn, nameEn, quantity }
  status text not null default 'pending', -- 'pending', 'processing', 'replied', 'archived'
  reply_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_email on public.customers(email);
create index if not exists idx_inquiries_customer on public.inquiry_requests(customer_id);
create index if not exists idx_inquiries_status on public.inquiry_requests(status);
create index if not exists idx_inquiries_created on public.inquiry_requests(created_at desc);

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

drop trigger if exists trg_inquiry_requests_updated_at on public.inquiry_requests;
create trigger trg_inquiry_requests_updated_at
before update on public.inquiry_requests
for each row
execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.inquiry_requests enable row level security;

-- Drop existing policies if any
drop policy if exists "public_insert_customers" on public.customers;
create policy "public_insert_customers"
on public.customers
for insert
with check (true);

drop policy if exists "public_insert_inquiry_requests" on public.inquiry_requests;
create policy "public_insert_inquiry_requests"
on public.inquiry_requests
for insert
with check (true);
```

## 檢查是否建置成功

```sql
select slug, sort_order from public.categories order by sort_order;
select count(*) from public.products;
select count(*) from public.product_images;
select count(*) from public.customers;
select count(*) from public.inquiry_requests;
select id, name, public from storage.buckets where id = 'product-images';
```
