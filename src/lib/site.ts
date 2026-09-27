import {locales} from './catalog';

// 正式網址：xh-motorparts.com 會 308 轉址到 www，canonical / sitemap 需使用實際網址
export const defaultBaseUrl = 'https://www.xh-motorparts.com';

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || defaultBaseUrl;
}

// canonical 與 hreflang（D14）
// Next.js 的 metadata 不會合併 alternates：頁面只設 canonical 會蓋掉 layout 的 hreflang，
// 沒設的頁面則沿用 layout 指向首頁的 canonical。因此每個公開頁面都要用這個函式設定自己的網址。
// path 為語系之後的路徑，例如 '/products/cylinder'（需自行編碼特殊字元）
export function localeAlternates(locale: string, path = '') {
  const baseUrl = getBaseUrl();
  const languages: Record<string, string> = {};
  for (const lang of locales) {
    languages[lang] = `${baseUrl}/${lang}${path}`;
  }
  languages['x-default'] = `${baseUrl}/en${path}`;
  return {canonical: `${baseUrl}/${locale}${path}`, languages};
}
