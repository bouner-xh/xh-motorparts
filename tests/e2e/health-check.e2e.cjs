// E2E：健康檢查 /api/health（OP-14）
// 依 HEALTH_EXPECT 驗證三種情境（用對應的環境啟動網站）：
//   ok             模擬 Supabase 正常 → 200、database: ok
//   down           資料庫連不上 → 503、status: degraded、database: error
//   not-configured 沒設定資料庫 → 200、database: not-configured
const { BASE_URL, assert, run } = require('./helpers.cjs');

const expectation = process.env.HEALTH_EXPECT || 'ok';

run(`健康檢查：${expectation}`, async () => {
  const res = await fetch(`${BASE_URL}/api/health`);
  const body = await res.json();
  const text = JSON.stringify(body);

  assert(/no-store/.test(res.headers.get('cache-control') || ''), `Cache-Control 為 no-store（${res.headers.get('cache-control')}）`);
  assert(typeof body.responseMs === 'number', 'responseMs 是數字');
  assert(!/ECONNREFUSED|fetch failed|127\.0\.0\.1|supabase\.co|stack/i.test(text), '回應不洩漏錯誤細節');

  if (expectation === 'ok') {
    assert(res.status === 200 && body.status === 'ok' && body.database === 'ok', `資料庫正常回 200 ok（${text}）`);
  } else if (expectation === 'down') {
    assert(res.status === 503 && body.status === 'degraded' && body.database === 'error', `資料庫連不上回 503 degraded（${res.status} ${text}）`);
    assert(body.responseMs < 3500, `最多等 3 秒就放棄（${body.responseMs} ms）`);
  } else {
    assert(res.status === 200 && body.status === 'ok' && body.database === 'not-configured', `沒設定資料庫回 200 not-configured（${text}）`);
  }
});
