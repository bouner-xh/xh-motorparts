// E2E：後台分頁與總覽（A8）
// 預設總覽、各分頁切換與網址記憶、鍵盤操作、切換不遺失表單、待處理數量同步、手機版、登出
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });

// 6 筆詢價：新詢價 3、報價中 2、已回覆 1
function inquiries() {
  return ['pending', 'pending', 'pending', 'processing', 'processing', 'replied'].map((status, i) => {
    const time = new Date(Date.UTC(2026, 8, 20 + i)).toISOString();
    return {
      id: `40000000-0000-4000-8000-00000000010${i}`,
      customer_name: `聯絡人 ${i + 1}`,
      customer_email: `b${i + 1}@example.com`,
      company_name: `買家 ${i + 1}`,
      country: 'Italy',
      items: [{ productId: 'x', modelNumber: 'M-1', quantity: 1 }],
      status,
      reply_notes: '',
      created_at: time,
      updated_at: time,
    };
  });
}

async function login(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await page.getByTestId('admin-overview').waitFor({ timeout: 30000 });
}

const visiblePanel = (page) => page.locator('[role="tabpanel"]:not([hidden])');

run('登入後預設總覽：分頁、待處理數量、產品與分類筆數、最新詢價', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('inquiry_requests', inquiries());
    await login(page);

    const tabs = await page.getByRole('tablist', { name: '後台功能' }).getByRole('tab').allInnerTexts();
    assert(tabs.map((t) => t.replace(/\d+/g, '').trim()).join('/') === '總覽/詢價/客戶/產品/分類/批量匯入/操作紀錄', `分頁順序（${tabs.join(' / ')}）`);
    assert((await page.getByRole('tab', { name: /^總覽/ }).getAttribute('aria-selected')) === 'true', '預設為總覽');
    assert(/3/.test(await page.getByRole('tab', { name: /^詢價/ }).innerText()), '詢價分頁顯示 3 筆待處理');
    assert((await page.getByTestId('overview-pending').innerText()) === '3', '總覽待處理 3');
    assert((await page.getByTestId('overview-products').innerText()) === '2', '總覽產品 2');
    assert((await page.getByTestId('overview-categories').innerText()) === '2', '總覽分類 2');
    const latest = page.locator('.admin-overview__latest tbody tr');
    assert((await latest.count()) === 5, '最新詢價顯示 5 筆');
    assert((await latest.first().innerText()).includes('買家 6'), '最新的排在最前面');

    const body = await page.locator('body').innerText();
    assert(!body.includes('前往登入頁') && !body.includes('Logout') && !body.includes('後續將接上'), '移除過時文字與英文登出');
    assert(await page.getByRole('button', { name: '登出' }).isVisible(), '有中文「登出」');
    // 後台所有分頁（含隱藏的）都不使用 emoji 當圖示（D9、A8）
    const emoji = await page.evaluate(() => (document.querySelector('main').textContent.match(/[\u{1F300}-\u{1FAFF}\u{23F3}\u{26A0}\u{2705}\u{274C}\u{2B50}]/gu) || []).join(' '));
    assert(emoji === '', `後台沒有 emoji（${emoji}）`);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    assert(height < 2000, `頁面高度大幅縮短（${height}px）`);
  })
);

run('切換分頁：網址記住分頁、重新整理停留、鍵盤左右鍵、表單內容不遺失', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page);

    await page.getByRole('button', { name: '管理產品 →' }).click();
    assert(page.url().endsWith('#products'), `網址變成 #products（${page.url()}）`);
    const form = page.getByTestId('admin-product-form');
    assert(await form.isVisible(), '產品表單顯示');
    assert((await visiblePanel(page).count()) === 1, '一次只顯示一個分頁');

    await form.getByLabel('型號').fill('KEEP-001');
    await openAdminTab(page, '分類');
    assert(!(await form.isVisible()), '切到分類後產品表單隱藏');
    await openAdminTab(page, '產品');
    assert((await form.getByLabel('型號').inputValue()) === 'KEEP-001', '切回產品時填到一半的內容還在');

    await page.reload();
    await page.getByTestId('admin-product-form').waitFor({ state: 'visible', timeout: 30000 });
    assert((await page.getByRole('tab', { name: /^產品/ }).getAttribute('aria-selected')) === 'true', '重新整理後停在產品分頁');

    await page.getByRole('tab', { name: /^產品/ }).focus();
    await page.keyboard.press('ArrowRight');
    assert((await page.getByRole('tab', { name: /^分類/ }).getAttribute('aria-selected')) === 'true', '右鍵切到分類');
    assert(await page.getByRole('tab', { name: /^分類/ }).evaluate((el) => el === document.activeElement), '焦點跟著移動');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    assert((await page.getByRole('tab', { name: /^客戶/ }).getAttribute('aria-selected')) === 'true', '左鍵切到客戶');
  })
);

run('處理詢價後，分頁與總覽的待處理數量同步更新', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('inquiry_requests', inquiries());
    await login(page);

    await page.getByRole('button', { name: '前往處理 →' }).click();
    const row = page.locator('tr', { hasText: '買家 3' });
    await row.getByRole('button', { name: '檢視' }).click();
    const dialog = page.getByRole('dialog', { name: '詢價單詳情' });
    await dialog.getByRole('combobox').selectOption('replied');
    await dialog.getByRole('button', { name: '儲存變更' }).click();
    await page.getByText('已更新 買家 3 的詢價單').waitFor({ timeout: 10000 });

    await page.waitForFunction(() => /^詢價\s*2/.test(document.querySelector('#admin-tab-inquiries').innerText.trim()), null, { timeout: 10000 });
    assert(true, '詢價分頁的待處理數量變成 2');
    await openAdminTab(page, '總覽');
    assert((await page.getByTestId('overview-pending').innerText()) === '2', '總覽的待處理數量變成 2');
  })
);

run('手機版：分頁可左右滑動、畫面不需橫向捲動、數字卡片直排', () =>
  withPage(
    async (page) => {
      await resetMock();
      await login(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(overflow <= 1, `頁面沒有橫向捲動（${overflow}px）`);
      const tablist = page.getByRole('tablist', { name: '後台功能' });
      const scrollable = await tablist.evaluate((el) => getComputedStyle(el).overflowX);
      assert(scrollable === 'auto', '分頁列可左右滑動');
      const cards = page.locator('.admin-stat');
      const [a, b] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()];
      assert(b.y > a.y + a.height - 1, '數字卡片直排');
      const tabHeight = (await page.getByRole('tab', { name: /^產品/ }).boundingBox()).height;
      assert(tabHeight >= 44, `分頁按鈕高度足夠點擊（${tabHeight}px）`);
    },
    { viewport: { width: 390, height: 844 } }
  )
);

run('登出回到登入頁', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page);
    await Promise.all([page.waitForURL(/\/admin\/login/, { timeout: 30000 }), page.getByRole('button', { name: '登出' }).click()]);
    assert(true, '登出後回到登入頁');
  })
);
