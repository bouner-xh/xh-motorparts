// E2E：連結裡不再包按鈕，鍵盤只需一次 Tab（D11）
// 啟動網站：npx next dev -p 3100
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const PAGES = ['/zh-TW', '/zh-TW/about', '/zh-TW/contact', '/zh-TW/products', '/zh-TW/products/cylinder', '/zh-TW/inquiry'];

run('沒有 <a> 內含 <button>，首頁主按鈕可正常操作', () =>
  withPage(async (page) => {
    for (const path of PAGES) {
      await page.goto(`${BASE_URL}${path}`);
      const nested = await page.locator('a button, button a').count();
      assert(nested === 0, `${path} 沒有連結與按鈕互相包住的結構`);
    }

    await page.goto(`${BASE_URL}/zh-TW`);
    const stops = await page.locator('.hero__actions').evaluate((el) =>
      [...el.querySelectorAll('a[href], button, [tabindex]')].filter((n) => n.tabIndex >= 0).length
    );
    assert(stops === 2, `Hero 區兩個按鈕只有 2 個 Tab 停留點（${stops}）`);

    const cta = page.locator('.hero__actions a.button-primary');
    await cta.focus();
    await Promise.all([page.waitForURL(`${BASE_URL}/zh-TW/products`), page.keyboard.press('Enter')]);
    assert(true, '用鍵盤 Enter 可以進入產品目錄');
  })
);
