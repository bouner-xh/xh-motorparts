// E2E：每頁只有一個 H1，而且是該頁的主標題，不是公司名稱（D10）
// 使用模擬 Supabase 的範例產品（啟動方式同 product-card-inquiry.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const cases = [
  ['/zh-TW/products', '產品目錄'],
  ['/zh-TW/products/cylinder', '汽缸'],
  ['/zh-TW/products/cylinder/std', '標準汽缸'],
  ['/zh-TW/products/cylinder/std/1HV-11311-00', '1HV-11311-00'],
  ['/zh-TW/contact', null],
  ['/zh-TW/about', null],
  ['/zh-TW/legal/privacy', null],
  ['/zh-TW/inquiry', null],
  ['/zh-TW', null],
  ['/zh-TW/admin/login', null]
];

run('每頁一個 H1，內容為該頁主標題', () =>
  withPage(async (page) => {
    for (const [path, expected] of cases) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
      const h1s = await page.locator('h1').allTextContents();
      assert(h1s.length === 1, `${path} 只有一個 H1（${h1s.length} 個）`);
      assert(!h1s[0].includes('協皇企業有限公司'), `${path} 的 H1 不是公司名稱：「${h1s[0].trim().slice(0, 30)}」`);
      if (expected) assert(h1s[0].trim() === expected, `${path} 的 H1 為「${expected}」`);
    }
    await page.goto(`${BASE_URL}/zh-TW`);
    assert((await page.locator('.brand-name').textContent()).includes('協皇企業有限公司'), '標頭仍顯示公司名稱');
  })
);
