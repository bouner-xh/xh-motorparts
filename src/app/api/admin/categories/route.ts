import { z } from 'zod';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin-auth';
import { revalidateCatalog } from '@/lib/revalidate';
import { dbErrorResponse, invalidInputResponse, isUuid, INVALID_ID_MESSAGE } from '@/lib/admin-api-errors';

// 欄位長度上限（A9）
const categoryPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(1).max(64),
  nameZhTw: z.string().trim().min(1).max(200),
  nameZhCn: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  descriptionZhTw: z.string().max(2000).optional().default(''),
  descriptionZhCn: z.string().max(2000).optional().default(''),
  descriptionEn: z.string().max(2000).optional().default(''),
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

export async function GET() {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: authResult.error === 'Forbidden' ? 403 : 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const { data, error } = await service
    .from('categories')
    .select('id, slug, name_i18n, description_i18n, sort_order')
    .order('sort_order', { ascending: true });

  if (error) return dbErrorResponse('categories GET', error);

  interface CategoryQueryRow {
    id: string;
    slug: string;
    name_i18n: Record<string, string> | null;
    description_i18n: Record<string, string> | null;
    sort_order: number | null;
  }

  const [subCategoryCounts, productCounts] = await Promise.all([
    countBy(service, 'sub_categories', 'category_id'),
    countBy(service, 'products', 'category_id')
  ]);

  const items = (data as CategoryQueryRow[] || []).map((item) => ({
    id: item.id,
    slug: item.slug,
    nameZhTw: item.name_i18n?.['zh-TW'] || '',
    nameZhCn: item.name_i18n?.['zh-CN'] || '',
    nameEn: item.name_i18n?.en || '',
    descriptionZhTw: item.description_i18n?.['zh-TW'] || '',
    descriptionZhCn: item.description_i18n?.['zh-CN'] || '',
    descriptionEn: item.description_i18n?.en || '',
    sortOrder: item.sort_order ?? 0,
    subCategoryCount: subCategoryCounts.get(item.id) || 0,
    productCount: productCounts.get(item.id) || 0
  }));

  return Response.json({ items });
}

export async function POST(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: authResult.error === 'Forbidden' ? 403 : 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const parsed = categoryPayloadSchema.safeParse(await request.json());
  if (!parsed.success) return invalidInputResponse();
  const payload = parsed.data;

  const { data: inserted, error } = await service
    .from('categories')
    .insert({
      slug: payload.slug,
      name_i18n: { 'zh-TW': payload.nameZhTw, 'zh-CN': payload.nameZhCn, en: payload.nameEn },
      description_i18n: { 'zh-TW': payload.descriptionZhTw, 'zh-CN': payload.descriptionZhCn, en: payload.descriptionEn },
      sort_order: payload.sortOrder
    })
    .select('id')
    .single();

  if (error) return dbErrorResponse('categories POST', error);
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
      service.from('categories').update({ sort_order: item.sortOrder }).eq('id', item.id)
    );
    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error);
    if (firstError) return dbErrorResponse('categories sort', firstError.error);

    revalidateCatalog();
    return Response.json({ ok: true });
  }

  const parsed = categoryPayloadSchema.safeParse(body);
  if (!parsed.success || !parsed.data.id) return invalidInputResponse();
  const payload = parsed.data;

  const { error } = await service
    .from('categories')
    .update({
      slug: payload.slug,
      name_i18n: { 'zh-TW': payload.nameZhTw, 'zh-CN': payload.nameZhCn, en: payload.nameEn },
      description_i18n: { 'zh-TW': payload.descriptionZhTw, 'zh-CN': payload.descriptionZhCn, en: payload.descriptionEn },
      sort_order: payload.sortOrder
    })
    .eq('id', payload.id);

  if (error) return dbErrorResponse('categories PUT', error);
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

  // 底下還有產品時不能刪除（資料庫設定為 restrict）；子分類會一併刪除（cascade）（A5）
  const { data: products } = await service.from('products').select('id').eq('category_id', id);
  if (products?.length) {
    return Response.json(
      { error: `這個大分類底下還有 ${products.length} 個產品，請先把產品移到其他分類或刪除後再試。` },
      { status: 409 }
    );
  }

  const { error } = await service.from('categories').delete().eq('id', id);
  if (error) return dbErrorResponse('categories DELETE', error);

  revalidateCatalog();
  return Response.json({ ok: true });
}
