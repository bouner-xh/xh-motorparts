// E2E：後台詢價管理（A6 第一階段）
// 狀態篩選與筆數、待處理數量、搜尋（含型號）、分頁、詳情視窗 Esc 關閉、更新後顯示最後更新時間
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });

// 25 筆：新詢價 12、報價中 6、已回覆 4、已封存 3；第 25 筆詢價型號 SPECIAL-9
function sampleInquiries() {
  const statuses = [...Array(12).fill('pending'), ...Array(6).fill('processing'), ...Array(4).fill('replied'), ...Array(3).fill('archived')];
  return statuses.map((status, i) => {
    const n = String(i + 1).padStart(2, '0');
    const time = new Date(Date.UTC(2026, 8, 1, 0, i)).toISOString();
    return {
      id: `40000000-0000-4000-8000-0000000000${n}`,
      customer_name: `聯絡人 ${n}`,
      customer_email: `buyer${n}@example.com`,
      company_name: i === 24 ? 'Moto Italia' : `公司 ${n}`,
      country: i % 2 ? 'Japan' : 'Italy',
      phone: '',
      message: `需求 ${n}`,
      items: [{ productId: 'x', modelNumber: i === 24 ? 'SPECIAL-9' : `M-${n}`, nameZhTw: '零件', quantity: 10 }],
      status,
      reply_notes: '',
      created_at: time,
      updated_at: time,
    };
  });
}

async function openInquiries(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await page.getByText(/共 \d+ 筆，第/).waitFor({ timeout: 30000 });
}

const rowCount = (page) => page.locator('tr', { has: page.getByRole('button', { name: '檢視' }) }).count();

run('狀態篩選、待處理數量、分頁', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('inquiry_requests', sampleInquiries());
    await openInquiries(page);

    assert((await page.getByTestId('pending-count').innerText()).includes('12 筆待處理'), '標題顯示 12 筆待處理');
    for (const [label, n] of [['全部', 25], ['新詢價', 12], ['報價中', 6], ['已回覆', 4], ['已封存', 3]]) {
      assert(await page.getByRole('tab', { name: `${label} ${n}` }).isVisible(), `「${label} ${n}」篩選按鈕`);
    }
    assert((await rowCount(page)) === 20, '第 1 頁 20 筆');
    await page.getByText('共 25 筆，第 1 / 2 頁').waitFor();
    await page.getByRole('button', { name: '下一頁' }).click();
    await page.getByText('共 25 筆，第 2 / 2 頁').waitFor();
    assert((await rowCount(page)) === 5, '第 2 頁 5 筆');

    await page.getByRole('tab', { name: '報價中 6' }).click();
    await page.getByText('共 6 筆，第 1 / 1 頁').waitFor();
    assert((await rowCount(page)) === 6, '篩選「報價中」後回到第 1 頁、6 筆');

    const justify = await page.locator('.admin-crm-panel > div').first().evaluate((el) => getComputedStyle(el).justifyContent);
    assert(justify === 'space-between', `標題列排版正確（${justify}）`);
  })
);

run('搜尋公司、Email 與詢價型號', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('inquiry_requests', sampleInquiries());
    await openInquiries(page);
    const search = page.getByRole('searchbox', { name: '搜尋詢價單' });

    await search.fill('special-9');
    await page.getByText('共 1 筆，第 1 / 1 頁').waitFor({ timeout: 10000 });
    assert(await page.locator('tr', { hasText: 'Moto Italia' }).isVisible(), '以型號（不分大小寫）找到詢價單');

    await search.fill('buyer03@');
    await page.locator('tr', { hasText: '公司 03' }).waitFor({ timeout: 10000 });
    assert((await rowCount(page)) === 1, '以 Email 找到詢價單（公司 03 在第 2 頁，搜尋後直接出現）');

    await search.fill('不存在的公司');
    await page.getByText('沒有符合條件的詢價單。').waitFor({ timeout: 10000 });
    assert(true, '沒有結果時顯示提示');
  })
);

run('詳情視窗：Esc 關閉、更新狀態後筆數與最後更新時間同步', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('inquiry_requests', sampleInquiries());
    await openInquiries(page);

    const row = page.locator('tr', { hasText: '公司 12' });
    await row.getByRole('button', { name: '檢視' }).click();
    const dialog = page.getByRole('dialog', { name: '詢價單詳情' });
    await dialog.waitFor();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert(await row.getByRole('button', { name: '檢視' }).evaluate((el) => el === document.activeElement), 'Esc 關閉後焦點回到「檢視」按鈕');

    await row.getByRole('button', { name: '檢視' }).click();
    await dialog.getByRole('combobox').selectOption('replied');
    await dialog.getByRole('textbox').fill('已寄報價單 Q-001');
    await dialog.getByRole('button', { name: '儲存變更' }).click();
    await page.getByText('已更新 公司 12 的詢價單').waitFor({ timeout: 10000 });
    await page.getByRole('tab', { name: '新詢價 11' }).waitFor({ timeout: 10000 });
    assert(await page.getByRole('tab', { name: '已回覆 5' }).isVisible(), '各狀態筆數同步更新');

    const saved = (await mockState()).tables.inquiry_requests.find((r) => r.company_name === '公司 12');
    assert(saved.status === 'replied' && saved.reply_notes === '已寄報價單 Q-001', '狀態與備註已儲存');
    assert(saved.updated_at > '2026-09-02', '資料庫的最後更新時間已更新');

    await page.locator('tr', { hasText: '公司 12' }).getByRole('button', { name: '檢視' }).click();
    const meta = await dialog.getByText(/最後更新：/).innerText();
    const updatedPart = meta.split('最後更新：')[1] || '';
    assert(updatedPart && !updatedPart.includes('2026/09/01'), `詳情顯示新的最後更新時間（${meta}）`);
  })
);

run('API：刪除時 ID 格式錯誤回應 400', () =>
  withPage(async (page) => {
    await resetMock();
    await openInquiries(page).catch(() => {});
    const status = await page.evaluate(async () => (await fetch('/api/admin/inquiries?id=not-a-uuid', { method: 'DELETE' })).status);
    assert(status === 400, `回應 400（${status}）`);
  })
);
