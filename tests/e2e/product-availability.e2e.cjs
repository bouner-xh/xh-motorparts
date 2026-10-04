// E2E：產品頁不公開精確庫存，改顯示「現貨／接單生產」（產品上架檢查 P3，2026-10-04 老闆決定）
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });

const productUrl = (locale, model) => `${BASE_URL}/${locale}/products/cylinder/std/${encodeURIComponent(model)}`;

async function jsonLdAvailability(page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const product = blocks.map((t) => JSON.parse(t)).find((d) => d['@type'] === 'Product');
  return product && product.offers && product.offers.availability;
}

run('有庫存顯示「現貨」，沒有庫存顯示「接單生產」，不顯示數字', () =>
  withPage(async (page) => {
    await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
    await seed('products', [
      {
        id: '30000000-0000-4000-8000-000000000901',
        category_id: '10000000-0000-4000-8000-000000000001',
        sub_category_id: '20000000-0000-4000-8000-000000000001',
        model_number: 'MTO-001',
        name_i18n: { 'zh-TW': '接單汽缸', 'zh-CN': '接单汽缸', en: 'Made Cylinder' },
        specifications: [],
        stock_quantity: 0,
        is_active: true
      }
    ]);

    // 1HV-11311-00 在模擬資料中庫存為 20
    await page.goto(productUrl('zh-TW', '1HV-11311-00'));
    await page.locator('h1').first().waitFor();
    let text = await page.locator('main').innerText();
    assert(text.includes('供貨狀態：現貨'), '有庫存：顯示「供貨狀態：現貨」');
    assert(!text.includes('庫存'), '沒有顯示「庫存：數字」');
    assert((await jsonLdAvailability(page)) === 'https://schema.org/InStock', '結構化資料為 InStock');

    await page.goto(productUrl('zh-TW', 'MTO-001'));
    await page.locator('h1').first().waitFor();
    text = await page.locator('main').innerText();
    assert(text.includes('供貨狀態：接單生產'), '沒有庫存：顯示「供貨狀態：接單生產」');
    assert((await jsonLdAvailability(page)) === 'https://schema.org/MadeToOrder', '結構化資料為 MadeToOrder（不是缺貨）');

    await page.goto(productUrl('en', 'MTO-001'));
    await page.locator('h1').first().waitFor();
    assert((await page.locator('main').innerText()).includes('Availability：Made to order'), '英文頁顯示 Made to order');
    await page.goto(productUrl('zh-CN', '1HV-11311-00'));
    await page.locator('h1').first().waitFor();
    assert((await page.locator('main').innerText()).includes('供货状态：现货'), '簡中頁顯示「供货状态：现货」');
  })
);
