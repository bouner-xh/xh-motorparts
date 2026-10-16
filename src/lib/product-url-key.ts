// 產品網址代號（型號可重複）：型號不再是唯一識別，產品網址改用「網址代號」（products.url_key）
// - 第一個使用某型號的產品，網址代號就是型號本身（舊產品的網址完全不變）
// - 之後重複的型號：網址代號 = 型號-第一個 OEM 料號（符號統一換成「-」）；沒有 OEM 料號就用型號-2、型號-3…
// - 網址代號只在建立（或型號／大分類改變）時產生，之後改 OEM 料號不會變，避免舊連結失效
// - OEM／對照料號全站唯一（不分大小寫）
// 資料庫還沒執行 20261014_product_url_key.sql 時，所有函式都退回舊行為（型號唯一）
import {escapeLikePattern} from './product-form.ts';

export const URL_KEY_SETUP_MESSAGE =
  '要使用重複型號，請先在 Supabase 的 SQL Editor 執行 supabase/migrations/20261014_product_url_key.sql，執行後重新整理本頁。';

/** 把 OEM 料號整理成網址片段：非文字、數字的符號（句號、斜線、空白…）換成「-」，連續的「-」合併，頭尾去掉 */
export function slugifyUrlPart(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/** 網址代號的候選清單（依優先順序）：型號、型號-OEM、型號-2、型號-3… */
export function urlKeyCandidates(modelNumber: string, oemNumbers: string[] = [], serialCount = 50): string[] {
  const candidates = [modelNumber];
  const oemPart = oemNumbers.length ? slugifyUrlPart(oemNumbers[0]) : '';
  if (oemPart) candidates.push(`${modelNumber}-${oemPart}`);
  for (let n = 2; n < 2 + serialCount; n++) candidates.push(`${modelNumber}-${n}`);
  return candidates;
}

/** 從候選清單挑第一個沒被占用的（不分大小寫）；全部被占用時回傳 null */
export function chooseUrlKey(candidates: string[], taken: Iterable<string>): string | null {
  const used = new Set([...taken].map((key) => key.toLowerCase()));
  return candidates.find((candidate) => !used.has(candidate.toLowerCase())) ?? null;
}

export interface OemRow {
  id: string;
  model_number: string;
  oem_numbers: string[] | null;
}

/** 找出已被其他產品使用的 OEM 料號（不分大小寫）；沒有衝突回傳 null */
export function findOemConflictIn(rows: OemRow[], oemNumbers: string[], excludeId?: string): {oem: string; model: string} | null {
  if (!oemNumbers.length) return null;
  const wanted = new Map(oemNumbers.map((oem) => [oem.toUpperCase(), oem]));
  for (const row of rows) {
    if (row.id === excludeId) continue;
    for (const existing of row.oem_numbers || []) {
      const match = wanted.get(existing.toUpperCase());
      if (match) return {oem: match, model: row.model_number};
    }
  }
  return null;
}

export function oemConflictMessage(conflict: {oem: string; model: string}) {
  return `OEM／對照料號「${conflict.oem}」已經被產品「${conflict.model}」使用，請確認是否輸入重複，或到下方列表編輯該產品`;
}

// 最精簡的資料庫連線型別（admin service client 與前台 server client 都符合）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UrlKeyDb = {from: (table: string) => any};

// 正式環境：查到有欄位後長期記住（欄位不會消失）；查不到時只記 60 秒，老闆執行 SQL 後很快就會生效。
// 開發與測試環境不快取，測試中途執行「SQL」馬上看得到
const PROBE_OK_TTL_MS = process.env.NODE_ENV === 'production' ? 60 * 60_000 : 0;
const PROBE_MISSING_TTL_MS = process.env.NODE_ENV === 'production' ? 60_000 : 0;
let probeCache: {at: number; ok: boolean} | null = null;

/** 資料庫是否已有 products.url_key 欄位（已執行 20261014_product_url_key.sql） */
export async function urlKeyColumnExists(db: UrlKeyDb): Promise<boolean> {
  if (probeCache) {
    const ttl = probeCache.ok ? PROBE_OK_TTL_MS : PROBE_MISSING_TTL_MS;
    if (ttl > 0 && Date.now() - probeCache.at < ttl) return probeCache.ok;
  }
  let ok = false;
  try {
    const {error} = await db.from('products').select('url_key').limit(1);
    ok = !error;
  } catch {
    ok = false;
  }
  probeCache = {at: Date.now(), ok};
  return ok;
}

/** 在同一個大分類內挑一個沒被占用的網址代號 */
export async function pickUrlKey(db: UrlKeyDb, categoryId: string, modelNumber: string, oemNumbers: string[], excludeId?: string): Promise<string> {
  const {data} = await db
    .from('products')
    .select('id,url_key')
    .eq('category_id', categoryId)
    .ilike('url_key', `${escapeLikePattern(modelNumber)}%`);
  const taken = ((data as {id: string; url_key: string | null}[] | null) || [])
    .filter((row) => row.id !== excludeId && row.url_key)
    .map((row) => row.url_key as string);
  return chooseUrlKey(urlKeyCandidates(modelNumber, oemNumbers), taken) ?? `${modelNumber}-${Date.now()}`;
}

/** 查詢是否有其他產品已使用這些 OEM 料號；欄位不存在或查詢失敗時視為沒有衝突 */
export async function findOemConflict(db: UrlKeyDb, oemNumbers: string[] | undefined, excludeId?: string) {
  if (!oemNumbers?.length) return null;
  try {
    const {data, error} = await db.from('products').select('id,model_number,oem_numbers').limit(10000);
    if (error) return null;
    return findOemConflictIn((data as OemRow[] | null) || [], oemNumbers, excludeId);
  } catch {
    return null;
  }
}
