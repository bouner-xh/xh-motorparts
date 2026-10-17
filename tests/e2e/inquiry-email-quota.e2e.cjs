// E2E：同一收件信箱每天最多 3 封確認信（2026-10-17 網站健診 SX-5）、Turnstile 失敗後重置與提示
// 需要模擬 Supabase（含模擬 Upstash 與 Resend）與測試用站點金鑰（不設 TURNSTILE_SECRET_KEY，後端略過驗證）：
//   node tests/e2e/mock-supabase.cjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon SUPABASE_SERVICE_ROLE_KEY=service \
//   RESEND_API_KEY=test-key RESEND_API_URL=http://127.0.0.1:54321 NEXT_PUBLIC_TURNSTILE_SITE_KEY=dummy \
//   UPSTASH_REDIS_REST_URL=http://127.0.0.1:54321/upstash UPSTASH_REDIS_REST_TOKEN=upstash-token npx next dev -p 3100
const { BASE_URL, withPage, seedCart, fillInquiryForm, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const reset = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const PRODUCT_ID = '30000000-0000-4000-8000-000000000001';

function payload(email) {
  return {
    name: 'Quota Buyer',
    email,
    companyName: 'Quota Co',
    country: 'VN',
    items: [{ productId: PRODUCT_ID, modelNumber: '1HV-11311-00', quantity: 1 }],
    turnstileToken: ''
  };
}

run('同一信箱第 4 封起不再寄確認信，但詢價單照存、管理員照通知、買家看到成功', () =>
  withPage(async (page) => {
    await reset();
    const results = [];
    // 第 2、3 次用不同大小寫，視為同一信箱
    for (const email of ['quota@example.com', 'Quota@Example.com', 'QUOTA@example.com', 'quota@example.com']) {
      const res = await page.request.post(`${BASE_URL}/api/inquiry`, { data: payload(email) });
      results.push({ status: res.status(), body: await res.json() });
    }
    assert(results.every((r) => r.status === 200 && r.body.ok), '四次都回應成功');
    assert(
      JSON.stringify(results.map((r) => r.body.confirmationSent)) === '[true,true,true,false]',
      `前三次寄出確認信、第四次沒有（${JSON.stringify(results.map((r) => r.body.confirmationSent))}）`
    );
    const { emails, tables } = await mockState();
    const toBuyer = emails.filter((m) => m.to.toLowerCase() === 'quota@example.com');
    assert(toBuyer.length === 3, `買家只收到 3 封確認信（${toBuyer.length}）`);
    assert(emails.length === 7, `管理員 4 封通知 + 買家 3 封確認（共 ${emails.length}）`);
    assert(tables.inquiry_requests.length === 4, `四張詢價單都有存（${tables.inquiry_requests.length}）`);

    const other = await page.request.post(`${BASE_URL}/api/inquiry`, { data: payload('other@example.com') });
    assert((await other.json()).confirmationSent === true, '其他信箱不受影響');
  })
);

run('Upstash 的鍵不含信箱原文', () =>
  withPage(async () => {
    const { redis } = await mockState();
    const keys = Object.keys(redis).filter((k) => k.startsWith('inquiry-confirm:'));
    assert(keys.length === 2, `有額度計數鍵（${keys.length}）`);
    assert(keys.every((k) => !k.includes('example.com') && !k.includes('quota')), '鍵為雜湊，不含信箱');
  })
);

// 以假的 Turnstile 腳本驗證前端行為（不連 Cloudflare）
const FAKE_TURNSTILE = `
  window.__ts = { opts: null, resets: 0 };
  window.turnstile = {
    render(el, opts) { window.__ts.opts = opts; return 'w1'; },
    reset() { window.__ts.resets++; },
    remove() {}, getResponse() { return ''; }, isExpired() { return false; }, execute() {}
  };
`;

run('Turnstile：沒有 token 時按鈕變灰並顯示原因；失敗後重置並清空 token；過期時清空', () =>
  withPage(async (page) => {
    await reset();
    await page.route('**/challenges.cloudflare.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_TURNSTILE })
    );
    await seedCart(page);
    await page.goto(`${BASE_URL}/en/inquiry`);
    await page.locator('[name="name"]').waitFor();
    await page.waitForFunction(() => window.__ts && window.__ts.opts);

    const submit = page.locator('button[type="submit"]');
    assert(await submit.isDisabled(), '沒有 token 時送出按鈕不可按');
    assert((await page.getByTestId('captcha-required').innerText()).includes('complete the verification'), '旁邊顯示「請先完成驗證」');

    await fillInquiryForm(page, { email: 'ts@example.com' });
    await page.evaluate(() => window.__ts.opts.callback('token-1'));
    await submit.waitFor();
    assert(await submit.isEnabled(), '取得 token 後按鈕可按');
    assert((await page.getByTestId('captcha-required').count()) === 0, '提示消失');

    // 送出失敗：token 只能用一次，必須重置 widget、清空 token
    await page.route('**/api/inquiry', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'x', code: 'captcha_failed' }) })
    );
    await submit.click();
    await page.getByTestId('inquiry-error').waitFor();
    assert((await page.evaluate(() => window.__ts.resets)) >= 1, '失敗後重置了 Turnstile widget');
    assert(await submit.isDisabled(), '失敗後 token 已清空，按鈕變灰');
    assert((await page.inputValue('[name="email"]')) === 'ts@example.com', '欄位內容保留');

    // 重新驗證後可再送出；token 過期時清空
    await page.evaluate(() => window.__ts.opts.callback('token-2'));
    assert(await submit.isEnabled(), '重新驗證後按鈕可按');
    const expiredKey = await page.evaluate(() => Object.keys(window.__ts.opts).find((k) => /expired-callback/i.test(k)));
    assert(Boolean(expiredKey), `有註冊過期回呼（${expiredKey}）`);
    await page.evaluate((k) => window.__ts.opts[k](), expiredKey);
    assert(await submit.isDisabled(), 'token 過期後按鈕變灰');
    assert((await page.getByTestId('inquiry-error').innerText()).includes('expired'), '顯示驗證已過期');
  })
);
