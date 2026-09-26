// 正式網址：xh-motorparts.com 會 308 轉址到 www，canonical / sitemap 需使用實際網址
export const defaultBaseUrl = 'https://www.xh-motorparts.com';

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || defaultBaseUrl;
}
