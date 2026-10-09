// E2E：型號一律存成大寫；不分大小寫比對重複；批量匯入不會因大小寫重複建立產品（老闆決定「型號自動轉大寫」）
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });
const CYLINDER = '10000000-0000-4000-8000-000000000001';
const SUB = '20000000-0000-4000-8000-000000000001';
const LEGACY_ID = '30000000-0000-4000-8000-0000000000d1';
const legacy = (id, model) => ({ id, category_id: CYLINDER, sub_category_id: SUB, model_number: model, name_i18n: { en: `Legacy ${model}` }, stock_quantity: 1, specifications: [], is_active: false });

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

const api = (page, method, url, body) =>
  page.evaluate(
    async ({ method, url, body }) => {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { status: res.status, body: await res.json() };
    },
    { method, url, body }
  );

run('表單：輸入小寫型號，離開欄位自動轉大寫，存入資料庫也是大寫', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openProductForm(page);
    await form.getByLabel('子分類').selectOption(SUB);
    const model = form.getByLabel('型號');
    await model.fill(' ab-123x ');
    await form.getByLabel('名稱（en）').click();
    assert((await model.inputValue()) === 'AB-123X', `欄位自動轉大寫（${await model.inputValue()}）`);
    await form.getByLabel('名稱（en）').fill('Test part');
    await form.getByRole('button', { name: '新增產品' }).click();
    await page.getByText('產品新增成功').waitFor({ timeout: 30000 });
    const { tables } = await mockState();
    assert(tables.products.some((p) => p.model_number === 'AB-123X'), '資料庫存的是 AB-123X');
    assert(!tables.products.some((p) => p.model_number === 'ab-123x'), '沒有小寫型號');
  })
);

run('API：不分大小寫比對重複型號；舊的小寫型號重存會改成大寫且不跳「改型號」確認', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('products', [legacy(LEGACY_ID, 'legacy-1')]);
    const form = await openProductForm(page);
    const base = { category: 'cylinder', subCategoryId: SUB, nameZhTw: '', nameZhCn: '', nameEn: 'X' };

    const dup = await api(page, 'POST', '/api/admin/products', { ...base, modelNumber: 'LEGACY-1' });
    assert(dup.status === 409 && dup.body.error.includes('已經存在'), `大寫新增撞到舊的小寫型號 → 409（${dup.status} ${dup.body.error}）`);
    const dup2 = await api(page, 'POST', '/api/admin/products', { ...base, modelNumber: '1hv-11311-00' });
    assert(dup2.status === 409, `小寫新增撞到既有大寫型號 → 409（${dup2.status}）`);

    // 編輯舊的小寫型號，只改名稱：型號改存成大寫，不跳確認
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); return d.accept(); });
    await page.getByRole('row', { name: /legacy-1/ }).getByRole('button', { name: '編輯' }).click();
    await form.getByLabel('名稱（en）').fill('Legacy renamed');
    await form.getByRole('button', { name: '更新產品' }).click();
    await page.getByText('產品更新成功').waitFor({ timeout: 30000 });
    assert(dialogs.length === 0, `大小寫不同不算改型號，沒有跳確認（${dialogs.length}）`);
    const { tables } = await mockState();
    const row = tables.products.find((p) => p.id === LEGACY_ID);
    assert(row.model_number === 'LEGACY-1' && row.name_i18n.en === 'Legacy renamed', `型號改存成大寫、名稱已更新（${row.model_number}）`);
  })
);

run('批量匯入：小寫的舊產品被更新（改存成大寫），不會重複建立', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('products', [legacy(LEGACY_ID, 'legacy-2')]);
    await openProductForm(page);
    const res = await api(page, 'POST', '/api/admin/products/batch', {
      products: [{ categorySlug: 'cylinder', subCategorySlug: 'std', modelNumber: 'legacy-2', nameI18n: { en: 'Imported name' }, isActive: false }]
    });
    assert(res.status === 200 && res.body.results?.[0]?.success, `匯入成功（${JSON.stringify(res.body).slice(0, 160)}）`);
    const { tables } = await mockState();
    const matches = tables.products.filter((p) => p.model_number.toUpperCase() === 'LEGACY-2');
    assert(matches.length === 1, `只有一筆（${matches.length}）`);
    assert(matches[0].id === LEGACY_ID && matches[0].model_number === 'LEGACY-2' && matches[0].name_i18n.en === 'Imported name', '同一筆被更新並改存成大寫');
  })
);
