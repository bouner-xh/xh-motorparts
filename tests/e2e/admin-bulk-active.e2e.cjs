// E2E：後台批量上架／下架（P9，2026-10-18）
// 勾選產品 → 操作列 → 確認視窗（沒有圖片的提醒）→ 一次改狀態；本來就是該狀態的不重複寫操作紀錄；搜尋條件改變時清空選取
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const post = (p, body) => fetch(`${MOCK_URL}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
const state = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const CAT = '10000000-0000-4000-8000-000000000001';
const SUB = '20000000-0000-4000-8000-000000000001';
const id = (n) => `30000000-0000-4000-8000-0000000002${String(n).padStart(2, '0')}`;

async function prepare() {
  await post('/__mock/reset');
  await post('/__mock/seed', {
    table: 'products',
    rows: [1, 2, 3, 4].map((n) => ({
      id: id(n),
      category_id: CAT,
      sub_category_id: SUB,
      model_number: `BULK-${n}`,
      name_i18n: { 'zh-TW': `批量${n}`, 'zh-CN': `批量${n}`, en: `Bulk ${n}` },
      specifications: [],
      stock_quantity: 1,
      is_active: n <= 2 // BULK-1、2 已上架；BULK-3、4 未上架
    }))
  });
}

async function openProducts(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, '產品');
  await page.getByText(/共 \d+ 筆，第 1 \/ \d+ 頁/).last().waitFor({ timeout: 30000 });
}

const active = async (model) => (await state()).tables.products.find((p) => p.model_number === model).is_active;

run('勾選後批量上架：確認視窗提醒沒有圖片、只改未上架的、寫操作紀錄', () =>
  withPage(async (page) => {
    await prepare();
    await openProducts(page);
    assert((await page.getByTestId('bulk-bar').count()) === 0, '沒勾選時不顯示操作列');

    await page.getByRole('checkbox', { name: '選取 BULK-1' }).check();
    await page.getByRole('checkbox', { name: '選取 BULK-3' }).check();
    await page.getByRole('checkbox', { name: '選取 BULK-4' }).check();
    assert((await page.getByTestId('bulk-count').innerText()).includes('3'), '操作列顯示已選 3 項');

    let message = '';
    page.once('dialog', async (dialog) => {
      message = dialog.message();
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: '批量上架' }).click();
    await page.waitForTimeout(500);
    assert(message.includes('3 項') && message.includes('沒有圖片'), `確認視窗提醒沒有圖片（${message}）`);
    assert(!(await active('BULK-3')), '按取消後狀態不變');

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: '批量上架' }).click();
    await page.getByText(/已上架 2 項.*1 項本來就是上架/).waitFor({ timeout: 15000 });
    assert((await active('BULK-3')) && (await active('BULK-4')), '未上架的兩項已上架');
    assert((await page.getByTestId('bulk-bar').count()) === 0, '完成後清空選取');

    const logs = (await state()).tables.admin_audit_log || [];
    const bulkLogs = logs.filter((l) => l.entity_label === 'BULK-3' || l.entity_label === 'BULK-4' || l.entity_label === 'BULK-1');
    assert(bulkLogs.length === 2, `只有狀態改變的兩項有操作紀錄（${bulkLogs.length}）`);
    assert(JSON.stringify(bulkLogs[0].changes).includes('上架'), '紀錄含「上架」欄位的改前改後');
  })
);

run('批量下架：全選本頁、符合條件的全部；搜尋條件改變會清空選取', () =>
  withPage(async (page) => {
    await prepare();
    await openProducts(page);

    await page.getByRole('checkbox', { name: '選取本頁全部產品' }).check();
    const count = await page.getByTestId('bulk-count').innerText();
    assert(/\d+ 項/.test(count), `全選本頁（${count}）`);

    await page.getByRole('searchbox', { name: '搜尋產品' }).fill('BULK-1');
    assert((await page.getByTestId('bulk-bar').count()) === 0, '搜尋條件改變後選取被清空');

    await page.getByRole('searchbox', { name: '搜尋產品' }).fill('BULK');
    await page.getByRole('checkbox', { name: '選取本頁全部產品' }).check();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: '批量下架' }).click();
    await page.getByText(/已下架 2 項.*2 項本來就是下架/).waitFor({ timeout: 15000 });
    assert(!(await active('BULK-1')) && !(await active('BULK-2')), '已上架的兩項已下架');
    assert((await active('BULK-3')) === false, '本來就是下架的不變');
  })
);

run('未登入不能批量改狀態；格式錯誤被擋下', () =>
  withPage(async (page) => {
    await prepare();
    const anon = await page.request.patch(`${BASE_URL}/api/admin/products`, { data: { ids: [id(3)], isActive: true } });
    assert(anon.status() === 401, `未登入 401（${anon.status()}）`);
    assert(!(await active('BULK-3')), '資料沒被改');
    await openProducts(page);
    const bad = await page.request.patch(`${BASE_URL}/api/admin/products`, { data: { ids: ['not-a-uuid'], isActive: true } });
    assert(bad.status() === 400, `ids 不是 UUID 回 400（${bad.status()}）`);
    const empty = await page.request.patch(`${BASE_URL}/api/admin/products`, { data: { ids: [], isActive: true } });
    assert(empty.status() === 400, `空清單回 400（${empty.status()}）`);
  })
);
