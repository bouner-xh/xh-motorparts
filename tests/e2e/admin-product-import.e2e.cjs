// E2E：後台批量匯入（A1、A4）
// - Excel（.xlsx）與 ZIP 圖片可以匯入，不被 CSP 擋下
// - 既有產品只更新有填的語言名稱，規格與庫存沒填時保留原值；FALSE 視為不上架
// - 試算表有錯誤（型號重複等）時列出錯誤，不寫入資料
// - 大量資料分批送出
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const JSZip = require('jszip');
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');
const { buildXlsx } = require('./xlsx-fixture.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xh-import-'));
const HEADERS = ['model_number', 'name_zh_tw', 'name_en', 'category_slug', 'subcategory_slug', 'specifications', 'stock_quantity', 'is_active', 'image_filename'];

async function openImporter(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  const sheetInput = page.locator('input[type="file"][accept=".xlsx,.csv"]');
  await sheetInput.waitFor({ state: 'attached', timeout: 30000 });
  return sheetInput;
}

run('Excel＋ZIP 匯入：更新既有產品保留翻譯、FALSE 不上架、圖片綁定', () =>
  withPage(async (page) => {
    await resetMock();
    const blocked = [];
    // va.vercel-scripts.com 是 Vercel Analytics 在開發模式才載入的除錯腳本（正式環境從本站載入），與匯入無關
    page.on('console', (m) => {
      const text = m.text();
      // 127.0.0.1:54321 是測試用的模擬 Storage（正式環境圖片來自 *.supabase.co，CSP 已允許）
      if (/Content Security Policy|Refused to load/.test(text) && !text.includes('va.vercel-scripts.com') && !text.includes('127.0.0.1:54321')) blocked.push(text);
    });

    const xlsx = path.join(tmp, 'products.xlsx');
    fs.writeFileSync(
      xlsx,
      await buildXlsx([
        HEADERS,
        ['1HV-11311-00', '汽缸本體（新名稱）', '', 'cylinder', 'std', '', '', true, ''],
        ['XL-001', '新鏈條', 'New Chain', 'chain', 'chain-std', 'STD, 428', 7, false, ''],
        ['XL-002', '新汽缸', 'New Cylinder', 'cylinder', 'std', '', 3, 'TRUE', 'xl-002.jpg'],
      ])
    );
    const zip = new JSZip();
    zip.file('photos/xl-002.jpg', fs.readFileSync('images/products/cylinder/cylinder-003.jpg'));
    const zipPath = path.join(tmp, 'images.zip');
    fs.writeFileSync(zipPath, await zip.generateAsync({ type: 'nodebuffer' }));

    const sheetInput = await openImporter(page);
    await sheetInput.setInputFiles(xlsx);
    await page.getByText(/已成功解析對照表，共計/).waitFor({ timeout: 30000 });
    assert(true, '.xlsx 解析成功');

    await page.locator('input[type="file"][accept=".zip"]').setInputFiles(zipPath);
    await page.getByText('✓ 圖片已匹配').waitFor({ timeout: 30000 });
    assert(true, 'ZIP 內的圖片（含子資料夾）比對成功');

    await page.getByRole('button', { name: '確認無誤，開始匯入' }).click();
    await page.getByText('批次匯入作業已完成').waitFor({ timeout: 60000 });
    const summary = await page.locator('text=共處理').innerText();
    assert(/共處理 3 筆產品，\s*其中成功 3 筆，\s*失敗 0 筆/.test(summary), `3 筆全部成功（${summary}）`);

    const { tables } = await mockState();
    const old = tables.products.find((p) => p.model_number === '1HV-11311-00');
    assert(old.name_i18n['zh-TW'] === '汽缸本體（新名稱）', '既有產品的繁中名稱已更新');
    assert(old.name_i18n.en === 'Cylinder Body' && old.name_i18n['zh-CN'] === '汽缸本体', '沒填的英文、簡中名稱保留原值');
    assert(old.specifications.join(',') === 'STD,47mm' && old.stock_quantity === 20, '沒填的規格與庫存保留原值');
    const chain = tables.products.find((p) => p.model_number === 'XL-001');
    assert(chain && chain.is_active === false, 'is_active 填 FALSE 的產品為不上架');
    assert(chain.specifications.join(',') === 'STD,428', '規格以逗號拆開');
    const withImage = tables.products.find((p) => p.model_number === 'XL-002');
    assert(tables.product_images.some((i) => i.product_id === withImage.id), 'ZIP 圖片已上傳並綁定產品');
    assert(blocked.length === 0, `沒有被 CSP 擋下的資源（${blocked.join(' / ')}）`);
  })
);

run('試算表有錯誤時列出問題、不寫入資料', () =>
  withPage(async (page) => {
    await resetMock();
    const csv = path.join(tmp, 'bad.csv');
    fs.writeFileSync(csv, [HEADERS.join(','), 'D-1,甲,,cylinder,std,,,,', 'D-1,乙,,cylinder,std,,,,', 'D-2,丙,,cylinder,std,,abc,,'].join('\n'));
    const sheetInput = await openImporter(page);
    await sheetInput.setInputFiles(csv);
    const box = page.locator('[data-testid="import-errors"]');
    await box.waitFor({ timeout: 30000 });
    const text = await box.innerText();
    assert(text.includes('型號 D-1 與第 2 列重複'), '指出重複的型號與列號');
    assert(text.includes('庫存「abc」'), '指出庫存格式錯誤');
    const { tables } = await mockState();
    assert(!tables.products.some((p) => p.model_number.startsWith('D-')), '沒有寫入任何資料');
  })
);

run('大量資料分批送出（120 筆 → 3 批）', () =>
  withPage(async (page) => {
    await resetMock();
    const lines = [HEADERS.join(',')];
    for (let i = 1; i <= 120; i++) lines.push(`BULK-${String(i).padStart(3, '0')},大量${i},Bulk ${i},cylinder,std,"STD, ${i}MM",${i},TRUE,`);
    const csv = path.join(tmp, 'bulk.csv');
    fs.writeFileSync(csv, lines.join('\r\n'));

    const batchSizes = [];
    page.on('request', (req) => {
      if (req.url().endsWith('/api/admin/products/batch')) batchSizes.push(JSON.parse(req.postData()).products.length);
    });
    const sheetInput = await openImporter(page);
    await sheetInput.setInputFiles(csv);
    await page.getByRole('button', { name: '略過圖片，直接進入匹配步驟' }).click();
    await page.getByRole('button', { name: '確認無誤，開始匯入' }).click();
    await page.getByText('批次匯入作業已完成').waitFor({ timeout: 120000 });

    assert(batchSizes.join(',') === '50,50,20', `分 3 批送出（${batchSizes.join(',')}）`);
    const { tables } = await mockState();
    const bulk = tables.products.filter((p) => p.model_number.startsWith('BULK-'));
    assert(bulk.length === 120, `120 筆全部寫入（${bulk.length}）`);
    assert(bulk[9].specifications.join(',') === 'STD,10MM', 'CSV 引號內的逗號正確解析');
  })
);

run('可以下載範例檔', () =>
  withPage(async (page) => {
    await openImporter(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '下載範例檔' }).click()]);
    const content = fs.readFileSync(await download.path(), 'utf8');
    assert(download.suggestedFilename() === 'product-import-template.csv', '檔名正確');
    assert(content.includes('model_number,name_zh_tw') && content.includes('CYL-001'), '內容包含欄位名稱與範例列');
  })
);
