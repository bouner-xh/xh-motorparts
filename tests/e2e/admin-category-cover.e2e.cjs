// E2E：後台大分類可以上傳封面圖（老闆決定新增）
// 上傳前自動縮圖、換圖或移除後清掉沒人使用的舊圖檔、資料庫還沒有封面欄位時網站與後台照常運作
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');
const { writeLargePhoto } = require('./image-fixture.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const dropColumn = (table, column) =>
  fetch(`${MOCK_URL}/__mock/drop-column`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, column }) });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xh-cover-'));
// 目前還在儲存空間的檔案（state.storage）；storageMeta 是歷來上傳的大小紀錄，刪除後不會移除
const uploads = (state) => state.storage;
const metaOf = (state, file) => state.storageMeta[file];

async function openCategories(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, '分類');
  await page.getByRole('button', { name: '新增大分類' }).waitFor({ timeout: 30000 });
  const form = page.locator('form.admin-form', { hasText: '描述 (zh-TW)' });
  const row = page.locator('tbody tr', { hasText: 'cylinder' }).first();
  await row.waitFor({ timeout: 30000 });
  return { form, row };
}

const homeCoverSrc = async (page, name) => {
  await page.goto(`${BASE_URL}/zh-TW/products`);
  return page.locator(`img[alt="${name}"]`).first().getAttribute('src');
};

run('上傳封面：自動縮圖、儲存後前台分類卡片使用這張圖；換圖與移除後舊圖檔被清掉', () =>
  withPage(async (page) => {
    await resetMock();
    await page.goto(`${BASE_URL}/zh-TW`);
    const photo = path.join(tmp, 'cover.jpg');
    const size = await writeLargePhoto(page, photo);
    const { form, row } = await openCategories(page);

    await row.getByRole('button', { name: '編輯' }).click();
    await form.getByLabel('封面圖片').setInputFiles(photo);
    await page.getByText('封面上傳成功').waitFor({ timeout: 60000 });
    await form.locator('img[alt="目前的封面"]').waitFor();
    let state = await mockState();
    assert(uploads(state).length === 1, '上傳了一個檔案');
    assert(metaOf(state, uploads(state)[0]).bytes < size / 2, `上傳前已縮小（${metaOf(state, uploads(state)[0]).bytes} bytes，原檔 ${size}）`);
    assert(!state.tables.categories.find((c) => c.slug === 'cylinder').cover_image, '還沒按更新前，資料庫沒有封面');

    await form.getByRole('button', { name: '更新大分類' }).click();
    await page.getByText('儲存成功').waitFor({ timeout: 30000 });
    state = await mockState();
    const first = state.tables.categories.find((c) => c.slug === 'cylinder').cover_image;
    assert(first && first.includes(uploads(state)[0].split('/').pop()), `資料庫存了封面網址（${first}）`);
    assert((await homeCoverSrc(page, '汽缸')).includes(uploads(state)[0].split('/').pop()), '前台分類卡片使用上傳的封面');

    // 換一張：舊圖檔被刪除
    await page.goto(`${BASE_URL}/zh-TW/admin/dashboard`);
    await openAdminTab(page, '分類');
    const row2 = page.locator('tbody tr', { hasText: 'cylinder' }).first();
    await row2.getByRole('button', { name: '編輯' }).click();
    const small = path.join(tmp, 'cover2.jpg');
    await writeLargePhoto(page, small, { width: 800, height: 600 });
    await form.getByLabel('封面圖片').setInputFiles(small);
    await page.getByText('封面上傳成功').waitFor({ timeout: 60000 });
    await form.getByRole('button', { name: '更新大分類' }).click();
    await page.getByText('儲存成功').waitFor({ timeout: 30000 });
    state = await mockState();
    assert(uploads(state).length === 1, `換圖後只剩一個檔案（${uploads(state).length}）`);
    const second = state.tables.categories.find((c) => c.slug === 'cylinder').cover_image;
    assert(second !== first, '封面網址已換成新圖');

    // 移除封面：圖檔被刪除，資料庫沒有封面，卡片退回（此分類沒有產品照片 → 預設圖）
    await row2.getByRole('button', { name: '編輯' }).click();
    await form.getByRole('button', { name: '移除封面' }).click();
    await form.getByRole('button', { name: '更新大分類' }).click();
    await page.getByText('儲存成功').waitFor({ timeout: 30000 });
    state = await mockState();
    assert(uploads(state).length === 0, '移除後圖檔被刪除');
    assert(!state.tables.categories.find((c) => c.slug === 'cylinder').cover_image, '資料庫沒有封面');
    assert((await homeCoverSrc(page, '汽缸')).includes('/legacy-assets/no-image.jpg'), '卡片退回預設圖');
  })
);

run('上傳後取消編輯：沒存檔的封面圖檔被刪除', () =>
  withPage(async (page) => {
    await resetMock();
    await page.goto(`${BASE_URL}/zh-TW`);
    const photo = path.join(tmp, 'cover3.jpg');
    await writeLargePhoto(page, photo, { width: 800, height: 600 });
    const { form, row } = await openCategories(page);
    await row.getByRole('button', { name: '編輯' }).click();
    await form.getByLabel('封面圖片').setInputFiles(photo);
    await page.getByText('封面上傳成功').waitFor({ timeout: 60000 });
    assert(uploads(await mockState()).length === 1, '已上傳');
    await form.getByRole('button', { name: '清空表單' }).click();
    await page.waitForTimeout(1500);
    assert(uploads(await mockState()).length === 0, '清空表單後沒存檔的圖檔被刪除');
  })
);

run('資料庫還沒有封面欄位：網站與後台照常運作，儲存封面時提示先執行更新語法', () =>
  withPage(async (page) => {
    await resetMock();
    await dropColumn('categories', 'cover_image');
    await page.goto(`${BASE_URL}/zh-TW`);
    const photo = path.join(tmp, 'cover4.jpg');
    await writeLargePhoto(page, photo, { width: 800, height: 600 });

    // 前台：分類仍是資料庫的 2 個，不是備用的固定清單
    await page.goto(`${BASE_URL}/zh-TW/products`);
    assert((await page.locator('.category-card').count()) === 2, '前台照常顯示資料庫的分類');

    const { form, row } = await openCategories(page);
    await row.getByRole('button', { name: '編輯' }).click();
    // 沒有封面時儲存照常成功
    await form.getByLabel('名稱 (en)').fill('Cylinder renamed');
    await form.getByRole('button', { name: '更新大分類' }).click();
    await page.getByText('儲存成功').waitFor({ timeout: 30000 });
    // 有封面時提示先執行更新語法，不寫入
    await page.locator('tbody tr', { hasText: 'cylinder' }).first().getByRole('button', { name: '編輯' }).click();
    await form.getByLabel('封面圖片').setInputFiles(photo);
    await page.getByText('封面上傳成功').waitFor({ timeout: 60000 });
    await form.getByRole('button', { name: '更新大分類' }).click();
    await page.getByText(/20261009_category_cover\.sql/).waitFor({ timeout: 30000 });
    const { tables } = await mockState();
    assert(!('cover_image' in tables.categories.find((c) => c.slug === 'cylinder')), '沒有寫入封面');
  })
);
