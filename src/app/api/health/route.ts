import {getSupabaseServerClient} from '@/lib/supabase/server';

// 每次都要實際檢查，不可被快取
export const dynamic = 'force-dynamic';

const DATABASE_TIMEOUT_MS = 3000;

// 健康檢查（給外部監控使用）：已設定資料庫時實際查一次 products（最多等 3 秒）。
// 資料庫連不上或逾時回 503；回應不帶任何錯誤細節
export async function GET() {
  const headers = {'Cache-Control': 'no-store'};
  const timestamp = new Date().toISOString();
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return Response.json({status: 'ok', timestamp, database: 'not-configured', responseMs: 0}, {headers});
  }

  const startedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let database: 'ok' | 'error' = 'error';

  try {
    const controller = new AbortController();
    const query = supabase.from('products').select('id').limit(1).abortSignal(controller.signal);
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error('timeout'));
      }, DATABASE_TIMEOUT_MS);
    });
    const {error} = await Promise.race([query, timeout]);
    database = error ? 'error' : 'ok';
  } catch {
    database = 'error';
  } finally {
    if (timer) clearTimeout(timer);
  }

  const responseMs = Date.now() - startedAt;
  if (database === 'error') {
    return Response.json({status: 'degraded', timestamp, database, responseMs}, {status: 503, headers});
  }
  return Response.json({status: 'ok', timestamp, database, responseMs}, {headers});
}
