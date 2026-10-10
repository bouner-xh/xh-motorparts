// 前台產品搜尋（產品上架檢查 P2，2026-10-04）
// 純函式、不依賴資料庫，方便單元測試（tests/admin/product-search.test.mts）
// 買家多半拿料號來找：型號比對時忽略大小寫、空白與 - _ . / 等符號；名稱比對三種語言

export const MAX_QUERY_LENGTH = 100;
export const MAX_RESULTS = 60;

export interface SearchableProduct {
  model: string;
  // 三種語言的名稱
  names: string[];
  specifications: string[];
  // OEM／對照料號與適用車型名稱（P8，選填）
  oemNumbers?: string[];
  vehicleModels?: string[];
}

export function normalizeQuery(value: string | string[] | undefined | null): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw || '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);
}

const compact = (value: string) => value.toLowerCase().replace(/[\s\-_./]/g, '');

// 單一關鍵字的分數：型號完全相同 > 型號開頭相同 > 型號包含 > 對照料號 > 名稱包含 > 適用車型 > 規格包含；不符合回傳 0
function scoreToken(product: SearchableProduct, token: string): number {
  const lower = token.toLowerCase();
  const tokenCompact = compact(token);
  const model = compact(product.model);
  if (tokenCompact) {
    if (model === tokenCompact) return 100;
    if (model.startsWith(tokenCompact)) return 80;
    if (model.includes(tokenCompact)) return 60;
  }
  if (tokenCompact && product.oemNumbers?.length) {
    const oems = product.oemNumbers.map(compact);
    if (oems.some((oem) => oem === tokenCompact)) return 90;
    if (oems.some((oem) => oem.startsWith(tokenCompact))) return 70;
    if (oems.some((oem) => oem.includes(tokenCompact))) return 55;
  }
  if (product.names.some((name) => name.toLowerCase().includes(lower))) return 30;
  if (product.vehicleModels?.some((name) => name.toLowerCase().includes(lower))) return 25;
  if (product.specifications.some((spec) => spec.toLowerCase().includes(lower))) return 10;
  return 0;
}

/**
 * 每個關鍵字（以空白分開）都要符合才列出，依符合程度排序，最多 MAX_RESULTS 筆
 */
export function searchProducts<T extends SearchableProduct>(products: T[], query: string): T[] {
  const tokens = normalizeQuery(query).split(' ').filter(Boolean);
  if (!tokens.length) return [];
  return products
    .map((product) => {
      let total = 0;
      for (const token of tokens) {
        const score = scoreToken(product, token);
        if (!score) return null;
        total += score;
      }
      return {product, total};
    })
    .filter((item): item is {product: T; total: number} => item !== null)
    .sort((a, b) => b.total - a.total || a.product.model.localeCompare(b.product.model))
    .slice(0, MAX_RESULTS)
    .map((item) => item.product);
}
