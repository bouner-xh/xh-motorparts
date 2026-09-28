import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin-auth';
import { dbErrorResponse } from '@/lib/admin-api-errors';
import { buildInquiryCsv, exportFileName, filterInquiries, normalizeKeyword, parseStatus, type InquiryRow } from '@/lib/inquiry-export';

// 匯出詢價 CSV（A6 ①）：套用與列表相同的狀態與關鍵字篩選
// 內容含客戶個資，只有管理員能下載，且不讓瀏覽器或 CDN 快取
export async function GET(request: Request) {
  const supabase = await getSupabaseServerAuthClient();
  if (!supabase) return Response.json({ error: 'Supabase auth config is missing' }, { status: 500 });
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdminEmail(user.email)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const { data, error } = await service.from('inquiry_requests').select('*').order('created_at', { ascending: false });
  if (error) return dbErrorResponse('inquiries export', error);

  const rows = filterInquiries((data as InquiryRow[] | null) || [], parseStatus(searchParams.get('status')), normalizeKeyword(searchParams.get('q')));
  console.info(`[admin-export] ${user.email} exported ${rows.length} inquiries`);

  return new Response(buildInquiryCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName('inquiries')}"`,
      'Cache-Control': 'no-store'
    }
  });
}
