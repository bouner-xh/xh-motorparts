// 後台產品表單：規格拆分與錯誤訊息（產品上架檢查 P4、P6）
// 純函式、不依賴資料庫，前端表單與產品 API 共用（tests/admin/product-form.test.mts）

// 型號一律存成大寫（原廠料號慣例），前端表單、產品 API 與批量匯入共用
export function normalizeModelNumber(value: string): string {
  return value.trim().toUpperCase();
}

// 組 PostgreSQL ilike 的比對字串：跳脫 \ % _，讓型號當成一般文字（不分大小寫比對）
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// 規格可用半形逗號、全形逗號、頓號、分號或換行分隔（批量匯入原本就接受全形逗號）
export function splitSpecifications(text: string): string[] {
  return text
    .split(/[,，、;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// 一個產品最多幾張圖（U9）
export const MAX_PRODUCT_IMAGES = 8;

// 適用車型、OEM 對照料號的數量上限（P8）
export const MAX_VEHICLE_MODELS_PER_PRODUCT = 50;
export const MAX_OEM_NUMBERS = 30;

// OEM／對照料號：可用逗號、頓號、分號或換行分隔；一律轉大寫（與型號相同規則）、去除空白與重複
export function normalizeOemNumbers(list: string[]): string[] {
  return [...new Set(list.map(normalizeModelNumber).filter(Boolean))];
}

export function splitOemNumbers(text: string): string[] {
  return normalizeOemNumbers(text.split(/[,，、;；\n]/));
}

// 庫存上限：避免輸入過大的數字造成資料庫錯誤（U2）
export const MAX_STOCK_QUANTITY = 1_000_000;
export const STOCK_MESSAGE = `庫存必須是 0 到 ${MAX_STOCK_QUANTITY.toLocaleString('en-US')} 的整數`;

const FIELD_LABELS: Record<string, string> = {
  category: '大分類',
  subCategoryId: '子分類',
  modelNumber: '型號',
  nameZhTw: '名稱（zh-TW）',
  nameZhCn: '名稱（zh-CN）',
  nameEn: '名稱（en）',
  specifications: '規格',
  stockQuantity: '庫存',
  imagePath: '圖片網址',
  images: '圖片',
  oemNumbers: 'OEM／對照料號',
  vehicleModelIds: '適用車型'
};

export interface InputIssue {
  path: PropertyKey[];
  code: string;
  maximum?: number | bigint;
}

function describeIssue(issue: InputIssue) {
  const field = String(issue.path[0] ?? '');
  const label = FIELD_LABELS[field] || field || '資料';
  if (field === 'stockQuantity') return STOCK_MESSAGE;
  if (field === 'images') return issue.code === 'too_big' ? `圖片最多 ${MAX_PRODUCT_IMAGES} 張` : '圖片網址格式不正確';
  if (field === 'oemNumbers') return issue.code === 'too_big' && issue.path.length === 1 ? `OEM／對照料號最多 ${MAX_OEM_NUMBERS} 個` : '每個對照料號最多 100 字';
  if (field === 'vehicleModelIds') return `適用車型最多 ${MAX_VEHICLE_MODELS_PER_PRODUCT} 個`;
  if (field === 'specifications') {
    return issue.path.length > 1 ? '每個規格最多 200 字' : `規格最多 ${issue.maximum ?? 50} 項`;
  }
  if (issue.code === 'too_big' && issue.maximum !== undefined) return `${label}太長（最多 ${issue.maximum} 字）`;
  if (issue.code === 'too_small') return `${label}不可為空`;
  return `${label}格式不正確`;
}

// 把欄位檢查的結果轉成一句中文，指出是哪些欄位要修正
export function describeProductInputIssues(issues: InputIssue[]): string {
  const messages = [...new Set(issues.map(describeIssue))];
  return messages.length ? `請修正：${messages.join('、')}` : '輸入的資料格式不正確，請檢查必填欄位與長度';
}

export function duplicateModelMessage(modelNumber: string) {
  return `型號「${modelNumber}」已經存在，請換一個型號，或到下方列表編輯原本的產品`;
}

export interface ProductFormInput {
  modelNumber: string;
  subCategoryId: string;
  nameZhTw: string;
  nameZhCn: string;
  nameEn: string;
  stockQuantity: number;
}

// 送出前在瀏覽器先檢查，訊息與伺服器一致
export function validateProductForm(input: ProductFormInput): string[] {
  const errors: string[] = [];
  if (!input.modelNumber) errors.push('型號不可為空');
  if (!input.subCategoryId) errors.push('請選擇子分類（沒有子分類時請先到「分類」分頁建立）');
  // 英文名稱必填；繁中、簡中選填（沒填時前台顯示英文名稱）
  if (!input.nameEn) errors.push('名稱（en）不可為空');
  if (!Number.isInteger(input.stockQuantity) || input.stockQuantity < 0 || input.stockQuantity > MAX_STOCK_QUANTITY) errors.push(STOCK_MESSAGE);
  return errors;
}
