// E2E：後台產品的大分類與子分類保持一致（A3）
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const CHAIN_ID = '10000000-0000-4000-8000-000000000002';
const CYLINDER_SUB_ID = '20000000-0000-4000-8000-000000000001';
const CHAIN_SUB_ID = '20000000-0000-4000-8000-000000000002';

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

async function fillNames(form, model) {
  await form.getByLabel('型號').fill(model);
  await form.getByLabel('名稱（zh-TW）').fill(`${model} 名稱`);
  await form.getByLabel('名稱（zh-CN）').fill(`${model} 名称`);
  await form.getByLabel('名稱（en）').fill(`${model} name`);
}

run('連續新增：保留分類與子分類，其他欄位清空', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openProductForm(page);
    await form.getByLabel('子分類').selectOption({ label: '標準汽缸 (std)' });
    await fillNames(form, 'SEQ-001');
    await form.getByRole('button', { name: '新增產品' }).click();
    await page.getByText('產品新增成功').waitFor({ timeout: 30000 });

    assert((await form.locator('select').first().inputValue()) === 'cylinder', '新增後大分類仍為汽缸');
    assert((await form.getByLabel('子分類').inputValue()) === CYLINDER_SUB_ID, '新增後子分類仍為標準汽缸');
    assert((await form.getByLabel('型號').inputValue()) === '', '新增後型號已清空');

    await fillNames(form, 'SEQ-002');
    await form.getByRole('button', { name: '新增產品' }).click();
    await page.locator('tr', { hasText: 'SEQ-002' }).waitFor({ timeout: 30000 });
    const saved = (await mockState()).tables.products.find((p) => p.model_number === 'SEQ-002');
    assert(saved && saved.sub_category_id === CYLINDER_SUB_ID, '不用重選分類即可新增第二筆');
  })
);

run('編輯時切換大分類：子分類自動清空，必須重選', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openProductForm(page);
    await page.locator('tr', { hasText: '1HV-11311-00' }).getByRole('button', { name: '編輯' }).click();
    await form.locator('select').first().selectOption('chain');
    assert((await form.getByLabel('子分類').inputValue()) === '', '切換大分類後子分類清空');

    await form.getByRole('button', { name: '更新產品' }).click();
    await page.getByText(/子分類不可為空/).waitFor({ timeout: 10000 });
    assert(true, '未重選子分類時無法儲存');

    await form.getByLabel('子分類').selectOption(CHAIN_SUB_ID);
    await form.getByRole('button', { name: '更新產品' }).click();
    await page.getByText('產品更新成功').waitFor({ timeout: 30000 });
    const product = (await mockState()).tables.products.find((p) => p.model_number === '1HV-11311-00');
    assert(product.category_id === CHAIN_ID && product.sub_category_id === CHAIN_SUB_ID, '大分類與子分類一起更新為鏈條');
  })
);

run('API 拒絕子分類與大分類不符的資料', () =>
  withPage(async (page) => {
    await resetMock();
    await openProductForm(page);
    const result = await page.evaluate(async (subId) => {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'chain', subCategoryId: subId, modelNumber: 'BAD-001', nameZhTw: 'a', nameZhCn: 'a', nameEn: 'a' }),
      });
      return { status: res.status, body: await res.json() };
    }, CYLINDER_SUB_ID);
    assert(result.status === 400, `回應 400（${result.status}）`);
    const saved = (await mockState()).tables.products.find((p) => p.model_number === 'BAD-001');
    assert(!saved, '資料沒有寫入');
  })
);
