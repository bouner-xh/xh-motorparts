// E2E：產品名稱以英文為主（P5）— 英文必填，繁中、簡中選填，沒填時前台顯示英文名稱
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const CYLINDER_SUB = '20000000-0000-4000-8000-000000000001';

async function openProductForm(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, '產品');
  const form = page.locator('[data-testid="admin-product-form"]');
  await form.waitFor({ timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="admin-product-form"] select').value !== '');
  return form;
}

run('只填英文名稱就能新增；繁中、簡中頁顯示英文名稱', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openProductForm(page);
    await form.getByLabel('子分類').selectOption(CYLINDER_SUB);
    await form.getByLabel('型號').fill('EN-ONLY-1');
    await form.getByLabel('名稱（en）').fill('Counter Shaft Gear');
    await form.getByLabel('上架').check();
    await form.getByLabel('上傳主圖').waitFor();
    page.once('dialog', (d) => d.accept()); // 沒有圖片的上架提醒
    await form.getByRole('button', { name: '新增產品' }).click();
    await page.getByText('產品新增成功').waitFor({ timeout: 30000 });

    const { tables } = await mockState();
    const product = tables.products.find((p) => p.model_number === 'EN-ONLY-1');
    assert(product && product.name_i18n.en === 'Counter Shaft Gear', '英文名稱已存入');
    assert(!('zh-TW' in product.name_i18n) && !('zh-CN' in product.name_i18n), '沒填的語言不存空字串');

    const row = page.getByRole('row', { name: /EN-ONLY-1/ });
    assert((await row.innerText()).includes('Counter Shaft Gear'), '後台列表的名稱欄顯示英文名稱（沒有繁中時）');

    for (const loc of ['zh-TW', 'zh-CN', 'en']) {
      await page.goto(`${BASE_URL}/${loc}/products/cylinder/std/EN-ONLY-1`);
      await page.locator('h1').first().waitFor();
      const h1 = await page.locator('h1').first().innerText();
      assert(h1.includes('EN-ONLY-1') || (await page.locator('main').innerText()).includes('Counter Shaft Gear'), `${loc} 產品頁顯示英文名稱`);
    }
  })
);

run('沒有英文名稱：表單與 API 都擋下並說明', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openProductForm(page);
    await form.getByLabel('子分類').selectOption(CYLINDER_SUB);
    await form.getByLabel('型號').fill('NO-EN-1');
    await form.getByLabel('名稱（zh-TW）').fill('只有中文');
    await form.getByRole('button', { name: '新增產品' }).click();
    await page.getByText('名稱（en）不可為空').waitFor({ timeout: 10000 });

    const res = await page.evaluate(async (sub) => {
      const r = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'cylinder', subCategoryId: sub, modelNumber: 'NO-EN-2', nameZhTw: '只有中文', nameZhCn: '', nameEn: '' })
      });
      return { status: r.status, body: await r.json() };
    }, CYLINDER_SUB);
    assert(res.status === 400 && res.body.error.includes('名稱（en）不可為空'), `API 回應 400（${res.body.error}）`);
    const { tables } = await mockState();
    assert(!tables.products.some((p) => p.model_number.startsWith('NO-EN')), '沒有新增任何產品');
  })
);
