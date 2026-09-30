// 詢價表單欄位上限與品項名稱處理（R3，2026-09-29 安全複查）
// 目的：確認信會寄到表單填的信箱，限制長度並改用資料庫的品項名稱，避免被借用來寄垃圾內容、耗盡寄信額度
// 純函式、不依賴資料庫，方便單元測試（tests/security/inquiry-limits.test.mts）

export const INQUIRY_LIMITS = {
  name: 100,
  email: 254,
  companyName: 150,
  country: 80,
  phone: 40,
  message: 2000,
  items: 100,
  productId: 64,
  modelNumber: 64,
  productName: 200,
  quantity: 1_000_000,
  turnstileToken: 4096
} as const;

export interface InquiryItemInput {
  productId: string;
  modelNumber: string;
  nameZhTw?: string;
  nameZhCn?: string;
  nameEn?: string;
  quantity: number;
}

export interface CatalogProductRow {
  id: string;
  model_number: string;
  name_i18n?: Record<string, string | undefined> | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 只有 UUID 格式的編號才拿去資料庫查詢（其他格式查詢會出錯）
export function productIdsToLookup(items: Pick<InquiryItemInput, 'productId'>[]) {
  return [...new Set(items.map((i) => i.productId).filter((id) => UUID_RE.test(id)))];
}

// 品項名稱、型號以資料庫為準；資料庫查不到的品項只保留型號（名稱清空），不採用瀏覽器送來的名稱
export function resolveInquiryItems<T extends InquiryItemInput>(items: T[], products: CatalogProductRow[]): T[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) return {...item, nameZhTw: '', nameZhCn: '', nameEn: ''};
    const names = product.name_i18n || {};
    return {
      ...item,
      modelNumber: product.model_number || item.modelNumber,
      nameZhTw: names['zh-TW'] || '',
      nameZhCn: names['zh-CN'] || '',
      nameEn: names.en || ''
    };
  });
}
