// 每日排程：讀寫一次 Upstash，避免免費資料庫連續 14 天沒有使用被自動刪除
// 排程設定在 vercel.json；只接受帶 CRON_SECRET 的呼叫（Vercel 排程會自動帶上）
import {Redis} from '@upstash/redis';
import {isAuthorizedCron} from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

const KEY = 'xh:keepalive';

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    console.error('[cron] upstash-keepalive: CRON_SECRET is not configured');
    return Response.json({error: 'not-configured'}, {status: 503});
  }
  if (!isAuthorizedCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({error: 'unauthorized'}, {status: 401});
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.error('[cron] upstash-keepalive: Upstash is not configured');
    return Response.json({error: 'upstash-not-configured'}, {status: 503});
  }

  try {
    const redis = new Redis({url, token});
    const at = new Date().toISOString();
    // 寫入 + 讀取各一次；保留 30 天後自動過期
    await redis.set(KEY, at, {ex: 60 * 60 * 24 * 30});
    const stored = await redis.get<string>(KEY);
    return Response.json({ok: stored === at, at});
  } catch (error) {
    // 失敗會顯示在 Vercel → Logs 與 Cron Jobs 頁面
    console.error('[cron] upstash-keepalive: Upstash request failed:', error);
    return Response.json({error: 'upstash-failed'}, {status: 502});
  }
}
