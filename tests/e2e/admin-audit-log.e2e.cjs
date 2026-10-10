// E2E：後台操作紀錄（U10）
// 產品、分類、子分類、車型、批量匯入的新增／修改／刪除／排序都會記下「哪個帳號做了什麼」（含改前改後）；
// 「操作紀錄」分頁顯示完整信箱並可篩選；紀錄寫不進去時不擋原本的操作
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const post = (path, body) => fetch(`${MOCK_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const P1 = '30000000-0000-4000-8000-000000000001';
const CAT1 = '10000000-0000-4000-8000-000000000001';
const SUB1 = '20000000-0000-4000-8000-000000000001';

async function login(page, tab) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  if (tab) await openAdminTab(page, tab);
}

const api = (page, method, url, body) =>
  page.evaluate(
    async ({ method, url, body }) => {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: res.status, body: await res.json() };
    },
    { method, url, body }
  );

const logs = async () => (await mockState()).tables.admin_audit_log || [];

const productBody = (extra = {}) => ({ category: 'cylinder', subCategoryId: SUB1, modelNumber: 'AUD-001', nameEn: 'Audit Part', stockQuantity: 5, isActive: true, ...extra });

run('產品新增、修改、刪除：記下帳號與改前改後；沒有變更不留紀錄', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page);
    const created = await api(page, 'POST', '/api/admin/products', productBody());
    assert(created.status === 200, `新增產品（${created.status}）`);
    let rows = await logs();
    assert(rows.length === 1 && rows[0].action === 'create' && rows[0].entity_type === 'product', '新增留下一筆紀錄');
    assert(rows[0].actor_email === 'admin@example.com', `記下完整信箱（${rows[0].actor_email}）`);
    assert(rows[0].entity_label === 'AUD-001' && rows[0].entity_id === created.body.id, '記下型號與編號');
    assert(rows[0].changes['型號']?.[1] === 'AUD-001' && rows[0].changes['庫存']?.[1] === '5', '新增內容有記下');

    // 沒改任何東西 → 不留紀錄
    const same = await api(page, 'PUT', '/api/admin/products', productBody({ id: created.body.id }));
    assert(same.status === 200, '沒改內容也能儲存');
    assert((await logs()).length === 1, '沒有變更不產生紀錄');

    const changed = await api(page, 'PUT', '/api/admin/products', productBody({ id: created.body.id, stockQuantity: 9, isActive: false, oemNumbers: ['a-1'] }));
    assert(changed.status === 200, `修改產品（${JSON.stringify(changed.body)}）`);
    rows = await logs();
    assert(rows.length === 2 && rows[1].action === 'update', '修改留下一筆紀錄');
    assert(JSON.stringify(rows[1].changes['庫存']) === JSON.stringify(['5', '9']), `庫存 5 → 9（${JSON.stringify(rows[1].changes)}）`);
    assert(JSON.stringify(rows[1].changes['上架']) === JSON.stringify(['是', '否']), '上架 是 → 否');
    assert(rows[1].changes['OEM／對照料號']?.[1] === 'A-1', '對照料號變更有記下');
    assert(!('型號' in rows[1].changes), '沒變的欄位不記');

    const del = await api(page, 'DELETE', `/api/admin/products?id=${created.body.id}`);
    assert(del.status === 200, '刪除產品');
    rows = await logs();
    assert(rows.length === 3 && rows[2].action === 'delete' && rows[2].entity_label === 'AUD-001', '刪除留下紀錄，並保留型號快照');
    assert(rows[2].changes['型號']?.[0] === 'AUD-001', '刪除前的內容有記下');
  })
);

run('分類、子分類、車型、排序與批量匯入都有紀錄', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page);
    const cat = await api(page, 'POST', '/api/admin/categories', { slug: 'brake', nameZhTw: '煞車', nameZhCn: '刹车', nameEn: 'Brake', sortOrder: 5 });
    assert(cat.status === 200, '新增大分類');
    await api(page, 'PUT', '/api/admin/categories', { id: cat.body.id, slug: 'brake', nameZhTw: '煞車系統', nameZhCn: '刹车', nameEn: 'Brake', sortOrder: 5 });
    const sub = await api(page, 'POST', '/api/admin/sub-categories', { category: 'brake', slug: 'pad', nameZhTw: '來令片', nameZhCn: '来令片', nameEn: 'Pad', sortOrder: 1 });
    assert(sub.status === 200, '新增子分類');
    await api(page, 'PUT', '/api/admin/sub-categories', [{ id: sub.body.id, sortOrder: 3 }]);
    await api(page, 'PUT', '/api/admin/categories', [{ id: cat.body.id, sortOrder: 9 }]);
    const model = await api(page, 'POST', '/api/admin/vehicle-models', { name: 'Yamaha DT125' });
    await api(page, 'PUT', '/api/admin/vehicle-models', { id: model.body.id, name: 'Yamaha DT125R' });
    await api(page, 'DELETE', `/api/admin/vehicle-models?id=${model.body.id}`);
    await api(page, 'DELETE', `/api/admin/sub-categories?id=${sub.body.id}`);
    await api(page, 'DELETE', `/api/admin/categories?id=${cat.body.id}`);
    const imp = await api(page, 'POST', '/api/admin/products/batch', {
      products: [
        { categorySlug: 'cylinder', subCategorySlug: 'std', modelNumber: 'IMP-1', nameI18n: { en: 'Imported' } },
        { categorySlug: 'cylinder', subCategorySlug: 'std', modelNumber: '1HV-11311-00', nameI18n: { en: 'Cylinder Body' } }
      ]
    });
    assert(imp.status === 200, `批量匯入（${imp.status}）`);

    const rows = await logs();
    const brief = rows.map((r) => `${r.action}:${r.entity_type}`);
    assert(JSON.stringify(brief) === JSON.stringify([
      'create:category', 'update:category', 'create:sub_category', 'sort:sub_category', 'sort:category',
      'create:vehicle_model', 'update:vehicle_model', 'delete:vehicle_model', 'delete:sub_category', 'delete:category', 'import:product'
    ]), `紀錄順序與種類（${brief.join(', ')}）`);
    assert(rows.every((r) => r.actor_email === 'admin@example.com'), '每筆都有帳號');
    assert(JSON.stringify(rows[1].changes['名稱（繁中）']) === JSON.stringify(['煞車', '煞車系統']), '分類改名有記下改前改後');
    assert(JSON.stringify(rows[6].changes['名稱']) === JSON.stringify(['Yamaha DT125', 'Yamaha DT125R']), '車型改名有記下');
    assert(rows[3].changes['新排序']?.[1].includes('pad=3'), '子分類排序有記下');
    assert(rows[10].changes['新增產品']?.[1].includes('IMP-1') && rows[10].changes['更新產品']?.[1].includes('1HV-11311-00'), '匯入摘要區分新增與更新');
    assert(rows[9].entity_label === 'brake', '刪除分類保留代號');
  })
);

run('「操作紀錄」分頁：完整信箱、展開改前改後、依帳號與動作篩選；詢價紀錄不併入', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page);
    await api(page, 'POST', '/api/admin/products', productBody({ modelNumber: 'AUD-UI', stockQuantity: 2 }));
    await post('/__mock/seed', { table: 'admin_audit_log', rows: [
      { actor_email: 'partner@example.com', action: 'delete', entity_type: 'category', entity_id: null, entity_label: 'old-cat', changes: { 代號: ['old-cat', null] }, created_at: new Date().toISOString() },
      { actor_email: 'partner@example.com', action: 'create', entity_type: 'product', entity_id: null, entity_label: 'ANCIENT', changes: {}, created_at: '2020-01-01T00:00:00Z' }
    ] });
    await openAdminTab(page, '操作紀錄');
    const box = page.getByTestId('admin-audit-log');
    await box.getByTestId('audit-row').first().waitFor({ timeout: 30000 });
    assert((await box.getByTestId('audit-row').count()) === 2, '預設最近 30 天，太舊的不顯示');
    const actors = await box.getByTestId('audit-actor').allInnerTexts();
    assert(actors.includes('admin@example.com') && actors.includes('partner@example.com'), `顯示完整信箱（${actors.join(', ')}）`);
    const productRow = box.getByTestId('audit-row').filter({ hasText: 'AUD-UI' });
    await productRow.locator('summary').click();
    assert((await productRow.innerText()).includes('庫存') && (await productRow.innerText()).includes('2'), '展開看得到欄位內容');

    await box.getByLabel('依帳號篩選').selectOption('partner@example.com');
    await page.waitForFunction(() => {
      const found = document.querySelectorAll('[data-testid="audit-row"]');
      return found.length === 1 && found[0].textContent.includes('old-cat');
    });
    assert(true, '依帳號篩選');
    await box.getByLabel('依帳號篩選').selectOption('');
    await box.getByLabel('依動作篩選').selectOption('create');
    await page.waitForFunction(() => {
      const found = document.querySelectorAll('[data-testid="audit-row"]');
      return found.length === 1 && found[0].textContent.includes('AUD-UI');
    });
    assert(true, '依動作篩選');
    await box.getByLabel('依動作篩選').selectOption('');
    await box.getByLabel('期間').selectOption('365');
    assert((await box.innerText()).includes('詢價的處理紀錄') || (await box.innerText()).includes('詢價單的處理紀錄'), '說明詢價紀錄另外查看');

    // 未登入不能讀
    const anon = await page.context().browser().newContext();
    const res = await (await anon.newPage()).request.get(`${BASE_URL}/api/admin/audit-log`);
    assert(res.status() === 401, `未登入不能讀取紀錄（${res.status()}）`);
    await anon.close();
  })
);

run('紀錄寫不進去（資料表尚未建立）：原本的操作照常成功，分頁顯示尚未啟用', () =>
  withPage(async (page) => {
    await resetMock();
    await post('/__mock/drop', { table: 'admin_audit_log' });
    await login(page);
    const created = await api(page, 'POST', '/api/admin/products', productBody({ modelNumber: 'AUD-NODB' }));
    assert(created.status === 200, `新增產品照常成功（${created.status}）`);
    const upd = await api(page, 'PUT', '/api/admin/products', productBody({ id: created.body.id, modelNumber: 'AUD-NODB', stockQuantity: 1 }));
    assert(upd.status === 200, '修改產品照常成功');
    const cat = await api(page, 'POST', '/api/admin/categories', { slug: 'brake', nameZhTw: '煞車', nameZhCn: '刹车', nameEn: 'Brake' });
    assert(cat.status === 200, '新增分類照常成功');
    const del = await api(page, 'DELETE', `/api/admin/products?id=${created.body.id}`);
    assert(del.status === 200, '刪除產品照常成功');
    const state = await mockState();
    assert(!state.tables.products.some((p) => p.model_number === 'AUD-NODB'), '產品確實已刪除');

    await openAdminTab(page, '操作紀錄');
    await page.getByTestId('admin-audit-log').getByText(/操作紀錄尚未啟用/).waitFor({ timeout: 30000 });
    assert((await page.getByTestId('admin-audit-log').innerText()).includes('20261010_admin_audit_log.sql'), '提示要執行的檔案');
  })
);
