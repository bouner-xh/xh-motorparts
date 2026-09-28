import {z} from 'zod';
import {requireAdmin} from '@/lib/admin-session';
import {dbErrorResponse, invalidInputResponse, isUuid, INVALID_ID_MESSAGE} from '@/lib/admin-api-errors';
import {SALES_EMAIL} from '@/lib/inquiry-email';
import {buildReplyHtml, isPdf, MAX_ATTACHMENT_BYTES, normalizeLineBreaks, safeAttachmentName} from '@/lib/inquiry-reply';
import {buildInquiryChangeEvents, inquiryLabel} from '@/lib/inquiry-event-diff';
import {recordInquiryEvents} from '@/lib/inquiry-events';
import {isResendConfigured, sendResendEmail} from '@/lib/resend';

const replySchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000)
});

// 從後台回覆客戶（A6 ④）
// multipart/form-data：id、subject、body、attachment（選填，PDF，最大 4 MB）
// 寄件人為網站寄信地址，回覆地址與副本為 sales@；寄出後狀態改為「已回覆」並寫入處理紀錄
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!isResendConfigured()) {
    return Response.json({error: '寄信服務尚未設定（RESEND_API_KEY），無法從後台寄信'}, {status: 503});
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return invalidInputResponse('資料格式不正確，附件可能超過大小上限（4 MB）');
  }

  const id = String(form.get('id') || '');
  if (!isUuid(id)) return invalidInputResponse(INVALID_ID_MESSAGE);
  const parsed = replySchema.safeParse({subject: form.get('subject'), body: form.get('body')});
  if (!parsed.success) return invalidInputResponse('主旨與內容不可空白（主旨 200 字、內容 10,000 字以內）');

  // 附件：只接受 PDF，以檔案內容判斷，不只相信副檔名
  const file = form.get('attachment');
  let attachment: {filename: string; content: string} | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_ATTACHMENT_BYTES) return invalidInputResponse('附件不可超過 4 MB');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isPdf(bytes)) return invalidInputResponse('附件只接受 PDF 檔');
    attachment = {filename: safeAttachmentName(file.name), content: Buffer.from(bytes).toString('base64')};
  }

  const {data: inquiry, error: findError} = await auth.service
    .from('inquiry_requests')
    .select('id, status, reply_notes, company_name, customer_name, customer_email')
    .eq('id', id)
    .maybeSingle();
  if (findError) return dbErrorResponse('inquiry reply lookup', findError);
  if (!inquiry) return Response.json({error: '找不到這張詢價單，可能已被刪除'}, {status: 404});

  const subject = parsed.data.subject;
  const body = normalizeLineBreaks(parsed.data.body);
  const sent = await sendResendEmail({
    to: inquiry.customer_email,
    subject,
    html: buildReplyHtml(body),
    text: body,
    replyTo: SALES_EMAIL,
    cc: [SALES_EMAIL],
    attachments: attachment ? [attachment] : undefined
  });
  if (!sent.ok) {
    return Response.json({error: '寄信失敗，請稍後再試；若持續失敗請確認 Resend 寄件網域設定'}, {status: 502});
  }

  // 寄出成功：狀態改為已回覆（封存的不動），並記錄寄出內容
  const nextStatus = inquiry.status === 'archived' ? 'archived' : 'replied';
  const {data: updated, error: updateError} = await auth.service
    .from('inquiry_requests')
    .update({status: nextStatus})
    .eq('id', id)
    .select('*')
    .single();
  if (updateError) console.error('[inquiry-reply] status update failed', updateError.code, updateError.message);

  await recordInquiryEvents(auth.service, [
    {
      inquiry_id: id,
      inquiry_label: inquiryLabel(inquiry),
      actor_email: auth.email,
      action: 'reply',
      to_value: inquiry.customer_email,
      detail: {subject, body, attachment: attachment?.filename || null, resend_id: sent.id || null}
    },
    ...buildInquiryChangeEvents(inquiry, {status: nextStatus, reply_notes: inquiry.reply_notes || ''}, auth.email)
  ]);

  return Response.json({ok: true, item: updated || null, status: nextStatus});
}
