import { z } from 'zod';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

const categoryPayloadSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1),
  nameZhTw: z.string().min(1),
  nameZhCn: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionZhTw: z.string().optional().default(''),
  descriptionZhCn: z.string().optional().default(''),
  descriptionEn: z.string().optional().default(''),
  sortOrder: z.number().int().default(0),
});

async function getAuthenticatedUser() {
  const supabase = await getSupabaseServerAuthClient();
  if (!supabase) return { ok: false, error: 'Supabase auth config is missing' } as const;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Unauthorized' } as const;

  return { ok: true, user } as const;
}

export async function GET() {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const { data, error } = await service
    .from('categories')
    .select('id, slug, name_i18n, description_i18n, sort_order')
    .order('sort_order', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  interface CategoryQueryRow {
    id: string;
    slug: string;
    name_i18n: Record<string, string> | null;
    description_i18n: Record<string, string> | null;
    sort_order: number | null;
  }

  const items = (data as CategoryQueryRow[] || []).map((item) => ({
    id: item.id,
    slug: item.slug,
    nameZhTw: item.name_i18n?.['zh-TW'] || '',
    nameZhCn: item.name_i18n?.['zh-CN'] || '',
    nameEn: item.name_i18n?.en || '',
    descriptionZhTw: item.description_i18n?.['zh-TW'] || '',
    descriptionZhCn: item.description_i18n?.['zh-CN'] || '',
    descriptionEn: item.description_i18n?.en || '',
    sortOrder: item.sort_order ?? 0
  }));

  return Response.json({ items });
}

export async function POST(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const parsed = categoryPayloadSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: 'Invalid payload' }, { status: 400 });
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

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: inserted.id });
}

export async function PUT(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const parsed = categoryPayloadSchema.safeParse(await request.json());
  if (!parsed.success || !parsed.data.id) return Response.json({ error: 'Invalid payload' }, { status: 400 });
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

  const { error } = await service.from('categories').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
