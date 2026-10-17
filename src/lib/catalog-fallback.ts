// 資料庫查詢失敗時，要不要退回靜態示範資料（OP-17）
// - 沒設定 Supabase（開發或「無資料庫」模式）：一律用靜態示範資料
// - 開發與測試模式：查詢失敗也退回示範資料，方便沒有資料庫時開發
// - 正式環境且已設定 Supabase：不退回。查詢失敗要丟出錯誤，讓 Next 繼續提供上一份好的快取（或回 500），
//   不可把示範資料／空清單當成真的頁面與 sitemap 快取 5 分鐘讓 Google 抓到
// 這個檔案不匯入其他模組，單元測試可以直接載入

type FallbackEnv = {
  NODE_ENV?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

export function shouldFallbackToStatic(env: FallbackEnv = process.env as FallbackEnv): boolean {
  const configured = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) return true;
  return env.NODE_ENV !== 'production';
}

/** 「查無資料」不是故障：.maybeSingle() 遇到多筆時回 PGRST116，視同查不到 */
export function isRealQueryFailure(error: {code?: string} | null | undefined): boolean {
  return Boolean(error) && error?.code !== 'PGRST116';
}

/**
 * 在 catch 區塊呼叫：正式環境且已設定資料庫時把錯誤往外丟（錯誤不會被快取），否則回傳讓呼叫端退回示範資料。
 * 只記錄錯誤訊息，不把細節帶進頁面
 */
export function rethrowUnlessFallback(error: unknown, label: string, env?: FallbackEnv): void {
  if (shouldFallbackToStatic(env)) return;
  const message = error instanceof Error ? error.message : (error as {message?: string} | null)?.message ?? error;
  console.error(`[catalog] ${label} failed:`, message);
  throw new Error(`catalog query failed: ${label}`);
}
