// E2E：後台產品表單不預填測試資料、沒有偵錯工具（A2）
// 使用模擬 Supabase：
//   node tests/e2e/mock-supabase.cjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon \
//   SUPABASE_SERVICE_ROLE_KEY=service ADMIN_EMAILS=admin@example.com npx next dev -p 3100
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();

async function loginAdmin(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
}

run('產品表單預設空白、不預設上架，沒有偵錯工具', () =>
  withPage(async (page) => {
    await resetMock();
    // 模擬舊版留在瀏覽器的偵錯紀錄
    await page.goto(`${BASE_URL}/zh-TW`);
    await page.evaluate(() => localStorage.setItem('admin-debug-logs', '[{"payload":"old"}]'));

    await loginAdmin(page);
    const form = page.locator('form.admin-form', { hasText: '型號' });
    await form.waitFor({ timeout: 30000 });
    // 等分類載入完成（第一個分類會被自動選取）
    await page.waitForFunction(() => {
      const f = [...document.querySelectorAll('form.admin-form')].find((el) => el.textContent.includes('型號'));
      return f && f.querySelector('select') && f.querySelector('select').value !== '';
    });

    const values = await form.locator('input:not([type="checkbox"]):not([type="file"])').evaluateAll((els) => els.map((e) => e.value));
    const filled = values.filter((v) => v && v !== '0');
    assert(filled.length === 0, `文字欄位皆為空白（${JSON.stringify(filled)}）`);
    assert(!(await form.getByLabel('上架').isChecked()), '「上架」預設不勾選');

    const body = await page.locator('body').innerText();
    for (const text of ['偵錯面板', 'Build:', '前端狀態', '測試寫入日志', '填入測試資料', 'TEST-', '測試產品']) {
      assert(!body.includes(text), `畫面沒有「${text}」`);
    }
    const stored = await page.evaluate(() => localStorage.getItem('admin-debug-logs'));
    assert(stored === null, '瀏覽器中舊的偵錯紀錄已清除');
  })
);

run('手動填寫表單可新增產品，預設為不上架', () =>
  withPage(async (page) => {
    await resetMock();
    await loginAdmin(page);
    const form = page.locator('[data-testid="admin-product-form"]');
    await form.waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('[data-testid="admin-product-form"] select').value !== '');

    await form.getByLabel('子分類').selectOption({ label: '標準汽缸 (std)' });
    await form.getByLabel('型號').fill('NEW-001');
    await form.getByLabel('名稱（zh-TW）').fill('新汽缸');
    await form.getByLabel('名稱（zh-CN）').fill('新汽缸');
    await form.getByLabel('名稱（en）').fill('New Cylinder');
    await form.getByRole('button', { name: '新增產品' }).click();
    await page.getByText('產品新增成功').waitFor({ timeout: 30000 });

    const product = (await mockState()).tables.products.find((p) => p.model_number === 'NEW-001');
    assert(product, '產品已寫入資料庫');
    assert(product.is_active === false, '未勾選「上架」時存為不公開');
    await page.locator('tr', { hasText: 'NEW-001' }).waitFor();
    assert(true, '新產品出現在列表');
  })
);
