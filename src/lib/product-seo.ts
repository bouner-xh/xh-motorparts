// 產品頁給搜尋引擎看的標題與描述（2026-10-06 SEO 調整）
// 品名放前面（買家多用品名＋料號搜尋）、加上分類與公司名；描述依語言寫成完整句子
// 純函式，方便單元測試（tests/admin/product-seo.test.mts）
import type {Locale} from './catalog.ts';

export interface ProductSeoInput {
  model: string;
  name: string;
  categoryName: string;
  subCategoryName: string;
  specifications: string[];
}

const BRAND: Record<Locale, string> = {
  'zh-TW': '協皇企業',
  'zh-CN': '协皇企业',
  en: 'Xie Huang Motorcycle Parts'
};

// 名稱與型號相同（沒有填名稱時會用型號代替）只顯示一次
function nameAndModel(input: ProductSeoInput) {
  return input.name && input.name !== input.model ? `${input.name} ${input.model}` : input.model;
}

export function buildProductTitle(input: ProductSeoInput, locale: Locale): string {
  return `${nameAndModel(input)} | ${input.categoryName} | ${BRAND[locale]}`;
}

export function buildProductDescription(input: ProductSeoInput, locale: Locale): string {
  const specs = input.specifications.filter(Boolean).join(', ');
  const hasName = input.name && input.name !== input.model;
  const where = input.subCategoryName && input.subCategoryName !== input.categoryName ? `${input.categoryName}／${input.subCategoryName}` : input.categoryName;

  if (locale === 'en') {
    const head = hasName ? `${input.name} (part no. ${input.model})` : `Part no. ${input.model}`;
    const whereEn = where.replace('／', ' / ');
    return [`${head} – ${whereEn}.`, specs ? `Specifications: ${specs}.` : '', 'Motorcycle parts manufacturer in Taiwan since 1990. Request a quote online.']
      .filter(Boolean)
      .join(' ');
  }
  if (locale === 'zh-CN') {
    const head = hasName ? `${input.name}（型号 ${input.model}）` : `型号 ${input.model}`;
    return `${head}，${where}。${specs ? `规格：${specs}。` : ''}台湾摩托车零件制造商协皇企业，可在线发送询价。`;
  }
  const head = hasName ? `${input.name}（型號 ${input.model}）` : `型號 ${input.model}`;
  return `${head}，${where}。${specs ? `規格：${specs}。` : ''}台灣摩托車零件製造商協皇企業，可線上送出詢價。`;
}
