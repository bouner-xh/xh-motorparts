// E2E（正式環境建置）：前台搜尋索引有快取，後台儲存產品後馬上清掉
// 1. 第一次搜尋建立索引；之後直接改資料庫（沒有經過後台）搜不到 → 證明有快取
// 2. 經過後台新增產品 → 快取被清掉，新舊產品都搜得到
// 使用模擬 Supabase；網站要用「next build + next start」啟動（開發模式不快取）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const SUB1 = '20000000-0000-4000-8000-000000000001';
const CAT1 = '10000000-0000-4000-8000-000000000001';

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });

async function models(page, query) {
  await page.goto(`${BASE_URL}/en/products/search?q=${encodeURIComponent(query)}`);
  await page.getByTestId('search-summary').waitFor();
  return (await page.locator('.product-card__title').allInnerTexts()).sort();
}

run('正式環境：搜尋索引有快取；經過後台儲存產品後馬上更新', () =>
  withPage(async (page) => {
    await resetMock();
    await page.goto(`${BASE_URL}/zh-TW/admin/login`);
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', PASSWORD);
    await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
    const create = (modelNumber) =>
      page.evaluate(
        async (body) => (await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).status,
        { category: 'cylinder', subCategoryId: SUB1, modelNumber, nameEn: `Cache part ${modelNumber}`, stockQuantity: 1, isActive: true }
      );

    assert((await create('CACHE-A')) === 200, '經過後台新增 CACHE-A');
    assert(JSON.stringify(await models(page, 'CACHE')) === JSON.stringify(['CACHE-A']), '第一次搜尋找到 CACHE-A（建立索引）');

    // 繞過後台直接寫資料庫：快取還沒清，搜尋看不到
    await seed('products', [
      { id: '30000000-0000-4000-8000-0000000009b1', category_id: CAT1, sub_category_id: SUB1, model_number: 'CACHE-B', name_i18n: { en: 'Cache part CACHE-B' }, stock_quantity: 1, specifications: [], is_active: true }
    ]);
    assert(JSON.stringify(await models(page, 'CACHE')) === JSON.stringify(['CACHE-A']), '直接改資料庫：搜尋仍用快取（看不到 CACHE-B）');

    // 經過後台儲存 → 清掉快取 → 新舊產品都搜得到
    assert((await create('CACHE-C')) === 200, '經過後台新增 CACHE-C');
    assert(JSON.stringify(await models(page, 'CACHE')) === JSON.stringify(['CACHE-A', 'CACHE-B', 'CACHE-C']), '後台儲存後快取更新，三個都找得到');
  })
);
