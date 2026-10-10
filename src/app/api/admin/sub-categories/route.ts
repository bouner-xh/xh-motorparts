import { z } from 'zod';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin-auth';
import { normalizeSlug } from '@/lib/slug';
import { revalidateCatalog } from '@/lib/revalidate';
import { diffFields, safeSnapshot, writeAuditLog } from '@/lib/audit-log';
import { describeSortOrder, snapshotSubCategory } from '@/lib/audit-snapshots';
import { dbErrorResponse, invalidInputResponse, isUuid, INVALID_ID_MESSAGE } from '@/lib/admin-api-errors';

// 欄位長度上限（A9）
const subCategoryPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(64),
  slug: z.string().max(200).transform(normalizeSlug).pipe(z.string().min(1).max(64)),
  nameZhTw: z.string().trim().min(1).max(200),
  nameZhCn: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().default(0),
});

async function getAuthenticatedUser() {
  const supabase = await getSupabaseServerAuthClient();
  if (!supabase) return { ok: false, error: 'Supabase auth config is missing' } as const;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Unauthorized' } as const;
  if (!isAdminEmail(user.email)) return { ok: false, error: 'Forbidden' } as const;

  return { ok: true, user } as const;
}

// 計算每個上層分類底下的資料筆數（A5：刪除前提示）
async function countBy(service: NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>, table: string, column: string) {
  const { data } = await service.from(table).select(column);
  const counts = new Map<string, number>();
  ((data as unknown as Record<string, string>[] | null) || []).forEach((row) => {
    counts.set(row[column], (counts.get(row[column]) || 0) + 1);
  });
  return counts;
}

export async function GET(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: authResult.error === 'Forbidden' ? 403 : 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const categoryFilter = searchParams.get('category');

  let query = service
    .from('sub_categories')
    .select('id, slug, name_i18n, sort_order, category:categories!inner(slug)')
    .order('sort_order', { ascending: true });

  if (categoryFilter) {
    query = query.eq('category.slug', categoryFilter);
  }

  const { data, error } = await query;
  if (error) return dbErrorResponse('sub-categories GET', error);

  interface SubCategoryQueryRow {
    id: string;
    slug: string;
    name_i18n: Record<string, string> | null;
    sort_order: number | null;
    category: { slug?: string } | { slug?: string }[] | null;
  }

  const productCounts = await countBy(service, 'products', 'sub_category_id');

  const items = (data as SubCategoryQueryRow[] || []).map((item) => {
    const cat = Array.isArray(item.category) ? item.category[0]?.slug : item.category?.slug;
    return {
      id: item.id,
      category: cat || 'cylinder',
      slug: item.slug,
      nameZhTw: item.name_i18n?.['zh-TW'] || '',
      nameZhCn: item.name_i18n?.['zh-CN'] || '',
      nameEn: item.name_i18n?.en || '',
      sortOrder: item.sort_order ?? 0,
      productCount: productCounts.get(item.id) || 0
    };
  });

  return Response.json({ items });
}

export async function POST(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: authResult.error === 'Forbidden' ? 403 : 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const parsed = subCategoryPayloadSchema.safeParse(await request.json());
  if (!parsed.success) return invalidInputResponse();
  const payload = parsed.data;

  // Get category_id
  const { data: catData } = await service.from('categories').select('id').eq('slug', payload.category).single();
  if (!catData?.id) return Response.json({ error: '找不到這個大分類，請重新整理頁面後再選一次' }, { status: 400 });

  const { data: inserted, error } = await service
    .from('sub_categories')
    .insert({
      category_id: catData.id,
      slug: payload.slug,
      name_i18n: { 'zh-TW': payload.nameZhTw, 'zh-CN': payload.nameZhCn, en: payload.nameEn },
      sort_order: payload.sortOrder
    })
    .select('id')
    .single();

  if (error) return dbErrorResponse('sub-categories POST', error);
  const created = await safeSnapshot(() => snapshotSubCategory(service, inserted.id));
  await writeAuditLog(service, { actorEmail: authResult.user.email || '', action: 'create', entityType: 'sub_category', entityId: inserted.id, entityLabel: `${payload.category}/${payload.slug}`, changes: diffFields(null, created || null) });
  revalidateCatalog();
  return Response.json({ ok: true, id: inserted.id });
}

