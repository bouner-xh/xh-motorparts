import { z } from 'zod';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin-auth';
import { normalizeSlug } from '@/lib/slug';
import { revalidateCatalog } from '@/lib/revalidate';
import { dbErrorResponse, invalidInputResponse, isUuid, INVALID_ID_MESSAGE } from '@/lib/admin-api-errors';
import { COVER_COLUMN_MISSING_MESSAGE, isMissingCoverColumn } from '@/lib/category-cover';
import { removeUnreferencedImages } from '@/lib/product-image-cleanup';

// 欄位長度上限（A9）
const categoryPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().max(200).transform(normalizeSlug).pipe(z.string().min(1).max(64)),
  nameZhTw: z.string().trim().min(1).max(200),
  nameZhCn: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  descriptionZhTw: z.string().max(2000).optional().default(''),
  descriptionZhCn: z.string().max(2000).optional().default(''),
  descriptionEn: z.string().max(2000).optional().default(''),
  sortOrder: z.number().int().default(0),
  // 封面圖片網址；留空 = 沒有自己的封面（前台改用該分類第一個產品的照片）
  coverImage: z.string().trim().max(1000).optional().default(''),
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

  // 資料庫還沒有封面欄位時，改用不含封面的查詢
  let withCover = await service
    .from('categories')
    .select('id, slug, name_i18n, description_i18n, sort_order, cover_image')
    .order('sort_order', { ascending: true });
  if (withCover.error && isMissingCoverColumn(withCover.error)) {
    withCover = await service
      .from('categories')
      .select('id, slug, name_i18n, description_i18n, sort_order')
      .order('sort_order', { ascending: true }) as typeof withCover;
  }
  const { data, error } = withCover;

  if (error) return dbErrorResponse('categories GET', error);

  interface CategoryQueryRow {
    id: string;
    slug: string;
    name_i18n: Record<string, string> | null;
    description_i18n: Record<string, string> | null;
    sort_order: number | null;
    cover_image?: string | null;
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
    coverImage: item.cover_image || '',
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

  const baseRow: Record<string, unknown> = {
    slug: payload.slug,
    name_i18n: { 'zh-TW': payload.nameZhTw, 'zh-CN': payload.nameZhCn, en: payload.nameEn },
    description_i18n: { 'zh-TW': payload.descriptionZhTw, 'zh-CN': payload.descriptionZhCn, en: payload.descriptionEn },
    sort_order: payload.sortOrder
  };
  // 有封面才寫入封面欄位；資料庫還沒有該欄位時，沒有封面的新增照常成功，有封面則提示先執行更新語法
  const insertResult = await service
    .from('categories')
    .insert(payload.coverImage ? { ...baseRow, cover_image: payload.coverImage } : baseRow)
    .select('id')
    .single();
  if (insertResult.error && isMissingCoverColumn(insertResult.error)) {
    return Response.json({ error: COVER_COLUMN_MISSING_MESSAGE }, { status: 409 });
  }
  const { data: inserted, error } = insertResult;

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

  const updateRow: Record<string, unknown> = {
    slug: payload.slug,
    name_i18n: { 'zh-TW': payload.nameZhTw, 'zh-CN': payload.nameZhCn, en: payload.nameEn },
    description_i18n: { 'zh-TW': payload.descriptionZhTw, 'zh-CN': payload.descriptionZhCn, en: payload.descriptionEn },
    sort_order: payload.sortOrder
  };
  // 先記下目前的封面，換掉或移除後清掉沒人使用的舊圖檔
  const { data: current, error: currentError } = await service.from('categories').select('cover_image').eq('id', payload.id).maybeSingle();
  const hasCoverColumn = !currentError;
  const oldCover = ((current as { cover_image?: string | null } | null)?.cover_image) || '';

  // 資料庫有封面欄位才一起寫入（留空 = 移除封面）；沒有欄位時：沒填封面照常儲存，填了就提示先執行更新語法
  if (!hasCoverColumn && payload.coverImage) {
    return Response.json({ error: COVER_COLUMN_MISSING_MESSAGE }, { status: 409 });
  }
  const { error } = await service
    .from('categories')
    .update(hasCoverColumn ? { ...updateRow, cover_image: payload.coverImage || null } : updateRow)
    .eq('id', payload.id);

  if (error) return dbErrorResponse('categories PUT', error);
  if (oldCover && oldCover !== payload.coverImage) await removeUnreferencedImages(service, [oldCover]);
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

  const { data: current } = await service.from('categories').select('cover_image').eq('id', id).maybeSingle();
  const oldCover = ((current as { cover_image?: string | null } | null)?.cover_image) || '';

  const { error } = await service.from('categories').delete().eq('id', id);
  if (error) return dbErrorResponse('categories DELETE', error);
  if (oldCover) await removeUnreferencedImages(service, [oldCover]);

  revalidateCatalog();
  return Response.json({ ok: true });
}
