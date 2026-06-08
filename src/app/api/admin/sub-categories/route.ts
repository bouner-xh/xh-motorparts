import { z } from 'zod';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

const subCategoryPayloadSchema = z.object({
  id: z.string().optional(),
  category: z.string().min(1),
  slug: z.string().min(1),
  nameZhTw: z.string().min(1),
  nameZhCn: z.string().min(1),
  nameEn: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

async function getAuthenticatedUser() {
  const supabase = await getSupabaseServerAuthClient();
  if (!supabase) return { ok: false, error: 'Supabase auth config is missing' } as const;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Unauthorized' } as const;

  return { ok: true, user } as const;
}

export async function GET(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: 401 });

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
  if (error) return Response.json({ error: error.message }, { status: 500 });

  interface SubCategoryQueryRow {
    id: string;
    slug: string;
    name_i18n: Record<string, string> | null;
    sort_order: number | null;
    category: { slug?: string } | { slug?: string }[] | null;
  }

  const items = (data as SubCategoryQueryRow[] || []).map((item) => {
    const cat = Array.isArray(item.category) ? item.category[0]?.slug : item.category?.slug;
    return {
      id: item.id,
      category: cat || 'cylinder',
      slug: item.slug,
      nameZhTw: item.name_i18n?.['zh-TW'] || '',
      nameZhCn: item.name_i18n?.['zh-CN'] || '',
      nameEn: item.name_i18n?.en || '',
      sortOrder: item.sort_order ?? 0
    };
  });

  return Response.json({ items });
}

export async function POST(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const parsed = subCategoryPayloadSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: 'Invalid payload' }, { status: 400 });
  const payload = parsed.data;

  // Get category_id
  const { data: catData } = await service.from('categories').select('id').eq('slug', payload.category).single();
  if (!catData?.id) return Response.json({ error: 'Category not found' }, { status: 400 });

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

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: inserted.id });
}

export async function PUT(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const body = await request.json();

  if (Array.isArray(body)) {
    const sortItemsSchema = z.array(z.object({
      id: z.string(),
      sortOrder: z.number().int()
    }));
    const parsed = sortItemsSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: 'Invalid sort payload' }, { status: 400 });

    const updates = parsed.data.map(item =>
      service.from('sub_categories').update({ sort_order: item.sortOrder }).eq('id', item.id)
    );
    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error);
    if (firstError) return Response.json({ error: firstError.error?.message || 'Update failed' }, { status: 500 });

    return Response.json({ ok: true });
  }

  const parsed = subCategoryPayloadSchema.safeParse(body);
  if (!parsed.success || !parsed.data.id) return Response.json({ error: 'Invalid payload' }, { status: 400 });
  const payload = parsed.data;

  const { data: catData } = await service.from('categories').select('id').eq('slug', payload.category).single();
  if (!catData?.id) return Response.json({ error: 'Category not found' }, { status: 400 });

  const { error } = await service
    .from('sub_categories')
    .update({
      category_id: catData.id,
      slug: payload.slug,
      name_i18n: { 'zh-TW': payload.nameZhTw, 'zh-CN': payload.nameZhCn, en: payload.nameEn },
      sort_order: payload.sortOrder
    })
    .eq('id', payload.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing ID' }, { status: 400 });

  const { error } = await service.from('sub_categories').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
