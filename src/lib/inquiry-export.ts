// 詢價的篩選與 CSV 匯出（A6）
// 純函式、不依賴資料庫，方便單元測試（tests/admin/inquiry-export.test.mts）

export const INQUIRY_STATUSES = ['pending', 'processing', 'replied', 'archived'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: '新詢價',
  processing: '報價中',
  replied: '已回覆',
  archived: '已封存'
};

export interface InquiryItemRow {
  modelNumber?: string;
  nameZhTw?: string;
  nameZhCn?: string;
  nameEn?: string;
  quantity?: number;
}

export interface InquiryRow {
  id?: string;
  status: InquiryStatus;
  customer_name?: string | null;
  customer_email?: string | null;
  company_name?: string | null;
  country?: string | null;
  phone?: string | null;
  message?: string | null;
  reply_notes?: string | null;
  items?: InquiryItemRow[] | null;
  created_at?: string;
  updated_at?: string;
}

export function parseStatus(value: string | null | undefined): InquiryStatus | null {
  return INQUIRY_STATUSES.includes(value as InquiryStatus) ? (value as InquiryStatus) : null;
}

// 搜尋：公司、聯絡人、Email、國家、電話、詢價的型號（不分大小寫）
function matchesKeyword(row: InquiryRow, keyword: string) {
  const fields = [row.customer_name, row.customer_email, row.company_name, row.country, row.phone, ...(row.items || []).map((i) => i.modelNumber)];
  return fields.some((value) => (value || '').toLowerCase().includes(keyword));
}

export function normalizeKeyword(value: string | null | undefined) {
  return (value || '').trim().toLowerCase().slice(0, 100);
}

// 畫面列表與匯出共用同一套篩選條件
export function filterInquiries<T extends InquiryRow>(rows: T[], status: InquiryStatus | null, keyword: string): T[] {
  return rows.filter((row) => (!status || row.status === status) && (!keyword || matchesKeyword(row, keyword)));
}

// 台灣時間 YYYY-MM-DD HH:mm（伺服器在 UTC 時區執行，需指定時區）
export function formatTaipeiTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`;
}

// CSV 欄位：必要時加引號；客戶輸入的內容若以 = + - @ 開頭，前面加 ' 避免 Excel 當成公式執行（CSV injection）
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const INQUIRY_CSV_HEADERS = [
  '詢價日期',
  '狀態',
  '公司',
  '聯絡人',
  'Email',
  '國家',
  '電話',
  '型號',
  '品名',
  '數量',
  '客戶留言',
  '內部備忘',
  '最後更新'
];

// 每個詢價品項一列（Excel 可直接用樞紐分析統計型號與數量）；沒有品項的詢價單也保留一列
export function buildInquiryCsv(rows: InquiryRow[]): string {
  const lines = [INQUIRY_CSV_HEADERS.map(csvCell).join(',')];
  for (const row of rows) {
    const base = [
      formatTaipeiTime(row.created_at),
      INQUIRY_STATUS_LABELS[row.status] || row.status,
      row.company_name,
      row.customer_name,
      row.customer_email,
      row.country,
      row.phone
    ];
    const tail = [row.message, row.reply_notes, formatTaipeiTime(row.updated_at)];
    const items = row.items?.length ? row.items : [{}];
    for (const item of items) {
      const name = item.nameZhTw || item.nameEn || item.nameZhCn || '';
      lines.push([...base, item.modelNumber, name, item.quantity, ...tail].map(csvCell).join(','));
    }
  }
  // 加上 BOM，Excel 開啟時中文不會亂碼
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function exportFileName(prefix: string, now = new Date()) {
  return `${prefix}-${formatTaipeiTime(now.toISOString()).slice(0, 10)}.csv`;
}
