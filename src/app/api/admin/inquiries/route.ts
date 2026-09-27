import { z } from 'zod';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin-auth';

const STATUSES = ['pending', 'processing', 'replied', 'archived'] as const;
type InquiryStatus = (typeof STATUSES)[number];
const PAGE_SIZE = 20;

const updateInquirySchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUSES),
  replyNotes: z.string().max(5000).default('')
});

interface InquiryRow {
  status: InquiryStatus;
  customer_name?: string | null;
  customer_email?: string | null;
  company_name?: string | null;
  country?: string | null;
  phone?: string | null;
  items?: {modelNumber?: string}[] | null;
}

// 搜尋：公司、聯絡人、Email、國家、電話、詢價的型號（不分大小寫）
function matchesKeyword(row: InquiryRow, keyword: string) {
  const fields = [row.customer_name, row.customer_email, row.company_name, row.country, row.phone, ...(row.items || []).map((i) => i.modelNumber)];
  return fields.some((value) => (value || '').toLowerCase().includes(keyword));
}

async function getAuthenticatedUser() {
  const supabase = await getSupabaseServerAuthClient();
  if (!supabase) return { ok: false, error: 'Supabase auth config is missing' } as const;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Unauthorized' } as const;
  if (!isAdminEmail(user.email)) return { ok: false, error: 'Forbidden' } as const;

  return { ok: true, user } as const;
}

// 參數：status（pending／processing／replied／archived，不填為全部）、q（關鍵字）、page（從 1 開始）
// 回傳該頁資料、符合條件的總筆數與各狀態筆數（A6）
// 詢價量以每年數百到數千筆估計，在伺服器端篩選後只回傳一頁，瀏覽器不需下載全部資料
export async function GET(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: authResult.error === 'Forbidden' ? 403 : 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const status = STATUSES.includes(statusParam as InquiryStatus) ? (statusParam as InquiryStatus) : null;
  const keyword = (searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);

  const { data, error } = await service
    .from('inquiry_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = (data as InquiryRow[] | null) || [];
  const counts: Record<'all' | InquiryStatus, number> = { all: rows.length, pending: 0, processing: 0, replied: 0, archived: 0 };
  rows.forEach((row) => {
    if (row.status in counts) counts[row.status]++;
  });

  const filtered = rows.filter((row) => (!status || row.status === status) && (!keyword || matchesKeyword(row, keyword)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const items = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return Response.json({ items, total: filtered.length, page: currentPage, pageSize: PAGE_SIZE, totalPages, counts });
}

export async function PUT(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: authResult.error === 'Forbidden' ? 403 : 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  try {
    const body = await request.json();
    const parsed = updateInquirySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 回傳更新後的資料（含資料庫自動更新的 updated_at）
    const { data, error } = await service
      .from('inquiry_requests')
      .update({
        status: parsed.data.status,
        reply_notes: parsed.data.replyNotes
      })
      .eq('id', parsed.data.id)
      .select('*')
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ ok: true, item: data });
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: authResult.error === 'Forbidden' ? 403 : 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id || !z.string().uuid().safeParse(id).success) return Response.json({ error: 'Missing ID' }, { status: 400 });

  const { error } = await service
    .from('inquiry_requests')
    .delete()
    .eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
