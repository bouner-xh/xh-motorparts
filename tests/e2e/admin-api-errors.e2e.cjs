// E2E：後台 API 的輸入檢查與錯誤訊息（A9）
// 錯誤以中文說明、不顯示資料庫原始訊息；ID 與長度檢查；不存在的分類不會被自動建立
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const CYLINDER_SUB = '20000000-0000-4000-8000-000000000001';
const RAW_DB_TEXT = /duplicate key|constraint|violates|PGRST|relation/i;

async function login(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, '產品');
  await page.locator('[data-testid="admin-product-form"]').waitFor({ timeout: 30000 });
}

const api = (page, method, url, body) =>
  page.evaluate(
    async ({ method, url, body }) => {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      return { status: res.status, body: await res.json() };
    },
    { method, url, body }
  );

run('大分類代號重複：畫面顯示中文說明，不顯示資料庫原始訊息', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page);
    await openAdminTab(page, '分類');
    const form = page.locator('form.admin-form', { hasText: '描述 (zh-TW)' });
    await form.getByLabel('Slug (網址代號)').fill('cylinder');
    await form.getByLabel('名稱 (zh-TW)').fill('重複');
    await form.getByLabel('名稱 (zh-CN)').fill('重复');
    await form.getByLabel('名稱 (en)').fill('Dup');
    await form.getByRole('button', { name: '新增大分類' }).click();
    const message = page.getByText(/資料重複/);
    await message.waitFor({ timeout: 10000 });
    const body = await page.locator('body').innerText();
    assert(!RAW_DB_TEXT.test(body), '畫面沒有資料庫原始錯誤');
  })
);

run('產品 API：不存在的分類不會被自動建立、長度與 ID 檢查', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page);
    const base = { subCategoryId: CYLINDER_SUB, modelNumber: 'E-1', nameZhTw: 'a', nameZhCn: 'a', nameEn: 'a' };

    const unknown = await api(page, 'POST', '/api/admin/products', { ...base, category: 'no-such-category' });
    assert(unknown.status === 400 && unknown.body.error.includes('找不到這個大分類'), `不存在的分類回應 400（${unknown.status}）`);
    const { tables } = await mockState();
    assert(!tables.categories.some((c) => c.slug === 'no-such-category'), '沒有自動建立空白分類');

    const tooLong = await api(page, 'POST', '/api/admin/products', { ...base, category: 'cylinder', nameZhTw: 'x'.repeat(201) });
    assert(tooLong.status === 400 && tooLong.body.error.includes('名稱（zh-TW）太長（最多 200 字）'), `名稱超過 200 字回應 400，並指出欄位（${tooLong.body.error}）`);

    const dup = await api(page, 'POST', '/api/admin/products', { ...base, category: 'cylinder', modelNumber: '1HV-11311-00' });
    assert(dup.status === 409 && dup.body.error.includes('型號「1HV-11311-00」已經存在') && !RAW_DB_TEXT.test(dup.body.error), `型號重複回應 409，並指出型號（${dup.body.error}）`);

    for (const url of ['/api/admin/products?id=abc', '/api/admin/categories?id=abc', '/api/admin/sub-categories?id=abc']) {
      const res = await api(page, 'DELETE', url);
      assert(res.status === 400 && res.body.error.includes('資料編號格式不正確'), `${url} 回應 400`);
    }
  })
);

run('批量匯入：資料庫錯誤以中文列出', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page);
    // 子分類代號 std 已屬於汽缸，放到鏈條底下會違反唯一值
    const res = await api(page, 'POST', '/api/admin/products/batch', {
      products: [{ categorySlug: 'chain', subCategorySlug: 'std', modelNumber: 'B-1', nameI18n: { 'zh-TW': '甲' }, isActive: true }],
    });
    assert(res.status === 200, `API 回應 200（${res.status}）`);
    const row = res.body.results[0];
    assert(!row.success && row.error.includes('建立子分類失敗') && row.error.includes('資料重複'), `錯誤說明（${row.error}）`);
    assert(!RAW_DB_TEXT.test(row.error), '不含資料庫原始訊息');

    const tooMany = await api(page, 'POST', '/api/admin/products/batch', {
      products: Array.from({ length: 101 }, (_, i) => ({ categorySlug: 'c', subCategorySlug: 's', modelNumber: `M-${i}`, isActive: true })),
    });
    assert(tooMany.status === 400 && tooMany.body.error.includes('每次最多 100 筆'), `超過 100 筆回應 400（${tooMany.status}）`);
  })
);
