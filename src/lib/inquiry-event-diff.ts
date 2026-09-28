// 比對詢價單修改前後，產生處理紀錄（純函式，方便單元測試）

export interface InquiryEventInput {
  inquiry_id: string | null;
  inquiry_label: string;
  actor_email: string;
  action: 'status' | 'notes' | 'reply' | 'delete';
  from_value?: string | null;
  to_value?: string | null;
  detail?: Record<string, unknown>;
}

interface InquirySnapshot {
  id: string;
  status: string;
  reply_notes?: string | null;
  company_name?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
}

export function inquiryLabel(row: Pick<InquirySnapshot, 'company_name' | 'customer_name' | 'customer_email'>) {
  return [row.company_name || row.customer_name || '', row.customer_email || ''].filter(Boolean).join(' / ');
}

// 只記錄真的有改變的欄位；沒有改變就不產生紀錄
export function buildInquiryChangeEvents(
  before: InquirySnapshot,
  after: {status: string; reply_notes: string},
  actorEmail: string
): InquiryEventInput[] {
  const base = {inquiry_id: before.id, inquiry_label: inquiryLabel(before), actor_email: actorEmail};
  const events: InquiryEventInput[] = [];
  if (before.status !== after.status) {
    events.push({...base, action: 'status', from_value: before.status, to_value: after.status});
  }
  if ((before.reply_notes || '') !== (after.reply_notes || '')) {
    events.push({...base, action: 'notes', from_value: before.reply_notes || '', to_value: after.reply_notes || ''});
  }
  return events;
}

export function buildDeleteEvent(before: InquirySnapshot, actorEmail: string): InquiryEventInput {
  return {inquiry_id: before.id, inquiry_label: inquiryLabel(before), actor_email: actorEmail, action: 'delete', from_value: before.status, to_value: null};
}
