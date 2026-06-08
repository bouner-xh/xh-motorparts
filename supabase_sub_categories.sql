-- 1. Create sub_categories table
create table if not exists public.sub_categories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  slug text not null unique,
  name_i18n jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sub_categories_category on public.sub_categories(category_id);
create index if not exists idx_sub_categories_sort on public.sub_categories(sort_order);

-- 2. Add trigger for updated_at
drop trigger if exists trg_sub_categories_updated_at on public.sub_categories;
create trigger trg_sub_categories_updated_at
before update on public.sub_categories
for each row
execute function public.set_updated_at();

-- 3. RLS Policy for sub_categories (public read)
alter table public.sub_categories enable row level security;

drop policy if exists "public_read_sub_categories" on public.sub_categories;
create policy "public_read_sub_categories"
on public.sub_categories
for select
using (true);

-- 4. Clear existing products (as requested)
truncate table public.products cascade;

-- 5. Add sub_category_id to products
alter table public.products add column sub_category_id uuid not null references public.sub_categories(id) on delete restrict;
create index if not exists idx_products_sub_category on public.products(sub_category_id);

-- 6. Grant privileges to service role just in case
grant all privileges on table public.sub_categories to service_role;
