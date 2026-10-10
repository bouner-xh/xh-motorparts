import { z } from 'zod';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin-auth';
import { diffFields, safeSnapshot, writeAuditLog } from '@/lib/audit-log';
import { snapshotVehicleModel } from '@/lib/audit-snapshots';
import { revalidateCatalog } from '@/lib/revalidate';
import { dbErrorResponse, invalidInputResponse, isUuid, INVALID_ID_MESSAGE } from '@/lib/admin-api-errors';
import { escapeLikePattern } from '@/lib/product-form';
import { isMissingVehicleSchema, normalizeVehicleName, VEHICLE_NAME_MAX, VEHICLE_SETUP_MESSAGE } from '@/lib/vehicle-models';

// 車型清單（P8）：後台先建立車型，產品勾選適用的車型
const payloadSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().max(200).transform(normalizeVehicleName).pipe(z.string().min(1).max(VEHICLE_NAME_MAX))
});

type ServiceClient = NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>;

async function getAuthenticatedUser() {
  const supabase = await getSupabaseServerAuthClient();
  if (!supabase) return { ok: false, error: 'Supabase auth config is missing' } as const;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Unauthorized' } as const;
  if (!isAdminEmail(user.email)) return { ok: false, error: 'Forbidden' } as const;

  return { ok: true, user } as const;
}

function authFailure(error: string) {
  return Response.json({ error }, { status: error === 'Forbidden' ? 403 : error === 'Unauthorized' ? 401 : 500 });
}

// 名稱不分大小寫比對是否已存在（資料庫也有不分大小寫的唯一限制）
async function nameTaken(service: ServiceClient, name: string, excludeId?: string) {
  let query = service.from('vehicle_models').select('id').ilike('name', escapeLikePattern(name)).limit(1);
  if (excludeId) query = query.neq('id', excludeId);
  const { data } = await query;
  return Boolean(data?.length);
}

const SETUP_RESPONSE = () => Response.json({ error: VEHICLE_SETUP_MESSAGE }, { status: 409 });

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth.ok) return authFailure(auth.error);
  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const { data, error } = await service.from('vehicle_models').select('id, name, sort_order').order('name', { ascending: true });
  // 資料表還沒建立：回傳空清單與「尚未啟用」，後台顯示說明
  if (error && isMissingVehicleSchema(error)) return Response.json({ items: [], enabled: false });
  if (error) return dbErrorResponse('vehicle-models GET', error);

  const { data: links } = await service.from('product_vehicle_models').select('vehicle_model_id');
  const counts = new Map<string, number>();
  ((links as Array<{ vehicle_model_id: string }> | null) || []).forEach((row) => counts.set(row.vehicle_model_id, (counts.get(row.vehicle_model_id) || 0) + 1));

  const items = ((data as Array<{ id: string; name: string; sort_order: number | null }> | null) || [])
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
    .map((row) => ({ id: row.id, name: row.name, productCount: counts.get(row.id) || 0 }));
  return Response.json({ items, enabled: true });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth.ok) return authFailure(auth.error);
  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) return invalidInputResponse(`請輸入車型名稱（最多 ${VEHICLE_NAME_MAX} 字）`);
  const { name } = parsed.data;

  const probe = await service.from('vehicle_models').select('id').limit(1);
  if (probe.error && isMissingVehicleSchema(probe.error)) return SETUP_RESPONSE();
  if (await nameTaken(service, name)) return Response.json({ error: `車型「${name}」已經在清單裡` }, { status: 409 });

  const { data, error } = await service.from('vehicle_models').insert({ name }).select('id').single();
  if (error) return dbErrorResponse('vehicle-models POST', error);
  await writeAuditLog(service, { actorEmail: auth.user.email || '', action: 'create', entityType: 'vehicle_model', entityId: data.id, entityLabel: name, changes: { 名稱: [null, name] } });
  revalidateCatalog();
  return Response.json({ ok: true, id: data.id });
}

export async function PUT(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth.ok) return authFailure(auth.error);
  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success || !parsed.data.id) return invalidInputResponse(`請輸入車型名稱（最多 ${VEHICLE_NAME_MAX} 字）`);
  const { id, name } = parsed.data;

  if (await nameTaken(service, name, id)) return Response.json({ error: `車型「${name}」已經在清單裡` }, { status: 409 });
  const beforeSnapshot = await safeSnapshot(() => snapshotVehicleModel(service, id));
  const { data, error } = await service.from('vehicle_models').update({ name }).eq('id', id).select('id');
  if (error) return dbErrorResponse('vehicle-models PUT', error);
  if (!data?.length) return Response.json({ error: '找不到這個車型，可能已被刪除，請重新載入' }, { status: 404 });
  const changes = diffFields(beforeSnapshot || null, { 名稱: name });
  if (beforeSnapshot && Object.keys(changes).length) {
    await writeAuditLog(service, { actorEmail: auth.user.email || '', action: 'update', entityType: 'vehicle_model', entityId: id, entityLabel: name, changes });
  }
  revalidateCatalog();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth.ok) return authFailure(auth.error);
  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const id = new URL(request.url).searchParams.get('id');
  if (!isUuid(id)) return invalidInputResponse(INVALID_ID_MESSAGE);

  // 產品與車型的對應會一併刪除（產品本身不受影響）
  const deletedSnapshot = await safeSnapshot(() => snapshotVehicleModel(service, id));
  const { error } = await service.from('vehicle_models').delete().eq('id', id);
  if (error) return dbErrorResponse('vehicle-models DELETE', error);
  await writeAuditLog(service, { actorEmail: auth.user.email || '', action: 'delete', entityType: 'vehicle_model', entityId: id, entityLabel: deletedSnapshot?.名稱 || '（未知）', changes: diffFields(deletedSnapshot || null, null) });
  revalidateCatalog();
  return Response.json({ ok: true });
}
