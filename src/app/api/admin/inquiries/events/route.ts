import {requireAdmin} from '@/lib/admin-session';
import {dbErrorResponse, invalidInputResponse, isUuid, INVALID_ID_MESSAGE} from '@/lib/admin-api-errors';
import {listInquiryEvents} from '@/lib/inquiry-events';

// 詢價處理紀錄（A6 ③）：?id=詢價單編號
// available=false 表示資料表尚未建立（需在 Supabase 執行 supabase/migrations/20260928_inquiry_events.sql）
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const id = new URL(request.url).searchParams.get('id');
  if (!isUuid(id)) return invalidInputResponse(INVALID_ID_MESSAGE);

  const {available, events, error} = await listInquiryEvents(auth.service, id);
  if (error && available) return dbErrorResponse('inquiry events GET', error);
  return Response.json({available, events});
}
