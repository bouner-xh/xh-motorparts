// E2E：詢價匯出 CSV（A6 ①）
// 匯出目前篩選的結果、每個品項一列、BOM、防止公式注入、未登入無法下載
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const fs = require('node:fs');
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });

// 引號內可含逗號與換行的簡易 CSV 解析
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// 6 筆：新詢價 3（其中一筆 2 個品項）、報價中 2、已回覆 1（公司名稱是公式）
function inquiries() {
  const statuses = ['pending', 'pending', 'pending', 'processing', 'processing', 'replied'];
  return statuses.map((status, i) => ({
    id: `40000000-0000-4000-8000-00000000030${i}`,
    customer_name: `聯絡人 ${i + 1}`,
    customer_email: `b${i + 1}@example.com`,
    company_name: i === 5 ? '=HYPERLINK("http://evil.example","點我")' : `買家 ${i + 1}`,
    country: i % 2 ? 'Japan' : 'Italy',
    phone: '',
    message: i === 0 ? '需要報價, 含運費\n請寄 PDF' : '',
    items: i === 0 ? [{ modelNumber: 'CYL-125', quantity: 200 }, { modelNumber: 'CHN-428', quantity: 300 }] : [{ modelNumber: `M-${i + 1}`, quantity: 10 }],
    status,
    reply_notes: '',
    created_at: new Date(Date.UTC(2026, 8, 20 + i)).toISOString(),
    updated_at: new Date(Date.UTC(2026, 8, 20 + i)).toISOString(),
  }));
}

async function openInquiries(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, '詢價');
  // 等列表載入完成（沒有資料時不會顯示「共 N 筆」，改看匯出按鈕與載入中文字消失）
  await page.getByRole('link', { name: /匯出 CSV/ }).waitFor({ timeout: 30000 });
  await page.locator('.admin-crm-panel').getByText('載入詢價單中...').waitFor({ state: 'detached', timeout: 30000 });
}

async function download(page) {
  const link = page.getByRole('link', { name: /匯出 CSV/ });
  const [file] = await Promise.all([page.waitForEvent('download'), link.click()]);
  return { name: file.suggestedFilename(), text: fs.readFileSync(await file.path(), 'utf8') };
}

run('匯出全部與篩選後的結果：每個品項一列、BOM、欄位正確', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('inquiry_requests', inquiries());
    await openInquiries(page);

    const all = await download(page);
    assert(/^inquiries-\d{4}-\d{2}-\d{2}\.csv$/.test(all.name), `檔名（${all.name}）`);
    assert(all.text.startsWith('﻿'), '有 BOM，Excel 開啟中文不亂碼');
    const rows = parseCsv(all.text);
    assert(rows[0].join('|') === '詢價日期|狀態|公司|聯絡人|Email|國家|電話|型號|品名|數量|客戶留言|內部備忘|最後更新', '表頭');
    assert(rows.length === 1 + 7, `6 張詢價、7 個品項共 7 列（${rows.length - 1}）`);
    const multi = rows.filter((r) => r[2] === '買家 1');
    assert(multi.length === 2 && multi.map((r) => r[7]).join(',') === 'CYL-125,CHN-428', '同一張詢價的兩個品項各一列');
    assert(multi[0][10] === '需要報價, 含運費\n請寄 PDF', '留言中的逗號與換行完整保留');

    await page.getByRole('tab', { name: '新詢價 3' }).click();
    await page.getByRole('link', { name: '匯出 CSV（3 筆）' }).waitFor();
    const pending = parseCsv((await download(page)).text);
    assert(pending.length === 1 + 4 && pending.slice(1).every((r) => r[1] === '新詢價'), '篩選「新詢價」只匯出新詢價');

    await page.getByRole('tab', { name: '全部 6' }).click();
    await page.getByRole('searchbox', { name: '搜尋詢價單' }).fill('chn-428');
    await page.getByRole('link', { name: '匯出 CSV（1 筆）' }).waitFor({ timeout: 10000 });
    const searched = parseCsv((await download(page)).text);
    assert(searched.length === 1 + 2 && searched[1][2] === '買家 1', '搜尋型號後只匯出符合的詢價');
  })
);

run('防止公式注入：公式開頭的公司名稱前面加上單引號', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('inquiry_requests', inquiries());
    await openInquiries(page);
    const rows = parseCsv((await download(page)).text);
    const evil = rows.find((r) => r[2].includes('HYPERLINK'));
    assert(evil && evil[2].startsWith(`'=`), `公式被當成文字（${evil && evil[2]}）`);
  })
);

run('沒有資料時按鈕停用；未登入無法下載', () =>
  withPage(async (page) => {
    await resetMock();
    await openInquiries(page);
    assert((await page.getByRole('link', { name: '匯出 CSV（0 筆）' }).getAttribute('aria-disabled')) === 'true', '0 筆時停用');
    await page.context().clearCookies();
    const status = await page.evaluate(async () => (await fetch('/api/admin/inquiries/export')).status);
    assert(status === 401, `未登入回應 401（${status}）`);
  })
);