export async function PUT(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: authResult.error === 'Forbidden' ? 403 : 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const body = await request.json();

  if (Array.isArray(body)) {
    const sortItemsSchema = z.array(z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int()
    })).max(500);
    const parsed = sortItemsSchema.safeParse(body);
    if (!parsed.success) return invalidInputResponse();

    const updates = parsed.data.map(item =>
      service.from('sub_categories').update({ sort_order: item.sortOrder }).eq('id', item.id)
    );
    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error);
    if (firstError) return dbErrorResponse('sub-categories sort', firstError.error);
    const sortChanges = await safeSnapshot(() => describeSortOrder(service, 'sub_categories', parsed.data));
    await writeAuditLog(service, { actorEmail: authResult.user.email || '', action: 'sort', entityType: 'sub_category', entityLabel: `調整 ${parsed.data.length} 個子分類排序`, changes: sortChanges || {} });

    revalidateCatalog();
    return Response.json({ ok: true });
  }

  const parsed = subCategoryPayloadSchema.safeParse(body);
  if (!parsed.success || !parsed.data.id) return invalidInputResponse();
  const payload = parsed.data;

  const { data: catData } = await service.from('categories').select('id').eq('slug', payload.category).single();
  if (!catData?.id) return Response.json({ error: '找不到這個大分類，請重新整理頁面後再選一次' }, { status: 400 });

  const beforeSnapshot = await safeSnapshot(() => snapshotSubCategory(service, payload.id as string));
  const { error } = await service
    .from('sub_categories')
    .update({
      category_id: catData.id,
      slug: payload.slug,
      name_i18n: { 'zh-TW': payload.nameZhTw, 'zh-CN': payload.nameZhCn, en: payload.nameEn },
      sort_order: payload.sortOrder
    })
    .eq('id', payload.id);

  if (error) return dbErrorResponse('sub-categories PUT', error);
  const afterSnapshot = await safeSnapshot(() => snapshotSubCategory(service, payload.id as string));
  if (beforeSnapshot && afterSnapshot) {
    const changes = diffFields(beforeSnapshot, afterSnapshot);
    if (Object.keys(changes).length) {
      await writeAuditLog(service, { actorEmail: authResult.user.email || '', action: 'update', entityType: 'sub_category', entityId: payload.id, entityLabel: `${afterSnapshot['大分類'] || payload.category}/${afterSnapshot['代號'] || payload.slug}`, changes });
    }
  }
  revalidateCatalog();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: authResult.error === 'Forbidden' ? 403 : 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!isUuid(id)) return invalidInputResponse(INVALID_ID_MESSAGE);

  // 底下還有產品時不能刪除（資料庫設定為 restrict）（A5）
  const { data: products } = await service.from('products').select('id').eq('sub_category_id', id);
  if (products?.length) {
    return Response.json(
      { error: `這個子分類底下還有 ${products.length} 個產品，請先把產品移到其他子分類或刪除後再試。` },
      { status: 409 }
    );
  }

  const deletedSnapshot = await safeSnapshot(() => snapshotSubCategory(service, id));
  const { error } = await service.from('sub_categories').delete().eq('id', id);
  if (error) return dbErrorResponse('sub-categories DELETE', error);
  await writeAuditLog(service, { actorEmail: authResult.user.email || '', action: 'delete', entityType: 'sub_category', entityId: id, entityLabel: deletedSnapshot ? `${deletedSnapshot['大分類']}/${deletedSnapshot['代號']}` : '（未知）', changes: diffFields(deletedSnapshot || null, null) });

  revalidateCatalog();
  return Response.json({ ok: true });
}
