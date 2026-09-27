// E2E：後台產品列表與編輯流程（A7）
// 搜尋、分類與上架篩選、分頁、縮圖；編輯時顯示「正在編輯」與取消；複製產品；未存檔的圖片會被清除
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });
const CAT = { cylinder: '10000000-0000-4000-8000-000000000001', chain: '10000000-0000-4000-8000-000000000002' };
const SUB = { cylinder: '20000000-0000-4000-8000-000000000001', chain: '20000000-0000-4000-8000-000000000002' };

// 另外 23 筆：鏈條 8 筆（其中 3 筆未上架）、汽缸 15 筆；加上預設 2 筆共 25 筆
function extraProducts() {
  return Array.from({ length: 23 }, (_, i) => {
    const chain = i < 8;
    const n = String(i + 1).padStart(2, '0');
    return {
      id: `30000000-0000-4000-8000-0000000001${n}`,
      category_id: chain ? CAT.chain : CAT.cylinder,
      sub_category_id: chain ? SUB.chain : SUB.cylinder,
      model_number: `${chain ? 'CH' : 'CY'}-${n}`,
      name_i18n: { 'zh-TW': `${chain ? '鏈條' : '汽缸'}零件 ${n}`, 'zh-CN': '零件', en: 'Part' },
      specifications: [],
      stock_quantity: 1,
      is_active: !(chain && i < 3),
    };
  });
}

async function openProducts(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await page.getByText(/共 \d+ 筆，第 1 \/ \d+ 頁/).last().waitFor({ timeout: 30000 });
}

const productRows = (page) => page.locator('tr', { has: page.getByRole('button', { name: '複製' }) });

run('搜尋、分類與上架篩選、分頁、縮圖', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('products', extraProducts());
    await openProducts(page);

    await page.getByText('共 25 筆，第 1 / 2 頁').waitFor();
    assert((await productRows(page).count()) === 20, '第 1 頁 20 筆');
    assert((await productRows(page).first().locator('img').count()) === 1, '每列有縮圖');
    const firstCells = await productRows(page).first().locator('td').allInnerTexts();
    assert(firstCells.some((t) => t.includes('標準汽缸')), `分類欄同時顯示子分類（${firstCells.join(' | ')}）`);

    await page.getByRole('button', { name: '下一頁' }).last().click();
    await page.getByText('共 25 筆，第 2 / 2 頁').waitFor();
    assert((await productRows(page).count()) === 5, '第 2 頁 5 筆');

    await page.getByRole('combobox', { name: '依大分類篩選' }).selectOption('chain');
    await page.getByText('共 8 筆，第 1 / 1 頁').waitFor();
    assert(true, '篩選鏈條後 8 筆並回到第 1 頁');
    await page.getByRole('combobox', { name: '依上架狀態篩選' }).selectOption('inactive');
    await page.getByText('共 3 筆，第 1 / 1 頁').waitFor();
    assert(true, '再篩選未上架剩 3 筆');

    await page.getByRole('combobox', { name: '依大分類篩選' }).selectOption('all');
    await page.getByRole('combobox', { name: '依上架狀態篩選' }).selectOption('all');
    await page.getByRole('searchbox', { name: '搜尋產品' }).fill('汽缸零件 15');
    await page.getByText('共 1 筆，第 1 / 1 頁').waitFor();
    assert(await productRows(page).first().getByText('CY-15').isVisible(), '以名稱搜尋找到 CY-15');
  })
);

run('編輯：捲到表單、顯示正在編輯、可取消', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('products', extraProducts());
    await openProducts(page);

    // 1HV 依型號排序在第 1 頁；先捲到頁面底部再按編輯，確認會捲回表單
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await productRows(page).filter({ hasText: '1HV-11311-00' }).getByRole('button', { name: '編輯' }).click();
    const banner = page.getByTestId('editing-banner');
    await banner.waitFor();
    assert((await banner.innerText()).includes('正在編輯：1HV-11311-00'), '顯示正在編輯的型號');
    await page.waitForTimeout(800);
    const top = await page.getByTestId('admin-product-form').evaluate((el) => el.getBoundingClientRect().top);
    assert(top > -50 && top < 400, `表單已捲到畫面上（top=${Math.round(top)}）`);
    assert(await page.getByLabel('型號').evaluate((el) => el === document.activeElement), '游標在型號欄');

    await banner.getByRole('button', { name: '取消編輯' }).click();
    await banner.waitFor({ state: 'detached' });
    assert((await page.getByLabel('型號').inputValue()) === '', '取消後表單清空');
    assert(await page.getByRole('button', { name: '新增產品' }).isVisible(), '回到新增模式');
  })
);

run('複製產品：型號留空、預設不上架，存檔後成為新產品', () =>
  withPage(async (page) => {
    await resetMock();
    await openProducts(page);
    await productRows(page).filter({ hasText: '5TJ-11311-00' }).getByRole('button', { name: '複製' }).click();
    await page.getByText('已複製 5TJ-11311-00').waitFor();
    assert((await page.getByLabel('型號').inputValue()) === '', '型號留空');
    assert((await page.getByLabel('名稱（en）').inputValue()) === 'Cylinder Body B', '名稱已帶入');
    assert(!(await page.getByLabel('上架', { exact: true }).isChecked()), '預設不上架');

    await page.getByLabel('型號').fill('5TJ-11311-01');
    await page.getByRole('button', { name: '新增產品' }).click();
    await page.getByText('產品新增成功').waitFor({ timeout: 30000 });
    const { tables } = await mockState();
    const copy = tables.products.find((p) => p.model_number === '5TJ-11311-01');
    const original = tables.products.find((p) => p.model_number === '5TJ-11311-00');
    assert(copy && copy.id !== original.id && copy.name_i18n.en === 'Cylinder Body B', '新增為另一筆產品，原產品不變');
  })
);

run('上傳後沒有存檔的圖片會被清除', () =>
  withPage(async (page) => {
    await resetMock();
    await openProducts(page);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xh-img-'));
    const imgA = path.join(dir, 'a.jpg');
    const imgB = path.join(dir, 'b.jpg');
    fs.copyFileSync('images/products/cylinder/cylinder-003.jpg', imgA);
    fs.copyFileSync('images/products/cylinder/cylinder-003.jpg', imgB);

    await productRows(page).filter({ hasText: '1HV-11311-00' }).getByRole('button', { name: '編輯' }).click();
    const fileInput = page.getByLabel('上傳主圖');
    await fileInput.setInputFiles(imgA);
    await page.getByText('圖片上傳成功').waitFor({ timeout: 30000 });
    assert((await mockState()).storage.length === 1, '第一張已上傳');
    assert(await page.getByAltText('目前的主圖').isVisible(), '表單顯示圖片預覽');

    await fileInput.setInputFiles(imgB);
    await page.waitForFunction(async () => true);
    await page.waitForTimeout(1500);
    let storage = (await mockState()).storage;
    assert(storage.length === 1 && storage[0].endsWith('b.jpg'), `換圖後第一張已刪除（${storage.join(', ')}）`);

    await page.getByTestId('editing-banner').getByRole('button', { name: '取消編輯' }).click();
    await page.waitForTimeout(1500);
    storage = (await mockState()).storage;
    assert(storage.length === 0, `取消編輯後未存檔的圖片已刪除（剩 ${storage.length}）`);
    const { tables } = await mockState();
    assert(!tables.product_images.length, '產品圖片沒有被改動');
  })
);
