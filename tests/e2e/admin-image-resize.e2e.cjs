// E2E：產品照片上傳前自動縮圖（P1，2026-10-04）
// 手機照片常有數 MB，前台不經過伺服器壓縮會直接傳給買家；上傳前在瀏覽器縮到長邊 1600px 並壓縮
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const JSZip = require('jszip');
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');
const { writeLargePhoto } = require('./image-fixture.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xh-resize-'));
const MAX_UPLOADED = 600 * 1024;

async function login(page, tab) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, tab);
}

const uploads = (state) => Object.entries(state.storageMeta);
const kb = (n) => `${Math.round(n / 1024)} KB`;

run('產品表單：大張照片上傳前自動縮小，小圖維持原檔', () =>
  withPage(async (page) => {
    await resetMock();
    await page.goto(`${BASE_URL}/zh-TW`);
    const big = path.join(tmp, 'phone-photo.jpg');
    const bigSize = await writeLargePhoto(page, big);
    assert(bigSize > 2 * 1024 * 1024, `測試照片約 ${kb(bigSize)}（模擬手機照片）`);

    await login(page, '產品');
    const row = page.locator('tbody tr', { hasText: '1HV-11311-00' });
    await row.waitFor({ timeout: 30000 });
    await row.getByRole('button', { name: '編輯' }).click();
    const input = page.getByLabel('上傳圖片');
    await input.setInputFiles(big);
    await page.getByText('圖片上傳成功').waitFor({ timeout: 60000 });

    let list = uploads(await mockState());
    assert(list.length === 1, '上傳了一個檔案');
    const [bigPath, bigMeta] = list[0];
    assert(bigMeta.bytes < MAX_UPLOADED, `上傳的檔案為 ${kb(bigMeta.bytes)}（原檔 ${kb(bigSize)}）`);
    assert(/image\/(webp|jpeg)/.test(bigMeta.contentType) && /\.(webp|jpg)$/.test(bigPath), `轉為 ${bigMeta.contentType}，檔名副檔名一致`);

    // 已經夠小的圖片不重新壓縮
    const small = 'images/products/cylinder/cylinder-003.jpg';
    const smallSize = fs.statSync(small).size;
    await input.setInputFiles(small);
    await page.waitForFunction(() => true);
    await page.waitForTimeout(2000);
    list = uploads(await mockState());
    const smallUpload = list.find(([p]) => p !== bigPath);
    assert(smallUpload && smallUpload[1].bytes === smallSize, `小圖（${kb(smallSize)}）維持原檔上傳`);

    await page.getByRole('button', { name: '更新產品' }).click();
    await page.getByText('產品更新成功').waitFor({ timeout: 30000 });
    assert(true, '存檔成功');
  })
);

run('批量匯入：ZIP 內的大張照片也會自動縮小', () =>
  withPage(async (page) => {
    await resetMock();
    await page.goto(`${BASE_URL}/zh-TW`);
    const big = path.join(tmp, 'zip-photo.jpg');
    const bigSize = await writeLargePhoto(page, big);
    const zip = new JSZip();
    zip.file('rz-001.jpg', fs.readFileSync(big));
    const zipPath = path.join(tmp, 'photos.zip');
    fs.writeFileSync(zipPath, await zip.generateAsync({ type: 'nodebuffer' }));
    const csv = path.join(tmp, 'products.csv');
    fs.writeFileSync(csv, 'model_number,name_zh_tw,name_en,category_slug,subcategory_slug,image_filename\nRZ-001,縮圖測試,Resize Test,cylinder,std,rz-001.jpg\n');

    await login(page, '批量匯入');
    await page.locator('input[type="file"][accept=".xlsx,.csv"]').setInputFiles(csv);
    await page.getByText(/已成功解析對照表，共計/).waitFor({ timeout: 30000 });
    await page.locator('input[type="file"][accept=".zip"]').setInputFiles(zipPath);
    await page.getByText('✓ 圖片已匹配').waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: '確認無誤，開始匯入' }).click();
    await page.getByText('批次匯入作業已完成').waitFor({ timeout: 90000 });

    const state = await mockState();
    const list = uploads(state);
    assert(list.length === 1, '上傳了一個檔案');
    assert(list[0][1].bytes < MAX_UPLOADED, `上傳的檔案為 ${kb(list[0][1].bytes)}（原檔 ${kb(bigSize)}）`);
    const product = state.tables.products.find((p) => p.model_number === 'RZ-001');
    assert(product && state.tables.product_images.some((i) => i.product_id === product.id), '產品已建立並綁定圖片');
  })
);
