// E2E：產品表單好用度（產品上架檢查 P4、P6、P7，2026-10-04）
// P4 規格可用全形逗號、頓號分隔；P6 錯誤訊息指出欄位與型號；P7 用語與進階圖片網址
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();

async function openForm(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, '產品');
  const form = page.locator('form.admin-form', { hasText: '型號' });
  await form.waitFor({ timeout: 30000 });
  await page.waitForFunction(() => {
    const f = [...document.querySelectorAll('form.admin-form')].find((el) => el.textContent.includes('型號'));
    return f && f.querySelectorAll('select')[1] && f.querySelectorAll('select')[1].options.length > 1;
  });
  return form;
}

async function fillBasics(form, model) {
  const sub = form.getByLabel('子分類');
  const value = await sub.locator('option').evaluateAll((o) => o.map((x) => x.value).filter(Boolean)[0]);
  await sub.selectOption(value);
  await form.getByLabel('型號', { exact: true }).fill(model);
  await form.getByLabel('名稱（zh-TW）').fill('測試汽缸');
  await form.getByLabel('名稱（zh-CN）').fill('测试汽缸');
  await form.getByLabel('名稱（en）').fill('Test Cylinder');
}

const status = (page) => page.locator('form.admin-form + p');

run('規格用全形逗號、頓號分隔時拆成多個標籤', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openForm(page);
    await fillBasics(form, 'SPEC-01');
    await form.getByLabel(/^規格/).fill('STD，47MM、50MM');
    await form.getByRole('button', { name: '新增產品' }).click();
    await page.getByText('產品新增成功').waitFor({ timeout: 30000 });
    const product = (await mockState()).tables.products.find((p) => p.model_number === 'SPEC-01');
    assert(product && product.specifications.join('|') === 'STD|47MM|50MM', `規格存成 3 個（${JSON.stringify(product && product.specifications)}）`);
  })
);

run('錯誤訊息指出欄位：庫存小數、型號重複、欄位太長', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openForm(page);
    await fillBasics(form, 'STOCK-01');
    await form.getByLabel('庫存').fill('1.5');
    await form.getByRole('button', { name: '新增產品' }).click();
    await page.getByText('庫存必須是 0 以上的整數').waitFor({ timeout: 10000 });
    assert(!(await mockState()).tables.products.some((p) => p.model_number === 'STOCK-01'), '庫存填小數：提示並且沒有存檔');

    await form.getByLabel('庫存').fill('3');
    await form.getByLabel('型號', { exact: true }).fill('1HV-11311-00');
    await form.getByRole('button', { name: '新增產品' }).click();
    await page.getByText('型號「1HV-11311-00」已經存在').waitFor({ timeout: 30000 });
    assert(!(await status(page).innerText()).includes('slug'), '型號重複：指出型號，不出現 slug');

    const res = await page.request.post(`${BASE_URL}/api/admin/products`, {
      data: { category: 'cylinder', subCategoryId: '20000000-0000-4000-8000-000000000001', modelNumber: 'M'.repeat(101), nameZhTw: 'a', nameZhCn: 'a', nameEn: 'a', stockQuantity: 1 }
    });
    const body = await res.json();
    assert(res.status() === 400 && body.error === '請修正：型號太長（最多 100 字）', `API 指出欄位（${body.error}）`);
  })
);

run('用語：標題白話、圖片網址收在進階', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openForm(page);
    const heading = await page.getByRole('heading', { name: '產品管理' }).count();
    assert(heading === 1, '標題為「產品管理」');
    assert((await page.getByText(/CRUD/).count()) === 0, '沒有工程用語 CRUD');
    const urlInput = form.getByLabel('圖片網址');
    assert(!(await urlInput.isVisible()), '圖片網址預設收合');
    await form.getByText('進階：手動指定圖片網址').click();
    assert(await urlInput.isVisible(), '展開進階後可以填寫');
    assert(await form.getByText(/其他網站的圖片網址在前台會被安全設定擋住/).isVisible(), '說明外部網址無法顯示');
  })
);
