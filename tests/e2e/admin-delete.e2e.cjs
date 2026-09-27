// E2E：刪除分類與產品（A5）
// - 大分類／子分類底下有產品時不能刪除，並清楚說明原因
// - 刪除大分類時提示子分類會一併刪除
// - 刪除產品、換圖後，沒有使用的圖檔會從 Storage 刪除
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const fs = require('node:fs');
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });
const EMPTY_CAT = '10000000-0000-4000-8000-000000000009';
const EMPTY_SUB = '20000000-0000-4000-8000-000000000009';
const CYLINDER_SUB = '20000000-0000-4000-8000-000000000001';
const JPG = fs.readFileSync('images/products/cylinder/cylinder-003.jpg').toString('base64');

async function login(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await page.locator('[data-testid="admin-product-form"]').waitFor({ timeout: 30000 });
}

function recordDialogs(page, accept = true) {
  const messages = [];
  page.on('dialog', (d) => {
    messages.push(d.message());
    return accept ? d.accept() : d.dismiss();
  });
  return messages;
}

// 在頁面中上傳一張圖並回傳網址
const uploadImage = (page, name) =>
  page.evaluate(
    async ({ base64, name }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const form = new FormData();
      form.append('file', new File([bytes], name, { type: 'image/jpeg' }));
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: form });
      return (await res.json()).imagePath;
    },
    { base64: JPG, name }
  );

const saveProduct = (page, method, body) =>
  page.evaluate(
    async ({ method, body }) => {
      const res = await fetch('/api/admin/products', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return res.json();
    },
    { method, body }
  );

run('有產品的大分類／子分類不能刪除，並說明原因', () =>
  withPage(async (page) => {
    await resetMock();
    const dialogs = recordDialogs(page);
    await login(page);

    const catRow = page.locator('tr', { hasText: 'cylinder' }).filter({ has: page.getByRole('button', { name: '刪除' }) }).first();
    await catRow.waitFor();
    const cells = await catRow.locator('td').allInnerTexts();
    assert(cells.includes('1') && cells.includes('2'), `大分類列表顯示子分類 1 個、產品 2 個（${cells.join(' | ')}）`);
    await catRow.getByRole('button', { name: '刪除' }).click();
    await page.getByText('「汽缸」底下還有 2 個產品').waitFor({ timeout: 10000 });
    assert(dialogs.length === 0, '有產品時不跳出確認視窗，直接說明原因');

    // 產品列表也會顯示子分類名稱，排除有「複製」按鈕的產品列
    const subRow = page
      .locator('tr', { hasText: '標準汽缸' })
      .filter({ has: page.getByRole('button', { name: '刪除' }) })
      .filter({ hasNot: page.getByRole('button', { name: '複製' }) });
    await subRow.getByRole('button', { name: '刪除' }).click();
    await page.getByText('「標準汽缸」底下還有 2 個產品').waitFor({ timeout: 10000 });

    const api = await page.evaluate(async () => {
      const res = await fetch('/api/admin/categories?id=10000000-0000-4000-8000-000000000001', { method: 'DELETE' });
      return { status: res.status, body: await res.json() };
    });
    assert(api.status === 409 && api.body.error.includes('還有 2 個產品'), `API 也拒絕並回傳中文說明（${api.status}）`);
    const { tables } = await mockState();
    assert(tables.categories.length === 2 && tables.sub_categories.length === 2, '資料沒有被刪除');
  })
);

run('刪除沒有產品的大分類：提示子分類會一併刪除，子分類列表同步更新', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('categories', [{ id: EMPTY_CAT, slug: 'empty', sort_order: 9, name_i18n: { 'zh-TW': '空分類' } }]);
    await seed('sub_categories', [{ id: EMPTY_SUB, category_id: EMPTY_CAT, slug: 'empty-sub', sort_order: 1, name_i18n: { 'zh-TW': '空子分類' } }]);
    const dialogs = recordDialogs(page);
    await login(page);

    await page.locator('tr', { hasText: '空子分類' }).waitFor();
    await page.locator('tr', { hasText: 'empty' }).filter({ hasText: '空分類' }).first().getByRole('button', { name: '刪除' }).click();
    await page.getByText('刪除成功').first().waitFor({ timeout: 10000 });
    assert(/確定刪除大分類「空分類」？底下的 1 個子分類會一併刪除/.test(dialogs[0] || ''), `確認訊息正確（${dialogs[0]}）`);
    await page.locator('tr', { hasText: '空子分類' }).waitFor({ state: 'detached', timeout: 10000 });
    assert(true, '子分類列表同步移除');
    const { tables } = await mockState();
    assert(!tables.categories.some((c) => c.id === EMPTY_CAT) && !tables.sub_categories.some((s) => s.id === EMPTY_SUB), '大分類與子分類都已刪除');
  })
);

run('換圖與刪除產品後，沒用到的圖檔從 Storage 刪除', () =>
  withPage(async (page) => {
    await resetMock();
    recordDialogs(page);
    await login(page);

    const first = await uploadImage(page, 'first.jpg');
    const second = await uploadImage(page, 'second.jpg');
    const base = { category: 'cylinder', subCategoryId: CYLINDER_SUB, modelNumber: 'IMG-001', nameZhTw: '圖', nameZhCn: '图', nameEn: 'Img' };
    const created = await saveProduct(page, 'POST', { ...base, imagePath: first });
    let state = await mockState();
    assert(state.storage.length === 2, `兩張圖都已上傳（${state.storage.length}）`);

    await saveProduct(page, 'PUT', { ...base, id: created.id, imagePath: second });
    state = await mockState();
    assert(!state.storage.some((p) => p.endsWith('first.jpg')), '換圖後舊圖已刪除');
    assert(state.storage.some((p) => p.endsWith('second.jpg')), '新圖保留');

    await page.getByRole('button', { name: '重新載入列表' }).click();
    await page.locator('tr', { hasText: 'IMG-001' }).getByRole('button', { name: '刪除' }).click();
    await page.getByText('產品已刪除').waitFor({ timeout: 10000 });
    state = await mockState();
    assert(!state.tables.products.some((p) => p.model_number === 'IMG-001'), '產品已刪除');
    assert(!state.tables.product_images.some((i) => i.product_id === created.id), '圖片紀錄一併刪除');
    assert(state.storage.length === 0, `圖檔已從 Storage 刪除（剩 ${state.storage.length}）`);
  })
);
