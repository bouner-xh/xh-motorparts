// 批量匯入產品：解析試算表內容（A1、A4）
// 純函式、不依賴瀏覽器，方便單元測試（tests/admin/product-import.test.mts）

export interface ParsedProductRow {
  categorySlug: string;
  categoryNameI18n: Record<string, string>;
  subCategorySlug: string;
  subCategoryNameI18n: Record<string, string>;
  modelNumber: string;
  nameI18n: Record<string, string>;
  // null 表示試算表沒填：新產品用預設值，既有產品保留原本內容
  specifications: string[] | null;
  stockQuantity: number | null;
  isActive: boolean;
  imageFilename: string;
  // 畫面預覽用
  nameZhTw: string;
  categoryNameZhTw: string;
  subCategoryNameZhTw: string;
}

export type CellValue = string | number | boolean | Date | null | undefined;

// 每次送到 API 的筆數；API 端上限見 src/app/api/admin/products/batch/route.ts
export const IMPORT_CHUNK_SIZE = 50;

// 範例檔的欄位（第一列為欄位名稱）
export const TEMPLATE_HEADERS = [
  'model_number',
  'name_zh_tw',
  'name_zh_cn',
  'name_en',
  'category_slug',
  'category_name_zh_tw',
  'subcategory_slug',
  'subcategory_name_zh_tw',
  'specifications',
  'stock_quantity',
  'is_active',
  'image_filename'
];

export const TEMPLATE_EXAMPLE = [
  'CYL-001',
  '汽缸組 47mm',
  '汽缸组 47mm',
  'Cylinder Kit 47mm',
  'cylinder',
  '汽缸系列',
  'std',
  '標準汽缸',
  'STD, 47MM',
  '10',
  'TRUE',
  'cyl-001.jpg'
];

// 解析 CSV（RFC 4180）：支援引號內的逗號、換行與 "" 跳脫，並移除 Excel 加上的 BOM
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const input = text.replace(/^﻿/, '');

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function cellToString(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

// 第一列為欄位名稱，其餘每列轉成 {欄位: 值}
export function rowsToObjects(rows: CellValue[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(cellToString);
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) obj[header] = cellToString(cells[index]);
    });
    return obj;
  });
}

// 上架欄位：空白視為上架；FALSE／0／否／下架等視為不上架
export function parseBoolean(value: string, defaultValue = true): boolean | null {
  const v = value.trim().toLowerCase();
  if (!v) return defaultValue;
  if (['true', '1', 'yes', 'y', '是', '上架', 'v', '✓'].includes(v)) return true;
  if (['false', '0', 'no', 'n', '否', '下架', 'x'].includes(v)) return false;
  return null;
}

const LANG_MAP: Record<string, string> = {
  'zh-tw': 'zh-TW',
  zh_tw: 'zh-TW',
  tw: 'zh-TW',
  繁中: 'zh-TW',
  繁體: 'zh-TW',
  繁體中文: 'zh-TW',
  'zh-cn': 'zh-CN',
  zh_cn: 'zh-CN',
  cn: 'zh-CN',
  簡中: 'zh-CN',
  簡體: 'zh-CN',
  簡體中文: 'zh-CN',
  en: 'en',
  英文: 'en',
  英語: 'en',
  ja: 'ja',
  jp: 'ja',
  日文: 'ja',
  日語: 'ja',
  ko: 'ko',
  kr: 'ko',
  韓文: 'ko',
  韓語: 'ko'
};

const PREFIXES: Array<[keyof Pick<ParsedProductRow, 'nameI18n' | 'categoryNameI18n' | 'subCategoryNameI18n'>, RegExp]> = [
  // 較長的前綴放前面，避免 category_name_ 被 name_ 誤判
  ['subCategoryNameI18n', /^(subcategory_name_|sub_category_name_|子分類名稱_)/],
  ['categoryNameI18n', /^(category_name_|大分類名稱_)/],
  ['nameI18n', /^(name_|產品名稱_)/]
];

function pick(obj: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    if (obj[key]) return obj[key].trim();
  }
  return '';
}

