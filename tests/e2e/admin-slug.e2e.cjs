// E2E：後台分類／子分類的網址代號自動轉成小寫加連字號
// 使用模擬 Supabase（啟動方式同 admin-api-errors.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();

async function login(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, '分類');
}

const api = (page, method, url, body) =>
  page.evaluate(
    async ({ method, url, body }) => {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { status: res.status, body: await res.json() };
    },
    { method, url, body }
  );

run('大分類：輸入「Clutch Housing」離開欄位後自動變成 clutch-housing 並儲存', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page);
    const form = page.locator('form.admin-form', { hasText: '描述 (zh-TW)' });
    const slug = form.getByLabel('Slug (網址代號)');
    await slug.fill('Clutch Housing');
    await form.getByLabel('名稱 (zh-TW)').click();
    assert((await slug.inputValue()) === 'clutch-housing', `欄位自動轉換（${await slug.inputValue()}）`);
    await form.getByLabel('名稱 (zh-TW)').fill('離合器');
    await form.getByLabel('名稱 (zh-CN)').fill('离合器');
    await form.getByLabel('名稱 (en)').fill('Clutch Housing');
    await form.getByRole('button', { name: '新增大分類' }).click();
    await page.getByText(/成功/).first().waitFor({ timeout: 15000 });
    const { tables } = await mockState();
    assert(tables.categories.some((c) => c.slug === 'clutch-housing'), '資料庫存的是 clutch-housing');
    assert(!tables.categories.some((c) => c.slug === 'Clutch Housing'), '沒有存到含空白的代號');
  })
);

run('大分類：全是中文的代號被擋下並說明', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page);
    const form = page.locator('form.admin-form', { hasText: '描述 (zh-TW)' });
    await form.getByLabel('Slug (網址代號)').fill('離合器');
    await form.getByLabel('名稱 (zh-TW)').fill('離合器');
    await form.getByLabel('名稱 (zh-CN)').fill('离合器');
    await form.getByLabel('名稱 (en)').fill('Clutch');
    await form.getByRole('button', { name: '新增大分類' }).click();
    await page.getByText(/只能使用英文字母、數字與連字號/).waitFor({ timeout: 10000 });
  })
);

run('API 也會轉換：直接送出含空白大寫的代號，存入前先轉成標準格式；子分類的上層分類代號不變', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page);
    const cat = await api(page, 'POST', '/api/admin/categories', {
      slug: 'DRUM FORK', nameZhTw: '撥叉', nameZhCn: '拨叉', nameEn: 'Drum Fork', sortOrder: 0,
    });
    assert(cat.status === 200 || cat.status === 201, `新增大分類成功（${cat.status} ${JSON.stringify(cat.body)}）`);
    const sub = await api(page, 'POST', '/api/admin/sub-categories', {
      category: 'drum-fork', slug: 'Main Shaft', nameZhTw: '主軸', nameZhCn: '主轴', nameEn: 'Main shaft', sortOrder: 0,
    });
    assert(sub.status === 200 || sub.status === 201, `新增子分類成功（${sub.status} ${JSON.stringify(sub.body)}）`);
    const { tables } = await mockState();
    assert(tables.categories.some((c) => c.slug === 'drum-fork'), '大分類存成 drum-fork');
    assert(tables.sub_categories.some((s) => s.slug === 'main-shaft'), '子分類存成 main-shaft');
    const bad = await api(page, 'POST', '/api/admin/categories', { slug: '離合器', nameZhTw: 'a', nameZhCn: 'a', nameEn: 'a', sortOrder: 0 });
    assert(bad.status === 400, `沒有任何英數字的代號回應 400（${bad.status}）`);
  })
);
