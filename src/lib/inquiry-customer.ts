// 公開詢價對既有客戶資料的處理（2026-10-17 網站健診 SX-6）
// 純函式、不依賴資料庫，方便單元測試（tests/security/inquiry-customer.test.mts）

// 客戶以小寫 Email 為準
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// PostgREST ilike 的跳脫：%、_、\ 是萬用字元，信箱含有這些字元時不能當萬用字元用
export function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export interface CustomerContact {
  name?: string | null;
  company_name?: string | null;
  country?: string | null;
  phone?: string | null;
}

// 客戶已存在時不覆蓋既有資料，只在原欄位為空時補上這次填的值；沒有要補的欄位回傳 null
export function buildCustomerFillPatch(existing: CustomerContact, incoming: Required<CustomerContact>): CustomerContact | null {
  const patch: CustomerContact = {};
  for (const key of ['name', 'company_name', 'country', 'phone'] as const) {
    const current = (existing[key] ?? '').toString().trim();
    const next = (incoming[key] ?? '').toString().trim();
    if (!current && next) patch[key] = incoming[key];
  }
  return Object.keys(patch).length > 0 ? patch : null;
}
