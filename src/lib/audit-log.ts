// 後台操作紀錄（U10）：哪個管理員帳號、何時、對產品或分類做了什麼（含改前改後）
// 資料表 admin_audit_log 由 supabase/migrations/20261010_admin_audit_log.sql 建立；
// 紀錄寫入失敗或資料表還沒建立時，只在伺服器 log 留下訊息，絕不影響原本的操作
import type {ServiceClient} from '@/lib/admin-session';

export type AuditAction = 'create' | 'update' | 'delete' | 'import' | 'sort';
export type AuditEntityType = 'product' | 'category' | 'sub_category' | 'vehicle_model';

export const AUDIT_ACTIONS: AuditAction[] = ['create', 'update', 'delete', 'import', 'sort'];
export const AUDIT_ENTITY_TYPES: AuditEntityType[] = ['product', 'category', 'sub_category', 'vehicle_model'];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: '新增',
  update: '修改',
  delete: '刪除',
  import: '批量匯入',
  sort: '調整排序'
};

export const AUDIT_ENTITY_LABELS: Record<AuditEntityType, string> = {
  product: '產品',
  category: '大分類',
  sub_category: '子分類',
  vehicle_model: '車型'
};

export const AUDIT_SETUP_MESSAGE = '操作紀錄尚未啟用：請先在 Supabase 的 SQL Editor 執行 supabase/migrations/20261010_admin_audit_log.sql，執行後重新整理本頁。';

/** 欄位 → [改前, 改後]；新增時改前為 null，刪除時改後為 null */
export type AuditChanges = Record<string, [string | null, string | null]>;

export interface AuditEntry {
  actorEmail: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  /** 對象名稱的快照（型號、分類代號…），對象被刪除後仍看得出是哪一筆 */
  entityLabel: string;
  changes?: AuditChanges | Record<string, unknown>;
}

export type AuditSnapshot = Record<string, string>;

/** 把任何值轉成好讀的字串；空值回傳空字串 */
export function auditValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(auditValue).filter(Boolean).join(', ');
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
}

/**
 * 比對改前改後，只回傳真的有變的欄位（純函式）。
 * before 為 null：視為新增，列出所有有值的欄位；after 為 null：視為刪除。
 */
export function diffFields(before: AuditSnapshot | null, after: AuditSnapshot | null): AuditChanges {
  const changes: AuditChanges = {};
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const key of keys) {
    const from = before ? (before[key] ?? '') : null;
    const to = after ? (after[key] ?? '') : null;
    if (from === null && !to) continue;
    if (to === null && !from) continue;
    if (from !== null && to !== null && from === to) continue;
    changes[key] = [from, to];
  }
  return changes;
}

// 資料表不存在時 PostgREST／PostgreSQL 的錯誤代碼
const TABLE_MISSING_CODES = new Set(['PGRST205', '42P01']);

export function isAuditTableMissing(error: {code?: string} | null | undefined) {
  return Boolean(error?.code && TABLE_MISSING_CODES.has(error.code));
}

/** 寫入一筆紀錄；永遠不會丟出錯誤，失敗時回傳 false */
export async function writeAuditLog(service: ServiceClient, entry: AuditEntry): Promise<boolean> {
  try {
    const {error} = await service.from('admin_audit_log').insert({
      actor_email: entry.actorEmail,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      entity_label: entry.entityLabel,
      changes: entry.changes || {}
    });
    if (error) {
      console.warn(`[audit-log] ${isAuditTableMissing(error) ? '資料表尚未建立，略過紀錄' : 'insert failed'}`, error.code || '', error.message || '');
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[audit-log] write threw', error instanceof Error ? error.message : error);
    return false;
  }
}

/** 執行取得「改前」快照的函式；失敗時回傳 undefined，不影響主要操作 */
export async function safeSnapshot<T>(load: () => Promise<T>): Promise<T | undefined> {
  try {
    return await load();
  } catch (error) {
    console.warn('[audit-log] snapshot failed', error instanceof Error ? error.message : error);
    return undefined;
  }
}

export interface AuditLogRow {
  id: string;
  created_at: string;
  actor_email: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string | null;
  entity_label: string;
  changes: AuditChanges | Record<string, unknown>;
}

export interface AuditLogFilters {
  days: number;
  actor?: string;
  action?: string;
  entityType?: string;
  limit: number;
}

export async function listAuditLog(service: ServiceClient, filters: AuditLogFilters) {
  const since = new Date(Date.now() - filters.days * 24 * 60 * 60 * 1000).toISOString();
  let query = service.from('admin_audit_log').select('*').gte('created_at', since);
  if (filters.actor) query = query.eq('actor_email', filters.actor);
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.entityType) query = query.eq('entity_type', filters.entityType);
  const {data, error} = await query.order('created_at', {ascending: false}).limit(filters.limit);
  if (error) return {available: !isAuditTableMissing(error), rows: [] as AuditLogRow[], error};
  return {available: true, rows: (data as AuditLogRow[] | null) || [], error: null};
}
