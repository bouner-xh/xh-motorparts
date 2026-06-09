import { z } from 'zod';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

const updateInquirySchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'replied', 'archived']),
  replyNotes: z.string().default('')
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
    .from('inquiry_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ items: data || [] });
}

export async function PUT(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  try {
    const body = await request.json();
    const parsed = updateInquirySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { error } = await service
      .from('inquiry_requests')
      .update({
        status: parsed.data.status,
        reply_notes: parsed.data.replyNotes
      })
      .eq('id', parsed.data.id);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing ID' }, { status: 400 });

  const { error } = await service
    .from('inquiry_requests')
    .delete()
    .eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
