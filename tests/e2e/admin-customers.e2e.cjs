// E2E：後台客戶列表（A6 ②）
// 詢價次數與排序、國家篩選、型號搜尋、客戶詳情、與詢價分頁互相跳轉、匯出 CSV
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const fs = require('node:fs');
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });

const C = (n) => `60000000-0000-4000-8000-00000000000${n}`;
const customers = [
  { id: C(1), email: 'marco@moto.example', name: 'Marco Rossi', company_name: 'Moto Italia', country: 'Italy', phone: '+39 1' },
  { id: C(2), email: 'kenji@tokyo.example', name: 'Kenji Sato', company_name: 'Tokyo Parts', country: 'Japan', phone: '' },
  { id: C(3), email: 'ana@lima.example', name: 'Ana Díaz', company_name: 'Lima Motos', country: 'Peru', phone: '' },
];
const inq = (n, customer, status, day, models) => ({
  id: `40000000-0000-4000-8000-00000000040${n}`,
  customer_id: customer ? customer.id : null,
  customer_name: (customer || customers[1]).name,
  customer_email: (customer || customers[1]).email,
  company_name: (customer || customers[1]).company_name,
  country: (customer || customers[1]).country,
  items: models.map((m) => ({ modelNumber: m, quantity: 100 })),
  status,
  reply_notes: '',
  created_at: new Date(Date.UTC(2026, 8, day)).toISOString(),
  updated_at: new Date(Date.UTC(2026, 8, day)).toISOString(),
});
// Moto Italia 3 次（1 筆待處理）、Tokyo Parts 1 次（早期資料沒有 customer_id）、Lima Motos 1 次（最新）
const inquiries = [
  inq(1, customers[0], 'replied', 1, ['CYL-125']),
  inq(2, customers[0], 'replied', 10, ['CYL-125', 'CHN-428']),
  inq(3, customers[0], 'pending', 20, ['CYL-150']),
  inq(4, null, 'processing', 15, ['CHN-520']),
  inq(5, customers[2], 'pending', 25, ['CYL-50']),
];

async function open(page) {
  await resetMock();
  await seed('customers', customers);
  await seed('inquiry_requests', inquiries);
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, '客戶');
  await page.getByText(/共 \d+ 位客戶/).waitFor({ timeout: 30000 });
}

const companies = (page) => page.locator('.admin-customers__table tbody tr td:first-child strong').allInnerTexts();

run('客戶列表：詢價次數、排序、國家篩選、型號搜尋', () =>
  withPage(async (page) => {
    await open(page);
    assert((await companies(page)).join(',') === 'Lima Motos,Moto Italia,Tokyo Parts', '預設依最近詢價排序');
    const marco = page.locator('.admin-customers__table tr', { hasText: 'Moto Italia' });
    assert((await marco.locator('td.num').innerText()).startsWith('3'), 'Moto Italia 詢價 3 次');
    assert((await marco.innerText()).includes('1 待處理'), '顯示待處理筆數');
    assert((await page.locator('.admin-customers__table tr', { hasText: 'Tokyo Parts' }).locator('td.num').innerText()).startsWith('1'), '沒有 customer_id 的詢價以 Email 對應');

    await page.getByRole('combobox', { name: '排序' }).selectOption('count');
    await page.waitForFunction(() => document.querySelector('.admin-customers__table tbody tr strong')?.textContent === 'Moto Italia');
    assert(true, '依詢價次數排序');

    await page.getByRole('combobox', { name: '依國家篩選' }).selectOption('Japan');
    await page.getByText('共 1 位客戶，第 1 / 1 頁').waitFor();
    assert((await companies(page)).join(',') === 'Tokyo Parts', '國家篩選');

    await page.getByRole('combobox', { name: '依國家篩選' }).selectOption('');
    await page.getByRole('searchbox', { name: '搜尋客戶' }).fill('chn-428');
    await page.getByText('共 1 位客戶，第 1 / 1 頁').waitFor({ timeout: 10000 });
    assert((await companies(page)).join(',') === 'Moto Italia', '以詢價過的型號搜尋');
  })
);

run('客戶詳情：詢價紀錄，並可到詢價分頁查看', () =>
  withPage(async (page) => {
    await open(page);
    await page.locator('.admin-customers__table tr', { hasText: 'Moto Italia' }).getByRole('button', { name: '查看' }).click();
    const dialog = page.getByRole('dialog', { name: 'Moto Italia' });
    await dialog.waitFor();
    assert((await dialog.locator('.admin-customers__history li').count()) === 3, '列出 3 筆詢價紀錄');
    assert((await dialog.innerText()).includes('CYL-125 × 100、CHN-428 × 100'), '顯示型號與數量');
    await dialog.getByRole('button', { name: '在詢價分頁查看' }).click();
    await page.locator('.admin-crm-panel').getByText('共 3 筆，第 1 / 1 頁').waitFor({ timeout: 10000 });
    assert((await page.getByRole('searchbox', { name: '搜尋詢價單' }).inputValue()) === 'marco@moto.example', '詢價分頁以客戶 Email 搜尋');
  })
);

run('詢價詳情：顯示回頭客並可跳到客戶資料', () =>
  withPage(async (page) => {
    await open(page);
    await openAdminTab(page, '詢價');
    await page.locator('.admin-crm-panel tr', { hasText: 'Moto Italia' }).first().getByRole('button', { name: '檢視' }).click();
    const inquiry = page.getByRole('dialog', { name: '詢價單詳情' });
    await inquiry.waitFor();
    assert((await inquiry.innerText()).includes('這位客戶共詢價 3 次（回頭客）'), '顯示回頭客與詢價次數');
    await inquiry.getByRole('button', { name: '查看客戶 →' }).click();
    await page.getByRole('dialog', { name: 'Moto Italia' }).waitFor({ timeout: 10000 });
    assert((await page.getByRole('tab', { name: /^客戶/ }).getAttribute('aria-selected')) === 'true', '切到客戶分頁並開啟客戶詳情');
  })
);

run('匯出客戶 CSV；未登入無法取得', () =>
  withPage(async (page) => {
    await open(page);
    const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: '匯出 CSV（3 筆）' }).click()]);
    const text = fs.readFileSync(await file.path(), 'utf8');
    assert(/^customers-\d{4}-\d{2}-\d{2}\.csv$/.test(file.suggestedFilename()), '檔名');
    assert(text.startsWith('﻿公司,聯絡人,Email'), '表頭與 BOM');
    assert(text.includes('Moto Italia,Marco Rossi,marco@moto.example,Italy'), '內容');
    await page.context().clearCookies();
    const statuses = await page.evaluate(async () => [(await fetch('/api/admin/customers')).status, (await fetch('/api/admin/customers/export')).status]);
    assert(statuses.join(',') === '401,401', `未登入回應 401（${statuses}）`);
  })
);
