import {requireAdmin} from '@/lib/admin-session';
import {dbErrorResponse, invalidInputResponse} from '@/lib/admin-api-errors';
import {AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, listAuditLog} from '@/lib/audit-log';

// 操作紀錄（U10）：?days=7|30|90|365&actor=信箱&action=…&entityType=…
// available=false 表示資料表尚未建立（需在 Supabase 執行 supabase/migrations/20261010_admin_audit_log.sql）
const DAY_OPTIONS = [7, 30, 90, 365];
const LIMIT = 300;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const params = new URL(request.url).searchParams;
  const days = Number(params.get('days') || 30);
  const action = params.get('action') || '';
  const entityType = params.get('entityType') || '';
  const actor = (params.get('actor') || '').slice(0, 320);
  if (!DAY_OPTIONS.includes(days)) return invalidInputResponse();
  if (action && !(AUDIT_ACTIONS as string[]).includes(action)) return invalidInputResponse();
  if (entityType && !(AUDIT_ENTITY_TYPES as string[]).includes(entityType)) return invalidInputResponse();

  const {available, rows, error} = await listAuditLog(auth.service, {days, actor, action, entityType, limit: LIMIT});
  if (error && available) return dbErrorResponse('audit-log GET', error);

  // 帳號下拉選單：期間內有操作過的帳號（不受帳號篩選影響）
  let actors: string[] = [];
  if (available) {
    const all = await listAuditLog(auth.service, {days, limit: 1000});
    actors = [...new Set(all.rows.map((r) => r.actor_email))].sort();
  }
  return Response.json({available, rows, actors, limit: LIMIT});
}
