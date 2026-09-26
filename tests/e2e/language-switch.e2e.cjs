// E2E：切換語系時停留在同一頁（D6）
// 使用模擬 Supabase 的範例產品（啟動方式同 product-card-inquiry.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const cases = [
  ['/zh-TW/products/cylinder/std/1HV-11311-00', 'EN', '/en/products/cylinder/std/1HV-11311-00'],
  ['/en/products/cylinder/std', '简中', '/zh-CN/products/cylinder/std'],
  ['/zh-CN/about', '繁中', '/zh-TW/about'],
  ['/zh-TW', 'EN', '/en']
];

run('切換語系保留目前頁面', () =>
  withPage(async (page) => {
    for (const [from, label, to] of cases) {
      await page.goto(`${BASE_URL}${from}`);
      await Promise.all([
        page.waitForURL(`${BASE_URL}${to}`, { timeout: 30000 }),
        page.locator('nav.nav').getByRole('link', { name: label, exact: true }).click()
      ]);
      assert(new URL(page.url()).pathname === to, `${from} 點「${label}」→ ${to}`);
    }
    await page.goto(`${BASE_URL}/en/products/cylinder/std/1HV-11311-00`);
    await page.getByText('1HV-11311-00').first().waitFor();
    assert(true, '切換後的產品頁正常顯示同一個料號');
  })
);
