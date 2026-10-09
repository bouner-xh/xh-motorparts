// 分類網址代號（slug）：只留小寫英文、數字與連字號，空白與符號一律轉成連字號
// 例：「Clutch Housing」→ clutch-housing

export const SLUG_MESSAGE = '網址代號只能使用英文字母、數字與連字號，請改用英文（例如 clutch-housing）';

export function normalizeSlug(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
