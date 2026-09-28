// 從後台回覆客戶（A6 ④）：回覆範本、信件內容與附件檢查
// 純函式、不依賴資料庫，方便單元測試（tests/admin/inquiry-reply.test.mts）

export type ReplyLanguage = 'en' | 'zh-TW';

export interface ReplyInquiry {
  id: string;
  customer_name?: string | null;
  company_name?: string | null;
  created_at: string;
  items?: {modelNumber?: string; nameZhTw?: string; nameEn?: string; quantity?: number}[] | null;
}

// Vercel 單次請求上限約 4.5 MB，附件限制 4 MB
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

const COMPANY_SIGNATURE = {
  en: 'Xie Huang Enterprise Co., Ltd.\nsales@xh-motorparts.com | WhatsApp +886 930 797 299\nhttps://www.xh-motorparts.com',
  'zh-TW': '協皇企業有限公司\nsales@xh-motorparts.com｜WhatsApp +886 930 797 299\nhttps://www.xh-motorparts.com'
};

// 詢價編號：RFQ-建立日期（台灣時間）-編號前 4 碼，放在主旨方便日後對照往來信件
export function rfqCode(inquiry: Pick<ReplyInquiry, 'id' | 'created_at'>) {
  const date = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'})
    .format(new Date(inquiry.created_at))
    .replace(/-/g, '');
  return `RFQ-${date}-${inquiry.id.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}

export function buildReplyDraft(inquiry: ReplyInquiry, language: ReplyLanguage) {
  const code = rfqCode(inquiry);
  const name = (inquiry.customer_name || '').trim();
  const items = (inquiry.items || []).map((i) => {
    const label = language === 'en' ? i.nameEn || i.nameZhTw || '' : i.nameZhTw || i.nameEn || '';
    return `- ${i.modelNumber || ''}${label ? ` ${label}` : ''} × ${i.quantity ?? ''}`;
  });

  if (language === 'zh-TW') {
    return {
      subject: `協皇企業報價回覆 [${code}]`,
      body: [
        `${name || '您'} 您好：`,
        '',
        '感謝您的詢價，以下是您詢價的品項：',
        '',
        ...items,
        '',
        '【請在這裡填寫單價、最小訂購量、交期與付款條件】',
        '',
        '如有任何問題，直接回覆這封信即可。',
        '',
        '敬祝 商祺',
        COMPANY_SIGNATURE['zh-TW']
      ].join('\n')
    };
  }
  return {
    subject: `Quotation from Xie Huang Enterprise [${code}]`,
    body: [
      `Dear ${name || 'Customer'},`,
      '',
      'Thank you for your inquiry. Here are the items you requested:',
      '',
      ...items,
      '',
      '[Please fill in unit price, MOQ, lead time and payment terms here]',
      '',
      'If you have any questions, simply reply to this email.',
      '',
      'Best regards,',
      COMPANY_SIGNATURE.en
    ].join('\n')
  };
}

// 範本中的提示文字還沒改掉時，寄出前提醒
export function hasUnfilledPlaceholder(body: string) {
  return /【請在這裡填寫|\[Please fill in/.test(body);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c] as string);
}

// 瀏覽器送出表單時換行會變成 \r\n，統一為 \n
export function normalizeLineBreaks(text: string) {
  return text.replace(/\r\n?/g, '\n');
}

// 純文字內容轉成信件 HTML：全部跳脫後才換行，客戶與管理員輸入的內容都不會被當成 HTML
export function buildReplyHtml(body: string) {
  const paragraphs = escapeHtml(normalizeLineBreaks(body))
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<div style="font-family:Arial,'Noto Sans TC',sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:640px">${paragraphs}</div>`;
}

// 以檔案內容確認是 PDF（開頭為 %PDF-），不只相信副檔名
export function isPdf(bytes: Uint8Array) {
  return bytes.length > 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
}

export function safeAttachmentName(name: string) {
  const base = name.replace(/\.pdf$/i, '').replace(/[^\w一-鿿.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'quotation';
  return `${base}.pdf`;
}
