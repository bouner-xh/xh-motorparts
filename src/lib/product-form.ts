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

// 表單欄位（健診 UX-24）：欄位內嵌錯誤用；順序就是畫面由上到下的順序，送出失敗時聚焦第一個有錯的欄位
export type ProductFormField =
  | 'category'
  | 'subCategoryId'
  | 'modelNumber'
  | 'nameEn'
  | 'nameZhTw'
  | 'nameZhCn'
  | 'specifications'
  | 'vehicleModelIds'
  | 'oemNumbers'
  | 'stockQuantity'
  | 'images';

export const PRODUCT_FIELD_ORDER: ProductFormField[] = [
  'category',
  'subCategoryId',
  'modelNumber',
  'nameEn',
  'nameZhTw',
  'nameZhCn',
  'specifications',
  'vehicleModelIds',
  'oemNumbers',
  'stockQuantity',
  'images'
];

export type ProductFieldErrors = Partial<Record<ProductFormField, string>>;

// 送出前在瀏覽器先檢查，訊息與伺服器一致；依欄位回傳
export function validateProductFormFields(input: ProductFormInput): ProductFieldErrors {
  const errors: ProductFieldErrors = {};
  if (!input.modelNumber) errors.modelNumber = '型號不可為空';
  if (!input.subCategoryId) errors.subCategoryId = '請選擇子分類（沒有子分類時請先到「分類」分頁建立）';
  // 英文名稱必填；繁中、簡中選填（沒填時前台顯示英文名稱）
  if (!input.nameEn) errors.nameEn = '名稱（en）不可為空';
  if (!Number.isInteger(input.stockQuantity) || input.stockQuantity < 0 || input.stockQuantity > MAX_STOCK_QUANTITY) errors.stockQuantity = STOCK_MESSAGE;
  return errors;
}

// 送出前在瀏覽器先檢查，訊息與伺服器一致
export function validateProductForm(input: ProductFormInput): string[] {
  return Object.values(validateProductFormFields(input));
}

// 一句伺服器回傳的錯誤訊息屬於哪個欄位（伺服器訊息見 src/app/api/admin/products/route.ts）
function fieldForMessagePart(part: string): ProductFormField | null {
  if (part.startsWith('型號')) return 'modelNumber';
  if (part.startsWith('名稱（en）')) return 'nameEn';
  if (part.startsWith('名稱（zh-TW）')) return 'nameZhTw';
  if (part.startsWith('名稱（zh-CN）')) return 'nameZhCn';
  if (part.startsWith('庫存')) return 'stockQuantity';
  if (part.startsWith('子分類')) return 'subCategoryId';
  if (part.startsWith('大分類')) return 'category';
  if (part.includes('規格')) return 'specifications';
  if (part.includes('對照料號') || part.startsWith('OEM')) return 'oemNumbers';
  if (part.startsWith('適用車型')) return 'vehicleModelIds';
  if (part.startsWith('圖片')) return 'images';
  return null;
}

// 把伺服器回傳的錯誤訊息對應到欄位；只要有一句對不上欄位（unmapped），畫面頂端的摘要就要顯示完整訊息
export function mapServerErrorToFields(message: string): {fields: ProductFieldErrors; unmapped: boolean} {
  const fields: ProductFieldErrors = {};
  if (message.startsWith('請修正：')) {
    let unmapped = false;
    for (const part of message.slice('請修正：'.length).split('、')) {
      const field = fieldForMessagePart(part);
      if (field) fields[field] = fields[field] ? `${fields[field]}、${part}` : part;
      else unmapped = true;
    }
    return {fields, unmapped};
  }
  if (message.startsWith('找不到這個大分類')) return {fields: {category: message}, unmapped: false};
  if (message.startsWith('子分類不屬於')) return {fields: {subCategoryId: message}, unmapped: false};
  if (message.startsWith('型號「') && message.includes('已經存在')) return {fields: {modelNumber: message}, unmapped: false};
  if (message.startsWith('OEM／對照料號「')) return {fields: {oemNumbers: message}, unmapped: false};
  return {fields, unmapped: true};
}
