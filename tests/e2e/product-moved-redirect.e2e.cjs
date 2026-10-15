// E2E：子分類改過代號、被刪除或產品搬家後，舊網址自動 308 轉到現在的網址（不再 404）
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const migrate = () => fetch(`${MOCK_URL}/__mock/migrate-url-key`, { method: 'POST' });

async function login(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
}

const api = (page, method, url, body) =>
  page.evaluate(
    async ({ method, url, body }) => {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: res.status, body: await res.json() };
    },
    { method, url, body }
  );

const hop = async (page, path) => {
  const res = await page.request.get(`${BASE_URL}${path}`, { maxRedirects: 0 });
  return { status: res.status(), location: res.headers().location || '' };
};

async function scenario(page) {
  await login(page);
  // 子分類 old-sub 底下有產品；之後把 old-sub 改名成 new-sub（代號改了）
  const sub = await api(page, 'POST', '/api/admin/sub-categories', { category: 'cylinder', slug: 'old-sub', nameZhTw: '舊', nameZhCn: '旧', nameEn: 'Old' });
  const prod = await api(page, 'POST', '/api/admin/products', { category: 'cylinder', subCategoryId: sub.body.id, modelNumber: 'DT125-2A6-16150-00', nameEn: 'Cover', stockQuantity: 1, isActive: true });
  assert(prod.status === 200, `新增產品（${prod.status}）`);
  assert((await hop(page, '/zh-TW/products/cylinder/old-sub/DT125-2A6-16150-00')).status === 200, '改名前網址正常');
  const rename = await api(page, 'PUT', '/api/admin/sub-categories', { id: sub.body.id, category: 'cylinder', slug: 'new-sub', nameZhTw: '新', nameZhCn: '新', nameEn: 'New' });
  assert(rename.status === 200, '子分類改代號');

  // 舊網址（含小寫型號）一次轉到現在的正確網址
  for (const old of ['/zh-TW/products/cylinder/old-sub/DT125-2A6-16150-00', '/zh-TW/products/cylinder/OLD-SUB/dt125-2a6-16150-00']) {
    const r = await hop(page, old);
    assert(r.status === 308 && r.location.endsWith('/zh-TW/products/cylinder/new-sub/DT125-2A6-16150-00'), `${old} → 308 新網址（${r.status} ${r.location}）`);
  }
  assert((await hop(page, '/zh-TW/products/cylinder/new-sub/DT125-2A6-16150-00')).status === 200, '新網址正常');

  // 產品在別的子分類底下：用另一個存在的子分類的網址也會轉過來（不會同一產品兩個網址都 200）
  const r2 = await hop(page, '/zh-TW/products/cylinder/std/DT125-2A6-16150-00');
  assert(r2.status === 308 && r2.location.endsWith('/cylinder/new-sub/DT125-2A6-16150-00'), `錯誤的子分類 → 308（${r2.status} ${r2.location}）`);

  // 找不到的型號仍然是 404
  assert((await hop(page, '/zh-TW/products/cylinder/old-sub/NOT-EXIST')).status === 404, '不存在的型號仍是 404');
  assert((await hop(page, '/zh-TW/products/cylinder/old-sub')).status === 404, '只有舊子分類（沒有型號）無法判斷，仍是 404');
}

run('資料庫還沒執行更新語法：子分類改代號後，舊網址轉到新網址', () =>
  withPage(async (page) => {
    await resetMock();
    await scenario(page);
  })
);

run('型號可重複（網址代號）之後：同樣會轉址', () =>
  withPage(async (page) => {
    await resetMock();
    await migrate();
    await scenario(page);
  })
);
