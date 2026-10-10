// 取得產品「改前／改後」的好讀快照，供操作紀錄比對（U10）
// 任何一步失敗都只略過該欄位，不丟出錯誤
import type {ServiceClient} from '@/lib/admin-session';
import {auditValue, type AuditSnapshot} from '@/lib/audit-log';

async function lookup(load: () => PromiseLike<{data: unknown; error: unknown}>) {
  try {
    const {data, error} = await load();
    return error ? null : data;
  } catch {
    return null;
  }
}

export async function snapshotProduct(service: ServiceClient, id: string): Promise<AuditSnapshot | null> {
  const row = (await lookup(() => service.from('products').select('*').eq('id', id).maybeSingle())) as Record<string, unknown> | null;
  if (!row) return null;

  const names = (row.name_i18n || {}) as Record<string, string>;
  const category = (await lookup(() => service.from('categories').select('slug').eq('id', String(row.category_id)).maybeSingle())) as {slug?: string} | null;
  const sub = row.sub_category_id
    ? ((await lookup(() => service.from('sub_categories').select('slug').eq('id', String(row.sub_category_id)).maybeSingle())) as {slug?: string} | null)
    : null;
  const images = (await lookup(() => service.from('product_images').select('storage_path').eq('product_id', id).order('sort_order', {ascending: true}))) as {storage_path: string}[] | null;
  const links = (await lookup(() => service.from('product_vehicle_models').select('vehicle_model_id').eq('product_id', id))) as {vehicle_model_id: string}[] | null;
  let vehicleNames: string[] = [];
  if (links?.length) {
    const models = (await lookup(() => service.from('vehicle_models').select('name').in('id', links.map((l) => l.vehicle_model_id)))) as {name: string}[] | null;
    vehicleNames = (models || []).map((m) => m.name).sort();
  }

  return {
    型號: auditValue(row.model_number),
    '名稱（繁中）': auditValue(names['zh-TW']),
    '名稱（簡中）': auditValue(names['zh-CN']),
    '名稱（英文）': auditValue(names.en),
    規格: auditValue(row.specifications),
    庫存: auditValue(row.stock_quantity),
    上架: auditValue(row.is_active),
    大分類: auditValue(category?.slug),
    子分類: auditValue(sub?.slug),
    '適用車型': vehicleNames.join(', '),
    'OEM／對照料號': auditValue(row.oem_numbers),
    圖片: (images || []).map((i) => i.storage_path.split('/').pop() || i.storage_path).join(', ')
  };
}

export async function snapshotCategory(service: ServiceClient, id: string): Promise<AuditSnapshot | null> {
  const row = (await lookup(() => service.from('categories').select('*').eq('id', id).maybeSingle())) as Record<string, unknown> | null;
  if (!row) return null;
  const names = (row.name_i18n || {}) as Record<string, string>;
  const descriptions = (row.description_i18n || {}) as Record<string, string>;
  return {
    代號: auditValue(row.slug),
    '名稱（繁中）': auditValue(names['zh-TW']),
    '名稱（簡中）': auditValue(names['zh-CN']),
    '名稱（英文）': auditValue(names.en),
    '說明（繁中）': auditValue(descriptions['zh-TW']),
    '說明（簡中）': auditValue(descriptions['zh-CN']),
    '說明（英文）': auditValue(descriptions.en),
    排序: auditValue(row.sort_order),
    封面: auditValue(row.cover_image).split('/').pop() || ''
  };
}

export async function snapshotSubCategory(service: ServiceClient, id: string): Promise<AuditSnapshot | null> {
  const row = (await lookup(() => service.from('sub_categories').select('*').eq('id', id).maybeSingle())) as Record<string, unknown> | null;
  if (!row) return null;
  const names = (row.name_i18n || {}) as Record<string, string>;
  const parent = (await lookup(() => service.from('categories').select('slug').eq('id', String(row.category_id)).maybeSingle())) as {slug?: string} | null;
  return {
    大分類: auditValue(parent?.slug),
    代號: auditValue(row.slug),
    '名稱（繁中）': auditValue(names['zh-TW']),
    '名稱（簡中）': auditValue(names['zh-CN']),
    '名稱（英文）': auditValue(names.en),
    排序: auditValue(row.sort_order)
  };
}

export async function snapshotVehicleModel(service: ServiceClient, id: string): Promise<AuditSnapshot | null> {
  const row = (await lookup(() => service.from('vehicle_models').select('name').eq('id', id).maybeSingle())) as {name?: string} | null;
  return row ? {名稱: auditValue(row.name)} : null;
}

/** 調整排序的摘要：「代號 → 排序」 */
export async function describeSortOrder(service: ServiceClient, table: 'categories' | 'sub_categories', items: {id: string; sortOrder: number}[]): Promise<Record<string, [string | null, string | null]>> {
  const rows = (await lookup(() => service.from(table).select('id,slug').in('id', items.map((i) => i.id)))) as {id: string; slug: string}[] | null;
  const slugById = new Map((rows || []).map((r) => [r.id, r.slug]));
  return {
    新排序: [null, items.map((i) => `${slugById.get(i.id) || i.id}=${i.sortOrder}`).join(', ')]
  };
}
