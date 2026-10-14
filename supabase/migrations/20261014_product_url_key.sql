-- 產品型號可重複（網址代號）
-- 目的：同一個型號（例如 DIO50）可以有多個產品，每個產品用自己的「網址代號」區分網址；OEM／對照料號由程式檢查全站唯一。
-- 執行方式：Supabase → SQL Editor → 貼上整段 → Run（可重複執行；既有產品的型號、網址完全不變）
-- 沒有執行時網站與後台照常運作（型號仍不可重複），後台會提示先執行本檔。
-- 還原方式（只有在沒有任何重複型號時才能還原）：
--   drop index if exists public.products_category_url_key_lower_key;
--   alter table public.products add constraint uq_products_model unique (model_number);
--   alter table public.products drop column if exists url_key;

-- 1. 新增網址代號欄位，既有產品先填入原本的型號（網址不變）
alter table public.products add column if not exists url_key text;
update public.products set url_key = model_number where url_key is null;
alter table public.products alter column url_key set not null;

-- 2. 同一個大分類內，網址代號不分大小寫不可重複
create unique index if not exists products_category_url_key_lower_key on public.products (category_id, lower(url_key));

-- 3. 移除「型號不可重複」的限制（不管這個限制叫什麼名字，只要它單獨限制 model_number 就移除）
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'products'
      and con.contype = 'u'
      and array(
        select att.attname
        from pg_attribute att
        where att.attrelid = con.conrelid and att.attnum = any(con.conkey)
      ) = array['model_number']::name[]
  loop
    execute format('alter table public.products drop constraint %I', c.conname);
  end loop;
end $$;
