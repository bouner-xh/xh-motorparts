// E2E：車型清單與 OEM 對照料號（P8，方案 A）
// 後台管理車型清單、產品勾選適用車型並填 OEM 對照料號；前台產品頁顯示、搜尋可用車型與對照料號查到；
// 資料庫還沒執行更新語法時網站與後台照常運作
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const post = (path, body) => fetch(`${MOCK_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const P1 = '30000000-0000-4000-8000-000000000001';

async function login(page, tab) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, tab);
}

async function addModel(page, name) {
  const box = page.getByTestId('admin-vehicle-models');
  await box.getByLabel('新增車型').fill(name);
  await box.getByRole('button', { name: '新增車型' }).click();
}

const api = (page, method, url, body) =>
  page.evaluate(
    async ({ method, url, body }) => {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { status: res.status, body: await res.json() };
    },
    { method, url, body }
  );

run('車型清單：新增、重複擋下（不分大小寫）、改名、刪除會提示使用數量', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page, '分類');
    const box = page.getByTestId('admin-vehicle-models');
    await box.waitFor({ timeout: 30000 });
    await addModel(page, '  Yamaha   DT125 ');
    await box.getByText('車型已新增').waitFor({ timeout: 15000 });
    assert((await mockState()).tables.vehicle_models.some((m) => m.name === 'Yamaha DT125'), '名稱整理後存入（空白合併）');

    await addModel(page, 'yamaha dt125');
    await box.getByText(/已經在清單裡/).waitFor({ timeout: 15000 });
    assert((await mockState()).tables.vehicle_models.length === 1, '不分大小寫重複被擋下');

    await addModel(page, 'Honda CG125');
    await box.getByText('車型已新增').first().waitFor();
    await box.getByRole('row', { name: /Honda CG125/ }).getByRole('button', { name: '改名' }).click();
    await box.getByLabel('車型名稱：Honda CG125').fill('Honda CG125 (2010)');
    await box.getByRole('button', { name: '儲存' }).click();
    await box.getByText('車型名稱已更新').waitFor({ timeout: 15000 });
    assert((await mockState()).tables.vehicle_models.some((m) => m.name === 'Honda CG125 (2010)'), '已改名');

    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); return d.accept(); });
    await box.getByRole('row', { name: /Honda CG125/ }).getByRole('button', { name: '刪除' }).click();
    await box.getByText('車型已刪除').waitFor({ timeout: 15000 });
    assert(dialogs[0]?.includes('確定刪除車型「Honda CG125 (2010)」'), `刪除前確認（${dialogs[0]}）`);
    assert((await mockState()).tables.vehicle_models.length === 1, '已刪除');
  })
);

run('產品勾選適用車型、填 OEM 對照料號：存入資料庫、重新編輯還原、前台顯示並可搜尋', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page, '分類');
    await page.getByTestId('admin-vehicle-models').waitFor({ timeout: 30000 });
    await addModel(page, 'Yamaha DT125');
    await page.getByText('車型已新增').first().waitFor({ timeout: 15000 });
    await addModel(page, 'Honda CG125');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="admin-vehicle-models"] tbody tr').length === 2);

    await openAdminTab(page, '產品');
    const form = page.locator('[data-testid="admin-product-form"]');
    await page.getByRole('row', { name: /1HV-11311-00/ }).getByRole('button', { name: '編輯' }).click();
    await form.getByLabel('Yamaha DT125').check();
    await form.getByLabel('Honda CG125').check();
    const oem = form.getByLabel('OEM／對照料號');
    await oem.fill('5t5-17421-00， 5T5-17421-00, x-77');
    await form.getByLabel('名稱（en）').click();
    assert((await oem.inputValue()) === '5T5-17421-00, X-77', `對照料號離開欄位後轉大寫並去重複（${await oem.inputValue()}）`);
    await form.getByRole('button', { name: '更新產品' }).click();
    await page.getByText('產品更新成功').waitFor({ timeout: 30000 });

    let { tables } = await mockState();
    assert(tables.product_vehicle_models.filter((r) => r.product_id === P1).length === 2, '兩個適用車型存入');
    assert(JSON.stringify(tables.products.find((p) => p.id === P1).oem_numbers) === JSON.stringify(['5T5-17421-00', 'X-77']), '對照料號存入（大寫、去重複）');

    // 重新編輯：勾選與對照料號都還原；取消一個車型後再存
    await page.getByRole('row', { name: /1HV-11311-00/ }).getByRole('button', { name: '編輯' }).click();
    assert(await form.getByLabel('Yamaha DT125').isChecked() && await form.getByLabel('Honda CG125').isChecked(), '勾選還原');
    assert((await form.getByLabel('OEM／對照料號').inputValue()) === '5T5-17421-00, X-77', '對照料號還原');
    await form.getByLabel('Honda CG125').uncheck();
    await form.getByRole('button', { name: '更新產品' }).click();
    await page.getByText('產品更新成功').waitFor({ timeout: 30000 });
    ({ tables } = await mockState());
    assert(tables.product_vehicle_models.filter((r) => r.product_id === P1).length === 1, '取消勾選後只剩一個車型');

    // 前台
    await page.goto(`${BASE_URL}/en/products/cylinder/std/1HV-11311-00`);
    const fit = page.getByTestId('product-fitment');
    await fit.waitFor();
    assert((await fit.innerText()).includes('Yamaha DT125') && !(await fit.innerText()).includes('Honda'), '產品頁顯示適用車型');
    assert((await page.getByTestId('product-oem').innerText()).includes('5T5-17421-00'), '產品頁顯示對照料號');
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
    assert(ld.isAccessoryOrSparePartFor?.[0]?.name === 'Yamaha DT125' && ld.additionalProperty?.some((p) => p.value === 'X-77'), '結構化資料帶入車型與對照料號');

    for (const [q, expected] of [['5t5-17421-00', '1HV-11311-00'], ['x77', '1HV-11311-00'], ['yamaha dt125', '1HV-11311-00']]) {
      await page.goto(`${BASE_URL}/en/products/search?q=${encodeURIComponent(q)}`);
      await page.getByText(expected).first().waitFor({ timeout: 15000 });
      assert((await page.locator('.product-card').count()) === 1, `搜尋「${q}」找到這個產品`);
    }
    await page.goto(`${BASE_URL}/en/products/search?q=honda`);
    assert((await page.locator('.product-card').count()) === 0, '取消勾選的車型搜不到');
  })
);

run('刪除車型：產品不受影響，只是不再顯示該車型', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page, '產品');
    const created = await api(page, 'POST', '/api/admin/vehicle-models', { name: 'Suzuki GN125' });
    assert(created.status === 200, `新增車型（${created.status}）`);
    const put = await api(page, 'PUT', '/api/admin/products', {
      id: P1, category: 'cylinder', subCategoryId: '20000000-0000-4000-8000-000000000001', modelNumber: '1HV-11311-00', nameEn: 'Cylinder Body', vehicleModelIds: [created.body.id]
    });
    assert(put.status === 200, `產品指定車型（${put.status} ${JSON.stringify(put.body)}）`);
    await page.request.delete(`${BASE_URL}/api/admin/vehicle-models?id=${created.body.id}`);
    const { tables } = await mockState();
    assert(tables.vehicle_models.length === 0 && tables.product_vehicle_models.length === 0, '車型與對應都被刪除');
    assert(tables.products.some((p) => p.id === P1), '產品還在');
    const bad = await api(page, 'PUT', '/api/admin/products', {
      id: P1, category: 'cylinder', subCategoryId: '20000000-0000-4000-8000-000000000001', modelNumber: '1HV-11311-00', nameEn: 'X', oemNumbers: Array.from({ length: 31 }, (_, i) => `N-${i}`)
    });
    assert(bad.status === 400 && bad.body.error.includes('OEM／對照料號最多 30 個'), `對照料號超過 30 個回 400（${bad.body.error}）`);
  })
);

run('資料庫還沒執行更新語法：網站與後台照常運作，儲存車型或對照料號時提示先執行', () =>
  withPage(async (page) => {
    await resetMock();
    await post('/__mock/drop', { table: 'vehicle_models' });
    await post('/__mock/drop', { table: 'product_vehicle_models' });
    await post('/__mock/drop-column', { table: 'products', column: 'oem_numbers' });

    // 前台：產品頁與搜尋照常
    const product = await page.request.get(`${BASE_URL}/en/products/cylinder/std/1HV-11311-00`);
    assert(product.status() === 200, `產品頁照常（${product.status()}）`);
    const search = await page.request.get(`${BASE_URL}/en/products/search?q=1HV`);
    assert(search.status() === 200 && (await search.text()).includes('1HV-11311-00'), '搜尋照常');

    await login(page, '分類');
    const box = page.getByTestId('admin-vehicle-models');
    await box.getByText(/車型清單尚未啟用/).waitFor({ timeout: 30000 });
    assert(await box.getByRole('button', { name: '新增車型' }).isDisabled(), '新增車型按鈕停用');

    const base = { id: P1, category: 'cylinder', subCategoryId: '20000000-0000-4000-8000-000000000001', modelNumber: '1HV-11311-00', nameEn: 'Cylinder Body' };
    const plain = await api(page, 'PUT', '/api/admin/products', { ...base, vehicleModelIds: [], oemNumbers: [] });
    assert(plain.status === 200, `沒有車型與對照料號時照常儲存（${plain.status} ${JSON.stringify(plain.body)}）`);
    const withOem = await api(page, 'PUT', '/api/admin/products', { ...base, oemNumbers: ['A-1'] });
    assert(withOem.status === 409 && withOem.body.error.includes('20261010_vehicle_models_oem.sql'), `有對照料號時提示先執行更新語法（${withOem.status}）`);
    const withModel = await api(page, 'POST', '/api/admin/vehicle-models', { name: 'Yamaha DT125' });
    assert(withModel.status === 409 && withModel.body.error.includes('20261010_vehicle_models_oem.sql'), '新增車型時提示先執行更新語法');
  })
);
