// E2E：每日排程保持免費服務運作（Upstash 14 天沒有使用會被刪除、Supabase 7 天沒有活動會暫停）
// 以 Vercel 排程的方式呼叫（Authorization: Bearer <CRON_SECRET>），需要模擬 Supabase 伺服器中的模擬 Upstash：
//   node tests/e2e/mock-supabase.cjs &
//   CRON_SECRET=e2e-cron-secret UPSTASH_REDIS_REST_URL=http://127.0.0.1:54321/upstash UPSTASH_REDIS_REST_TOKEN=upstash-token npx next dev -p 3100
// E2E_EXPECT=upstash-down：Upstash 位址連不上時，排程回報失敗（502）讓 Vercel 顯示錯誤
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const SECRET = 'e2e-cron-secret';
const PATH = '/api/cron/upstash-keepalive';
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const upstashDown = process.env.E2E_EXPECT === 'upstash-down';

if (upstashDown) {
  run('Upstash 連不上：排程回報失敗', () =>
    withPage(async (page) => {
      const res = await page.request.get(`${BASE_URL}${PATH}`, { headers: { Authorization: `Bearer ${SECRET}` } });
      assert(res.status() === 502, `回應 502（實際 ${res.status()}）`);
      const body = await res.json();
      assert(body.upstash === 'failed' && body.supabase === 'ok', `分別回報各服務狀態（upstash ${body.upstash}、supabase ${body.supabase}）`);
    })
  );
} else {
  run('沒有密碼或密碼錯誤：拒絕，不碰 Upstash', () =>
    withPage(async (page) => {
      await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
      const none = await page.request.get(`${BASE_URL}${PATH}`);
      assert(none.status() === 401, `沒帶密碼回應 401（實際 ${none.status()}）`);
      const wrong = await page.request.get(`${BASE_URL}${PATH}`, { headers: { Authorization: 'Bearer wrong' } });
      assert(wrong.status() === 401, `密碼錯誤回應 401（實際 ${wrong.status()}）`);
      const { redisCommands } = await mockState();
      assert(redisCommands.length === 0, '沒有對 Upstash 下任何指令');
    })
  );

  run('Vercel 排程呼叫：寫入並讀回 Upstash', () =>
    withPage(async (page) => {
      await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
      const res = await page.request.get(`${BASE_URL}${PATH}`, { headers: { Authorization: `Bearer ${SECRET}` } });
      assert(res.status() === 200, `回應 200（實際 ${res.status()}）`);
      const body = await res.json();
      assert(body.ok === true, '讀回的值與寫入相同');
      const { redis, redisCommands, restLog } = await mockState();
      assert(redis['xh:keepalive'] === body.at, 'Upstash 內有本次的時間紀錄');
      assert(redisCommands.join(',') === 'SET,GET', `寫入與讀取各一次（${redisCommands.join(',')}）`);
      assert(body.supabase === 'ok' && restLog.includes('GET products'), '查詢了一次 Supabase 產品資料表');
    })
  );

  run('Supabase 查詢失敗：排程回報失敗，Upstash 仍照常更新', () =>
    withPage(async (page) => {
      await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
      await fetch(`${MOCK_URL}/__mock/drop`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'products' }) });
      try {
        const res = await page.request.get(`${BASE_URL}${PATH}`, { headers: { Authorization: `Bearer ${SECRET}` } });
        assert(res.status() === 502, `回應 502（實際 ${res.status()}）`);
        const body = await res.json();
        assert(body.supabase === 'failed' && body.upstash === 'ok', `supabase ${body.supabase}、upstash ${body.upstash}`);
      } finally {
        await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
      }
    })
  );
}
