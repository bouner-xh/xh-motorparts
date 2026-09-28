// E2E：詢價處理紀錄（A6 ③）
// 改狀態／備忘會記錄操作人與前後值、沒有改變不記錄、刪除後紀錄保留、資料表尚未建立時不影響操作
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const post = (path, body) => fetch(`${MOCK_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const INQ_ID = '40000000-0000-4000-8000-000000000501';

async function open(page, { dropEvents = false } = {}) {
  await post('/__mock/reset');
  if (dropEvents) await post('/__mock/drop', { table: 'inquiry_events' });
  await post('/__mock/seed', {
    table: 'inquiry_requests',
    rows: [{ id: INQ_ID, customer_name: 'Marco', customer_email: 'marco@moto.example', company_name: 'Moto Italia', country: 'Italy', items: [{ modelNumber: 'CYL-125', quantity: 200 }], status: 'pending', reply_notes: '', created_at: '2026-09-27T00:00:00Z', updated_at: '2026-09-27T00:00:00Z' }],
  });
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, '詢價');
  await page.locator('.admin-crm-panel').getByText('共 1 筆，第 1 / 1 頁').waitFor({ timeout: 30000 });
}

async function openDetail(page) {
  await page.locator('.admin-crm-panel tr', { hasText: 'Moto Italia' }).getByRole('button', { name: '檢視' }).click();
  const dialog = page.getByRole('dialog', { name: '詢價單詳情' });
  await dialog.waitFor();
  await dialog.getByTestId('inquiry-events').getByText('載入中...').waitFor({ state: 'detached', timeout: 10000 });
  return dialog;
}

async function save(page, dialog, status, notes) {
  await dialog.getByRole('combobox').selectOption(status);
  await dialog.getByRole('textbox').fill(notes);
  await dialog.getByRole('button', { name: '儲存變更' }).click();
  await page.getByText('已更新 Moto Italia 的詢價單').waitFor({ timeout: 10000 });
}

run('改狀態與備忘：記錄操作人與前後值，詳情顯示時間軸；沒有改變不記錄', () =>
  withPage(async (page) => {
    await open(page);
    let dialog = await openDetail(page);
    assert((await dialog.getByTestId('inquiry-events').innerText()).includes('還沒有處理紀錄'), '一開始沒有紀錄');
    await save(page, dialog, 'processing', '已寄報價單 Q-2026-001');

    let events = (await mockState()).tables.inquiry_events;
    assert(events.length === 2, `寫入 2 筆紀錄（${events.length}）`);
    assert(events.every((e) => e.actor_email === 'admin@example.com' && e.inquiry_id === INQ_ID), '記錄操作人與詢價單');

    dialog = await openDetail(page);
    const timeline = await dialog.getByTestId('inquiry-events').innerText();
    assert(timeline.includes('admin@example.com') && timeline.includes('狀態：新詢價 → 報價中'), `時間軸顯示狀態變更（${timeline}）`);
    assert(timeline.includes('更新內部備忘：「已寄報價單 Q-2026-001」'), '時間軸顯示備忘');

    await dialog.getByRole('button', { name: '儲存變更' }).click();
    await page.getByText('已更新 Moto Italia 的詢價單').waitFor({ timeout: 10000 });
    events = (await mockState()).tables.inquiry_events;
    assert(events.length === 2, '沒有改變時不新增紀錄');
  })
);

run('刪除詢價：先寫入刪除紀錄，詢價單刪除後紀錄仍保留', () =>
  withPage(async (page) => {
    await open(page);
    page.on('dialog', (d) => d.accept());
    await page.locator('.admin-crm-panel tr', { hasText: 'Moto Italia' }).getByRole('button', { name: '刪除' }).click();
    await page.getByText('詢價紀錄已刪除').waitFor({ timeout: 10000 });
    const { tables } = await mockState();
    const del = (tables.inquiry_events || []).find((e) => e.action === 'delete');
    assert(del && del.actor_email === 'admin@example.com', '記錄是誰刪的');
    assert(del.inquiry_id === null && del.inquiry_label === 'Moto Italia / marco@moto.example', '詢價單刪除後紀錄保留公司與 Email');
  })
);

run('資料表尚未建立：儲存照常成功，詳情提示需要建立資料表', () =>
  withPage(async (page) => {
    await open(page, { dropEvents: true });
    let dialog = await openDetail(page);
    assert((await dialog.getByTestId('inquiry-events').innerText()).includes('處理紀錄尚未啟用'), '提示尚未啟用');
    await save(page, dialog, 'replied', '');
    const saved = (await mockState()).tables.inquiry_requests.find((r) => r.id === INQ_ID);
    assert(saved.status === 'replied', '詢價狀態照常更新');
  })
);
