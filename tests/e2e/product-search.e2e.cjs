// E2E：前台產品搜尋（產品上架檢查 P2，2026-10-04）
// 料號（忽略大小寫與連字號）、名稱、規格都能搜；只列出已上架產品；查無結果時提供聯絡方式；手機可用
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });

async function prepare() {
  await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
  await seed('products', [
    {
      id: '30000000-0000-4000-8000-000000000951',
      category_id: '10000000-0000-4000-8000-000000000001',
      sub_category_id: '20000000-0000-4000-8000-000000000001',
      model_number: 'HIDE-001',
      name_i18n: { 'zh-TW': '未上架汽缸', 'zh-CN': '未上架汽缸', en: 'Hidden Cylinder' },
      specifications: [],
      stock_quantity: 1,
      is_active: false
    }
  ]);
}

const cards = (page) => page.locator('.product-card');

async function search(page, query) {
  const box = page.getByRole('searchbox', { name: '搜尋產品' }).first();
  await box.fill(query);
  await Promise.all([page.waitForURL(/\/products\/search\?q=/), box.press('Enter')]);
  await page.getByTestId('search-summary').waitFor();
}

run('從產品目錄搜尋料號：不分大小寫與連字號，點結果進入產品頁', () =>
  withPage(async (page) => {
    await prepare();
    await page.goto(`${BASE_URL}/zh-TW/products`);
    await search(page, '1hv11311');
    assert((await page.getByTestId('search-summary').innerText()).includes('共 1 項產品'), '找到 1 項');
    assert((await cards(page).first().innerText()).includes('1HV-11311-00'), '結果為 1HV-11311-00');
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    assert(/noindex/.test(robots || ''), '搜尋結果頁不給搜尋引擎收錄');

    await Promise.all([page.waitForURL(/\/products\/cylinder\/std\/1HV-11311-00$/), cards(page).first().getByRole('link').first().click()]);
    assert((await page.locator('h1').first().innerText()).includes('1HV-11311-00'), '點結果進入正確的產品頁');
  })
);

run('名稱、規格都能搜；未上架產品搜不到；查無結果時提供聯絡方式', () =>
  withPage(async (page) => {
    await prepare();
    await page.goto(`${BASE_URL}/zh-TW/products/cylinder`);
    await search(page, '汽缸本體');
    assert((await cards(page).count()) === 2, `名稱搜尋找到 2 項（${await cards(page).count()}）`);

    await search(page, '52mm');
    const text = await cards(page).allInnerTexts();
    assert(text.length === 1 && text[0].includes('5TJ-11311-00'), '規格搜尋找到 5TJ-11311-00');

    await search(page, 'HIDE-001');
    assert((await cards(page).count()) === 0, '未上架產品搜不到');
    assert(await page.getByText(/找不到「HIDE-001」相關的產品.*sales@xh-motorparts\.com/).isVisible(), '查無結果時提供業務信箱');
  })
);

run('英文頁與手機版', () =>
  withPage(
    async (page) => {
      await prepare();
      await page.goto(`${BASE_URL}/en/products`);
      const box = page.getByRole('searchbox', { name: 'Search products' }).first();
      assert(await box.isVisible(), '手機版產品目錄看得到搜尋框');
      await box.fill('cylinder body b');
      await Promise.all([page.waitForURL(/\/en\/products\/search\?q=/), page.getByRole('button', { name: 'Search' }).first().click()]);
      await page.getByTestId('search-summary').waitFor();
      assert((await page.getByTestId('search-summary').innerText()).includes('2 products for'), '英文頁顯示結果數量');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(overflow <= 0, `手機版沒有橫向捲動（${overflow}px）`);
    },
    { viewport: { width: 390, height: 844 } }
  )
);
