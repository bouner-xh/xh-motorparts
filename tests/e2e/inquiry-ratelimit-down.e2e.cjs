// E2E：流量限制服務（Upstash）連不上時，詢價照常送出（2026-09 正式站 Upstash 免費資料庫閒置被刪除，表單全部失敗）
// 以無法連線的 Upstash 位址模擬故障，並使用模擬 Supabase 與模擬 Resend：
//   node tests/e2e/mock-supabase.cjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon SUPABASE_SERVICE_ROLE_KEY=service \
//   RESEND_API_KEY=test-key RESEND_API_URL=http://127.0.0.1:54321 \
//   UPSTASH_REDIS_REST_URL=http://127.0.0.1:9 UPSTASH_REDIS_REST_TOKEN=dummy npx next dev -p 3100
const { BASE_URL, withPage, seedCart, fillInquiryForm, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();

run('Upstash 連不上：詢價照常送出、寫入資料庫並寄信', () =>
  withPage(async (page) => {
    await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
    await seedCart(page);
    await page.goto(`${BASE_URL}/en/inquiry`);
    await page.getByText('1HV-11311-00').first().waitFor();

    await fillInquiryForm(page, { email: 'ratelimit-down@example.com' });
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith('/api/inquiry'), { timeout: 60000 }),
      page.click('button[type="submit"]')
    ]);
    assert(response.status() === 200, `API 回應 200（實際 ${response.status()}）`);
    await page.getByText('Inquiry successfully sent').waitFor();
    assert(true, '畫面顯示送出成功');

    const { tables, emails } = await mockState();
    const saved = (tables.inquiry_requests || []).filter((r) => r.customer_email === 'ratelimit-down@example.com');
    assert(saved.length === 1, `詢價單已寫入資料庫（${saved.length} 筆）`);
    assert(emails.length === 2, `寄出通知信與確認信（${emails.length} 封）`);
  })
);