export interface ParseResult {
  rows: ParsedProductRow[];
  errors: string[];
}

// 把試算表每一列轉成產品資料，並檢查必填欄位、數值格式與型號重複
// 列號以試算表為準（第 1 列為欄位名稱，資料從第 2 列開始）
export function parseProductRows(objects: Record<string, string>[]): ParseResult {
  const rows: ParsedProductRow[] = [];
  const errors: string[] = [];
  const seen = new Map<string, number>();

  objects.forEach((r, index) => {
    const line = index + 2;
    if (Object.values(r).every((v) => !v)) return;

    const modelNumber = pick(r, 'model_number', '型號');
    if (!modelNumber) {
      errors.push(`第 ${line} 列：缺少型號（model_number）`);
      return;
    }
    if (seen.has(modelNumber)) {
      errors.push(`第 ${line} 列：型號 ${modelNumber} 與第 ${seen.get(modelNumber)} 列重複`);
      return;
    }
    seen.set(modelNumber, line);

    const i18n = {nameI18n: {} as Record<string, string>, categoryNameI18n: {} as Record<string, string>, subCategoryNameI18n: {} as Record<string, string>};
    for (const [key, raw] of Object.entries(r)) {
      const value = (raw || '').trim();
      if (!value) continue;
      const lowerKey = key.trim().toLowerCase();
      for (const [target, prefix] of PREFIXES) {
        if (prefix.test(lowerKey)) {
          const suffix = lowerKey.replace(prefix, '');
          i18n[target][LANG_MAP[suffix] || suffix] = value;
          break;
        }
      }
    }

    const categorySlug = pick(r, 'category_slug', '大分類代號').toLowerCase();
    const subCategorySlug = pick(r, 'subcategory_slug', 'sub_category_slug', '子分類代號').toLowerCase();
    const rowErrors: string[] = [];
    if (!categorySlug) rowErrors.push('缺少大分類代號（category_slug）');
    if (!subCategorySlug) rowErrors.push('缺少子分類代號（subcategory_slug）');

    const stockRaw = pick(r, 'stock_quantity', '庫存');
    const stockQuantity = stockRaw ? Number(stockRaw) : null;
    if (stockQuantity !== null && (!Number.isInteger(stockQuantity) || stockQuantity < 0)) {
      rowErrors.push(`庫存「${stockRaw}」必須是 0 以上的整數`);
    }

    const activeRaw = pick(r, 'is_active', '上架');
    const isActive = parseBoolean(activeRaw);
    if (isActive === null) rowErrors.push(`上架欄「${activeRaw}」無法判讀，請填 TRUE／FALSE`);

    if (rowErrors.length) {
      errors.push(`第 ${line} 列（${modelNumber}）：${rowErrors.join('、')}`);
      return;
    }

    const specRaw = pick(r, 'specifications', '規格');
    const first = (m: Record<string, string>) => m['zh-TW'] || m.en || Object.values(m)[0] || '';

    rows.push({
      categorySlug,
      categoryNameI18n: i18n.categoryNameI18n,
      subCategorySlug,
      subCategoryNameI18n: i18n.subCategoryNameI18n,
      modelNumber,
      nameI18n: i18n.nameI18n,
      specifications: specRaw ? specRaw.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : null,
      stockQuantity,
      isActive: isActive as boolean,
      imageFilename: pick(r, 'image_filename', '圖片檔名'),
      nameZhTw: first(i18n.nameI18n),
      categoryNameZhTw: first(i18n.categoryNameI18n),
      subCategoryNameZhTw: first(i18n.subCategoryNameI18n)
    });
  });

  if (!rows.length && !errors.length) {
    errors.push('檔案中沒有產品資料（第 1 列需為欄位名稱，並包含 model_number 欄位）');
  }
  return {rows, errors};
}

// 產生範例 CSV（加上 BOM，Excel 開啟中文不會亂碼）
export function buildTemplateCsv(): string {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return '﻿' + [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE].map((r) => r.map(escape).join(',')).join('\r\n') + '\r\n';
}

export function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}
