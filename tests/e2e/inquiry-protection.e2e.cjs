// E2E：正式環境缺少防護設定時停止收單（S4）
// 需以正式環境模式執行（next build && next start）：
//   情境 A（缺設定）：不設定 Turnstile / Upstash → E2E_EXPECT=blocked
//   情境 B（設定齊全）：設定四個變數（可用假值）→ E2E_EXPECT=allowed
//     NEXT_PUBLIC_TURNSTILE_SITE_KEY、TURNSTILE_SECRET_KEY、UPSTASH_REDIS_REST_URL、UPSTASH_REDIS_REST_TOKEN
const { BASE_URL, withPage, seedCart, fillInquiryForm, assert, run } = require('./helpers.cjs');

const expectBlocked = (process.env.E2E_EXPECT || 'blocked') === 'blocked';

if (expectBlocked) {
  run('正式環境缺少防護設定：停止收單並保留清單', () =>
    withPage(async (page) => {
      await seedCart(page);
      await page.goto(`${BASE_URL}/en/inquiry`);
      await page.getByText('1HV-11311-00').first().waitFor();
      await fillInquiryForm(page);
      const [response] = await Promise.all([
        page.waitForResponse((res) => res.url().endsWith('/api/inquiry')),
        page.click('button[type="submit"]')
      ]);
      assert(response.status() === 503, `API 回應 503（實際 ${response.status()}）`);
      await page.getByText('詢價服務暫時無法使用').waitFor();
      assert(true, '畫面顯示暫停服務與替代聯絡方式');
      const stored = JSON.parse((await page.evaluate(() => localStorage.getItem('xh_rfq_cart'))) || '[]');
      assert(stored.length === 1, '詢價清單保留，客戶稍後可以重送');
    })
  );
} else {
  run('正式環境設定齊全：防護檢查放行（進入驗證流程）', () =>
    withPage(async (page) => {
      await page.goto(`${BASE_URL}/en`);
      const res = await page.request.post(`${BASE_URL}/api/inquiry`, {
        data: {
          name: 'E2E', email: 'buyer@example.com', companyName: 'E2E Co', country: 'VN',
          items: [{ productId: 'p1', modelNumber: '1HV-11311-00', quantity: 1 }], turnstileToken: ''
        }
      });
      assert(res.status() !== 503, `沒有被防護檢查擋下（實際 ${res.status()}，後續由 Turnstile / 限流處理）`);
    })
  );
}
