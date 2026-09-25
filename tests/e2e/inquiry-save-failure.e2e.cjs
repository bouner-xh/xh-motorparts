// E2E：資料庫寫入失敗時，不可告訴客戶「送出成功」（S5）
// 以無法連線的 Supabase 位址模擬資料庫故障，且不設定 Resend：
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy \
//   SUPABASE_SERVICE_ROLE_KEY=dummy npx next dev -p 3100
const { BASE_URL, withPage, seedCart, fillInquiryForm, assert, run } = require('./helpers.cjs');

run('資料庫故障時顯示失敗並保留詢價清單', () =>
  withPage(async (page) => {
    await seedCart(page);
    await page.goto(`${BASE_URL}/en/inquiry`);
    await page.getByText('1HV-11311-00').first().waitFor();

    await fillInquiryForm(page);
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith('/api/inquiry'), { timeout: 60000 }),
      page.click('button[type="submit"]')
    ]);
    assert(response.status() === 500, `API 回應 500（實際 ${response.status()}）`);

    await page.getByText('詢價單暫時無法送出').waitFor();
    assert(true, '畫面顯示失敗訊息與替代聯絡方式');
    assert((await page.getByText('Inquiry successfully sent').count()) === 0, '沒有顯示送出成功');

    const stored = JSON.parse((await page.evaluate(() => localStorage.getItem('xh_rfq_cart'))) || '[]');
    assert(stored.length === 1, '詢價清單仍保留，客戶可以重送');
  })
);
