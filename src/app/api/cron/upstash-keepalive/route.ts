// 每日排程：讓免費服務保持運作
// - Upstash：連續 14 天沒有使用會被自動刪除 → 寫入並讀回一筆資料
// - Supabase：7 天沒有活動會被暫停（R5）→ 查詢一次產品資料表
// 排程設定在 vercel.json；只接受帶 CRON_SECRET 的呼叫（Vercel 排程會自動帶上）
// 任何一項失敗都回 502，Vercel → Logs 與 Cron Jobs 頁面會顯示失敗
import {Redis} from '@upstash/redis';
import {isAuthorizedCron} from '@/lib/cron-auth';
import {getSupabaseServiceRoleClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const KEY = 'xh:keepalive';

type CheckResult = 'ok' | 'not-configured' | 'failed';

async function touchUpstash(at: string): Promise<CheckResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return 'not-configured';
  try {
    const redis = new Redis({url, token});
    // 寫入 + 讀取各一次；保留 30 天後自動過期
    await redis.set(KEY, at, {ex: 60 * 60 * 24 * 30});
    return (await redis.get<string>(KEY)) === at ? 'ok' : 'failed';
  } catch (error) {
    console.error('[cron] keepalive: Upstash request failed:', error);
    return 'failed';
  }
}

async function touchSupabase(): Promise<CheckResult> {
  const service = getSupabaseServiceRoleClient();
  if (!service) return 'not-configured';
  try {
    const {error} = await service.from('products').select('id').limit(1);
    if (error) {
      console.error('[cron] keepalive: Supabase query failed:', error.message);
      return 'failed';
    }
    return 'ok';
  } catch (error) {
    console.error('[cron] keepalive: Supabase request failed:', error);
    return 'failed';
  }
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    console.error('[cron] keepalive: CRON_SECRET is not configured');
    return Response.json({error: 'not-configured'}, {status: 503});
  }
  if (!isAuthorizedCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({error: 'unauthorized'}, {status: 401});
  }

  const at = new Date().toISOString();
  const [upstash, supabase] = await Promise.all([touchUpstash(at), touchSupabase()]);
  const results = {upstash, supabase};
  // 正式環境兩項都有設定；少了任何一項也視為失敗，才會在 Vercel 看到提醒
  const ok = upstash === 'ok' && supabase === 'ok';
  if (!ok) console.error('[cron] keepalive: not all services are ok:', results);
  return Response.json({ok, at, ...results}, {status: ok ? 200 : 502});
}
