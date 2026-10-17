// 批量匯入預覽（健診 UX-14、UX-29）：匯入前在瀏覽器比對現有產品與分類，先告訴老闆每一列會「新增」還是「更新」、
// 會不會新建分類（代號打錯字會悄悄新建一個新分類）。純函式、不依賴瀏覽器，方便單元測試（tests/admin/product-import-preview.test.mts）。
// 比對規則和後端批量匯入一致：型號不分大小寫；分類與子分類用代號（子分類在所屬大分類之下）。

export interface PreviewRowInput {
  modelNumber: string;
  categorySlug: string;
  subCategorySlug: string;
  nameI18n: Record<string, string>;
}

export interface ExistingCatalog {
  // 現有產品的型號（同型號有多個產品就會出現多次）
  modelNumbers: string[];
  categorySlugs: string[];
  subCategories: {category: string; slug: string}[];
}

// create 新增；update 更新既有；ambiguous 資料庫裡同型號有多個產品，批量匯入無法判斷要更新哪一個
export type ImportAction = 'create' | 'update' | 'ambiguous';

export interface RowAnalysis {
  action: ImportAction;
  newCategory: boolean;
  newSubCategory: boolean;
  // 新產品三語名稱全空：後端會拒絕，預覽就先擋下
  nameMissing: boolean;
}

export interface ImportAnalysis {
  rows: RowAnalysis[];
  newCategories: string[];
  newSubCategories: string[];
}

export function analyzeImportRows(rows: PreviewRowInput[], existing: ExistingCatalog): ImportAnalysis {
  const modelCounts = new Map<string, number>();
  for (const model of existing.modelNumbers) {
    const key = model.trim().toUpperCase();
    modelCounts.set(key, (modelCounts.get(key) || 0) + 1);
  }
  const categories = new Set(existing.categorySlugs);
  const subCategories = new Set(existing.subCategories.map((sc) => `${sc.category}/${sc.slug}`));
  const newCategories: string[] = [];
  const newSubCategories: string[] = [];

  const analyzed = rows.map((row): RowAnalysis => {
    const count = modelCounts.get(row.modelNumber.trim().toUpperCase()) || 0;
    const action: ImportAction = count === 0 ? 'create' : count === 1 ? 'update' : 'ambiguous';
    const newCategory = !categories.has(row.categorySlug);
    const subKey = `${row.categorySlug}/${row.subCategorySlug}`;
    // 大分類是新的，底下的子分類一定也是新的
    const newSubCategory = newCategory || !subCategories.has(subKey);
    if (newCategory && !newCategories.includes(row.categorySlug)) newCategories.push(row.categorySlug);
    if (newSubCategory && !newSubCategories.includes(subKey)) newSubCategories.push(subKey);
    return {action, newCategory, newSubCategory, nameMissing: action === 'create' && Object.keys(row.nameI18n).length === 0};
  });

  return {rows: analyzed, newCategories, newSubCategories};
}

// 預覽摘要：「將新建 N 個大分類、M 個子分類：…」；沒有要新建的回傳空字串
export function describeNewCategories(analysis: Pick<ImportAnalysis, 'newCategories' | 'newSubCategories'>): string {
  const {newCategories, newSubCategories} = analysis;
  if (!newCategories.length && !newSubCategories.length) return '';
  const names = [...newCategories.map((slug) => `大分類 ${slug}`), ...newSubCategories.map((key) => `子分類 ${key}`)];
  return `將新建 ${newCategories.length} 個大分類、${newSubCategories.length} 個子分類：${names.join('、')}`;
}

// 失敗清單 CSV（含型號與原因；加上 BOM，Excel 開啟中文不會亂碼）
export function buildFailedCsv(rows: {modelNumber: string; message?: string}[]): string {
  const escape = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const lines = [['model_number', '失敗原因'], ...rows.map((row) => [row.modelNumber, row.message || '匯入失敗'])];
  return '﻿' + lines.map((line) => line.map(escape).join(',')).join('\r\n') + '\r\n';
}
