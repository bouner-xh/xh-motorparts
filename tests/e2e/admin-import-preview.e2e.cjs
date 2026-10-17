// E2E：後台批量匯入預覽與結果（網站健診 UX-14、UX-29、UX-18，桌機 1366×768）
// 預覽的「動作」「分類」欄位、擋下名稱全空的新產品、新建分類要勾選確認、
// 結果頁新增／更新／失敗數、下載失敗清單 CSV、只重試失敗的列、匯入進行中離開頁面的警告
// 使用模擬 Supabase（啟動方式同 admin-product-import.e2e.cjs）
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const post = (p, body) => fetch(`${MOCK_URL}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xh-preview-'));
const DESKTOP = { viewport: { width: 1366, height: 768 } };
const CAT = '10000000-0000-4000-8000-000000000001';
const SUB = '20000000-0000-4000-8000-000000000001';
const HEADERS = ['model_number', 'name_zh_tw', 'name_en', 'category_slug', 'subcategory_slug', 'specifications', 'stock_quantity', 'is_active', 'image_filename'];

const dupProduct = (n) => ({ id: `30000000-0000-4000-8000-00000000090${n}`, category_id: CAT, sub_category_id: SUB, model_number: 'DUP-1', name_i18n: { en: `Dup ${n}` }, specifications: [], stock_quantity: 1, is_active: true });

async function prepare() {
  await post('/__mock/reset');
  await post('/__mock/migrate-url-key'); // 允許同型號有多個產品
  await post('/__mock/seed', { table: 'products', rows: [dupProduct(1), dupProduct(2)] });
}

async function openImporter(page, csvRows) {
  const csv = path.join(tmp, `rows-${Date.now()}.csv`);
  fs.writeFileSync(csv, [HEADERS.join(','), ...csvRows].join('\n'));
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, '批量匯入');
  const sheetInput = page.locator('input[type="file"][accept=".xlsx,.csv"]');
  await sheetInput.waitFor({ state: 'attached', timeout: 30000 });
  await sheetInput.setInputFiles(csv);
  await page.getByRole('button', { name: '略過圖片，直接進入匹配步驟' }).click();
  await page.getByText(/正在比對現有產品與分類/).waitFor({ state: 'detached', timeout: 30000 });
}

const ROWS = [
  '1HV-11311-00,汽缸本體（新名稱）,,cylinder,std,,,,',
  'NEW-OK,新品,New,cylinder,std,,,,',
  'NEW-SUB,新子分類品,,cylinder,bigbore,,,,',
  'NEW-CAT,打錯分類,,cyilnder,typo-std,,,,',
  'DUP-1,重複型號,,cylinder,std,,,,',
  'NO-NAME,,,cylinder,std,,,,',
];

const row = (page, model) => page.locator(`tr[data-model="${model}"]`);

run('預覽：動作與分類欄位、名稱全空的新產品擋下、新建分類要勾選確認', () =>
  withPage(async (page) => {
    await prepare();
    await openImporter(page, ROWS);
    const action = (m) => row(page, m).locator('[data-col="action"]').innerText();
    const category = (m) => row(page, m).locator('[data-col="category"]').innerText();

    assert((await action('1HV-11311-00')).includes('更新既有'), '既有型號：更新既有');
    assert((await action('NEW-OK')).includes('新增'), '新型號：新增');
    assert((await action('DUP-1')).includes('多筆同型號無法更新'), '同型號有多筆：無法更新');
    assert((await category('NEW-OK')).includes('既有'), '既有分類標「既有」');
    assert((await category('NEW-SUB')).includes('將新建子分類'), '新子分類標醒目');
    assert((await category('NEW-CAT')).includes('將新建大分類'), '新大分類（代號打錯字）標醒目');
    const badge = row(page, 'NEW-CAT').locator('.admin-import-badge--newcat');
    assert((await badge.evaluate((el) => getComputedStyle(el).backgroundColor)) === 'rgb(251, 191, 36)', '新建分類用醒目的黃底');

    const startButton = page.getByRole('button', { name: '確認無誤，開始匯入' });
    assert(await startButton.isDisabled(), '有問題時不能匯入');
    const blocked = page.getByTestId('import-blocked');
    assert(/1 個新產品沒有任何語言的名稱/.test(await blocked.innerText()), '紅字指出名稱全空的新產品');
    assert((await action('NO-NAME')).includes('沒有名稱'), '該列標紅');
    assert((await row(page, 'NO-NAME').evaluate((el) => getComputedStyle(el.querySelector('td')).backgroundColor)) !== 'rgba(0, 0, 0, 0)', '該列有紅底');

    const summary = page.getByTestId('import-new-categories');
    const summaryText = await summary.innerText();
    assert(summaryText.includes('將新建 1 個大分類、2 個子分類：') && summaryText.includes('cyilnder') && summaryText.includes('cylinder/bigbore'), `摘要列出新建的分類（${summaryText.split('\n')[0]}）`);

    await row(page, 'NO-NAME').getByRole('button', { name: '移除此列' }).click();
    assert((await row(page, 'NO-NAME').count()) === 0, '移除此列後預覽少一列');
    assert((await page.getByTestId('import-blocked').count()) === 0, '擋下的提示消失');
    assert(await startButton.isDisabled(), '還沒勾選確認新建分類，仍不能匯入');
    await summary.getByLabel('我確認要新建這些分類').check();
    assert(await startButton.isEnabled(), '勾選確認後可以匯入');
    await summary.getByLabel('我確認要新建這些分類').uncheck();
    assert(await startButton.isDisabled(), '取消勾選又擋下');
  }, DESKTOP)
);

run('結果頁：新增／更新／失敗數；下載失敗清單 CSV；只重試失敗的列', () =>
  withPage(async (page) => {
    await prepare();
    await openImporter(page, ROWS.filter((r) => !r.startsWith('NO-NAME')));
    await page.getByLabel('我確認要新建這些分類').check();
    const batches = [];
    let uploads = 0;
    page.on('request', (req) => {
      if (req.url().endsWith('/api/admin/products/batch')) batches.push(JSON.parse(req.postData()).products.map((p) => p.modelNumber));
      if (req.url().endsWith('/api/admin/upload-image')) uploads++;
    });
    await page.getByRole('button', { name: '確認無誤，開始匯入' }).click();
    await page.getByText('批次匯入作業已完成').waitFor({ timeout: 60000 });

    const breakdown = page.getByTestId('import-breakdown');
    assert((await breakdown.innerText()).replace(/\s+/g, '') === '新增3筆、更新1筆、失敗1筆', `結果頁顯示新增／更新／失敗數（${await breakdown.innerText()}）`);
    assert(/共處理 5 筆產品，\s*其中成功 4 筆，\s*失敗 1 筆/.test(await page.locator('text=共處理').innerText()), '原有的總數說明仍在');
    const failures = await page.locator('#admin-panel-import li', { hasText: 'DUP-1' }).innerText();
    assert(failures.includes('有多個產品'), `失敗清單列出型號與原因（${failures}）`);

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '下載失敗清單 CSV' }).click()]);
    const csv = fs.readFileSync(await download.path(), 'utf8');
    assert(download.suggestedFilename() === 'import-failed.csv', '檔名 import-failed.csv');
    assert(csv.includes('DUP-1,') && csv.includes('有多個產品') && !csv.includes('NEW-OK'), `CSV 只含失敗的型號與原因（${csv.replace(/\s+/g, ' ')}）`);

    // 修好原因（刪掉重複的那一筆）後，只重試失敗的列，不必重傳檔案
    const list = await (await page.request.get(`${BASE_URL}/api/admin/products`)).json();
    const dup = list.items.find((p) => p.modelNumber === 'DUP-1');
    await page.request.delete(`${BASE_URL}/api/admin/products?id=${dup.id}`);
    batches.length = 0;
    await page.getByRole('button', { name: '只重試失敗的列' }).click();
    await page.getByTestId('import-breakdown').getByText('失敗').waitFor();
    await page.waitForFunction(() => /失敗\s*0\s*筆/.test(document.querySelector('[data-testid="import-breakdown"]')?.textContent || ''), null, { timeout: 60000 });
    assert(batches.length === 1 && batches[0].join() === 'DUP-1', `只重送失敗的列（${JSON.stringify(batches)}）`);
    assert(uploads === 0, '沒有重新上傳圖片');
    assert((await page.getByTestId('import-breakdown').innerText()).replace(/\s+/g, '') === '新增3筆、更新2筆、失敗0筆', `重試後統計（${await page.getByTestId('import-breakdown').innerText()}）`);
    assert((await page.getByRole('button', { name: '只重試失敗的列' }).count()) === 0, '沒有失敗時不再顯示重試與下載按鈕');
    const { tables } = await mockState();
    assert(tables.products.filter((p) => p.model_number === 'DUP-1').length === 1, '資料庫只剩一筆 DUP-1');
    assert(tables.categories.some((c) => c.slug === 'cyilnder'), '勾選確認後確實新建了分類');
  }, DESKTOP)
);

run('匯入進行中離開頁面：跳出瀏覽器的離開確認；匯入前不打擾', () =>
  withPage(async (page) => {
    await prepare();
    await openImporter(page, ['1HV-11311-00,汽缸本體（新名稱）,,cylinder,std,,,,']);
    const seen = [];
    page.on('dialog', async (d) => {
      seen.push(d.type());
      await d.dismiss();
    });
    await page.route('**/api/admin/products/batch', async (route) => {
      await new Promise((r) => setTimeout(r, 2500));
      await route.continue();
    });
    await page.mouse.click(5, 300);
    await page.getByRole('button', { name: '確認無誤，開始匯入' }).click();
    await page.getByText(/正在寫入資料庫/).waitFor();
    await page.evaluate(() => setTimeout(() => location.reload(), 0));
    await page.waitForTimeout(800);
    assert(seen.includes('beforeunload'), `匯入中重新整理：跳出離開確認（${seen.join()}）`);
    await page.getByText('批次匯入作業已完成').waitFor({ timeout: 30000 });
    seen.length = 0;
    await page.evaluate(() => setTimeout(() => location.reload(), 0));
    await page.waitForLoadState('load');
    await page.waitForTimeout(800);
    assert(!seen.includes('beforeunload'), '匯入完成後重新整理不再打擾');
  }, DESKTOP)
);
