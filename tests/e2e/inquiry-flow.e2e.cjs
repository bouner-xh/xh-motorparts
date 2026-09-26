// E2E：買家送出 RFQ 詢價單（S1 / S5 相關）
// 請以開發模式執行（npx next dev -p 3100）。正式環境模式若未設定 Turnstile / Upstash，
// 會依 S4 設計停止收單（503），屬預期行為。
const { BASE_URL, withPage, seedCart, fillInquiryForm, assert, run } = require('./helpers.cjs');

run('詢價單可正常送出（含 HTML 字元的留言）', () =>
  withPage(async (page) => {
    await seedCart(page);
    await page.goto(`${BASE_URL}/en/inquiry`);
    await page.getByText('1HV-11311-00').first().waitFor();
    assert(true, '詢價清單顯示料號 1HV-11311-00');

    await fillInquiryForm(page, { message: '<a href="https://evil.example">click</a> need 3 pcs' });
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith('/api/inquiry')),
      page.click('button[type="submit"]')
    ]);
    assert(response.status() === 200, `API 回應 200（實際 ${response.status()}）`);

    await page.getByText('Inquiry successfully sent').waitFor();
    assert(true, '畫面顯示送出成功訊息');

    const stored = await page.evaluate(() => localStorage.getItem('xh_rfq_cart'));
    assert(stored === '[]' || stored === null, '送出成功後清空詢價清單');
  })
);
