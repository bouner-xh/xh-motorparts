// E2E：分類代號含空白或大寫時，分類、子分類、產品頁都能正常開啟（2026-10-06 正式站「CLUTCH HOUSING」等分類 404）
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });
const i18n = (tw, cn, en) => ({ 'zh-TW': tw, 'zh-CN': cn, en });
const CAT = '10000000-0000-4000-8000-000000000071';
const SUB = '20000000-0000-4000-8000-000000000071';

async function prepare() {
  await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
  await seed('categories', [{ id: CAT, slug: 'CLUTCH HOUSING', sort_order: 3, name_i18n: i18n('離合器系列', '离合器系列', 'Clutch Housing'), description_i18n: i18n('離合器外殼', '离合器外壳', 'Clutch housings') }]);
  await seed('sub_categories', [{ id: SUB, category_id: CAT, slug: 'Inner Plate', sort_order: 1, name_i18n: i18n('內片', '内片', 'Inner Plate') }]);
  await seed('products', [
    { id: '30000000-0000-4000-8000-000000000071', category_id: CAT, sub_category_id: SUB, model_number: 'CH-001', name_i18n: i18n('離合器內片', '离合器内片', 'Clutch Plate'), specifications: ['STD'], stock_quantity: 5, is_active: true }
  ]);
}

run('從產品目錄點含空白的分類 → 子分類 → 產品，每一頁都能開啟', () =>
  withPage(async (page) => {
    await prepare();
    await page.goto(`${BASE_URL}/zh-TW/products`);
    await Promise.all([page.waitForURL(/\/products\/CLUTCH%20HOUSING$/), page.locator('.category-card').getByRole('link', { name: '離合器系列' }).click()]);
    assert((await page.locator('h1').first().innerText()) === '離合器系列', '分類頁正常顯示');

    await Promise.all([page.waitForURL(/\/products\/CLUTCH%20HOUSING\/Inner%20Plate$/), page.locator('.card-grid').getByText('內片').click()]);
    assert((await page.locator('.product-card').count()) === 1, '子分類頁列出產品');

    await Promise.all([page.waitForURL(/\/CH-001$/), page.locator('.product-card').getByRole('link').first().click()]);
    assert((await page.locator('h1').first().innerText()).includes('CH-001'), '產品頁正常顯示');

    // 麵包屑與側欄連回分類
    const crumb = await page.locator('nav').getByRole('link', { name: '離合器系列' }).first().getAttribute('href');
    const res = await page.request.get(`${BASE_URL}${crumb}`);
    assert(res.status() === 200, `麵包屑的分類連結可以開啟（${crumb}，${res.status()}）`);
  })
);

run('sitemap 的分類、子分類、產品網址都能開啟；英文頁也正常', () =>
  withPage(async (page) => {
    await prepare();
    const xml = await (await page.request.get(`${BASE_URL}/sitemap.xml`)).text();
    const urls = [...xml.matchAll(/<loc>([^<]*CLUTCH[^<]*)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, BASE_URL));
    assert(urls.length === 9, `sitemap 列出分類、子分類、產品 × 3 種語言（${urls.length}）`);
    assert(urls.every((u) => !u.includes(' ')), '網址中的空白都有編碼');
    for (const url of urls) {
      const status = (await page.request.get(url)).status();
      assert(status === 200, `${url.replace(BASE_URL, '')} 可以開啟（${status}）`);
    }
  })
);
