// 詢價處理紀錄（A6 ③）：誰、何時、對哪張詢價做了什麼
// 資料表 inquiry_events 由 supabase/migrations/20260928_inquiry_events.sql 建立；
// 還沒建立時不影響原本的操作，只是不會留下紀錄
import type {ServiceClient} from '@/lib/admin-session';
import {buildInquiryChangeEvents, type InquiryEventInput} from '@/lib/inquiry-event-diff';

export type {InquiryEventInput} from '@/lib/inquiry-event-diff';
export {buildInquiryChangeEvents};

export interface InquiryEventRow {
  id: string;
  inquiry_id: string | null;
  inquiry_label: string;
  actor_email: string;
  action: 'status' | 'notes' | 'reply' | 'delete';
  from_value: string | null;
  to_value: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}

// 資料表不存在時 PostgREST 的錯誤代碼
const TABLE_MISSING_CODES = new Set(['PGRST205', '42P01']);

export function isTableMissing(error: {code?: string} | null | undefined) {
  return Boolean(error?.code && TABLE_MISSING_CODES.has(error.code));
}

// 寫入紀錄；失敗只記錄在伺服器 log，不影響主要操作
export async function recordInquiryEvents(service: ServiceClient, events: InquiryEventInput[]) {
  if (!events.length) return true;
  const {error} = await service.from('inquiry_events').insert(events);
  if (error) {
    console.warn(`[inquiry-events] ${isTableMissing(error) ? '資料表尚未建立，略過紀錄' : 'insert failed'}`, error.code || '', error.message || '');
    return false;
  }
  return true;
}

export async function listInquiryEvents(service: ServiceClient, inquiryId: string) {
  const {data, error} = await service
    .from('inquiry_events')
    .select('*')
    .eq('inquiry_id', inquiryId)
    .order('created_at', {ascending: false});
  if (error) return {available: !isTableMissing(error), events: [] as InquiryEventRow[], error};
  return {available: true, events: (data as InquiryEventRow[] | null) || [], error: null};
}
