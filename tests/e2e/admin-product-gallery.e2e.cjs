// E2E：一個產品多張圖片（U9，上限 8 張）
// 後台一次上傳多張、調整順序、設為主圖、移除、儲存；產品頁圖庫與給搜尋引擎的結構化資料
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });
const P1 = '30000000-0000-4000-8000-000000000001';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xh-gallery-'));
const photos = ['cylinder-001.jpg', 'cylinder-002.jpg', 'cylinder-003.jpg', 'cylinder-004.jpg'].map((name, i) => {
  const dest = path.join(tmp, `p${i + 1}.jpg`);
  fs.copyFileSync(path.join('images/products/cylinder', name), dest);
  return dest;
});

async function openEdit(page, model = '1HV-11311-00') {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, '產品');
  const row = page.getByRole('row', { name: new RegExp(model) });
  await row.waitFor({ timeout: 30000 });
  await row.getByRole('button', { name: '編輯' }).click();
  return page.locator('[data-testid="admin-product-form"]');
}

const imageRows = async () => (await mockState()).tables.product_images.filter((r) => r.product_id === P1).sort((a, b) => a.sort_order - b.sort_order);

run('後台：一次上傳三張、設為主圖、調整順序、移除，儲存後資料庫順序正確', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openEdit(page);
    await form.getByLabel('上傳圖片').setInputFiles(photos.slice(0, 3));
    await page.getByText('圖片上傳成功（3 張）').waitFor({ timeout: 60000 });
    const gallery = page.getByTestId('admin-gallery');
    assert((await gallery.locator('li').count()) === 3, '清單有 3 張');
    assert((await gallery.innerText()).includes('3 / 8 張'), '顯示張數');

    // 第三張設為主圖 → 原本的第一、二張順延
    await gallery.getByRole('button', { name: '把第 3 張設為主圖' }).click();
    // 把目前第二張往後移一格
    await gallery.getByRole('button', { name: '第 2 張往後移' }).click();
    // 移除最後一張（還沒存檔的圖檔會立刻刪除）
    await gallery.getByRole('button', { name: '移除第 3 張' }).click();
    await page.waitForTimeout(1200);
    assert((await gallery.locator('li').count()) === 2, '移除後剩 2 張');
    assert((await mockState()).storage.length === 2, '被移除的未存檔圖檔已刪除');

    // 模擬的儲存空間不提供圖片內容，畫面上的圖會退成 No Image，所以用清單上記錄的原始網址比對順序
    const expected = await gallery.locator('li').evaluateAll((items) => items.map((li) => li.getAttribute('data-image-url')));
    await form.getByRole('button', { name: '更新產品' }).click();
    await page.getByText('產品更新成功').waitFor({ timeout: 30000 });
    const rows = await imageRows();
    assert(rows.length === 2 && rows.map((r) => r.sort_order).join() === '0,1', `資料庫兩張圖，順序 0、1（${rows.map((r) => r.sort_order)}）`);
    assert(expected.length === 2 && rows.every((r, i) => r.storage_path === expected[i]) && expected[0].endsWith('p3.jpg') && expected[1].endsWith('p2.jpg'), `資料庫順序與畫面一致：第三張成為主圖、第二張在後（畫面 ${JSON.stringify(expected)}）`);
  })
);

run('超過 8 張：多的被略過並說明；已滿時上傳被擋下', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openEdit(page);
    const many = [...photos, ...photos]; // 8 張
    await form.getByLabel('上傳圖片').setInputFiles(many);
    await page.getByText('圖片上傳成功（8 張）').waitFor({ timeout: 120000 });
    assert((await page.getByTestId('admin-gallery').locator('li').count()) === 8, '清單 8 張');
    assert(await form.getByLabel('上傳圖片').isDisabled(), '滿 8 張後上傳欄位停用');

    const api = await page.evaluate(async (id) => {
      const r = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, category: 'cylinder', subCategoryId: '20000000-0000-4000-8000-000000000001', modelNumber: '1HV-11311-00', nameEn: 'X', images: Array.from({ length: 9 }, (_, i) => `images/products/cylinder/x${i}.jpg`) })
      });
      return { status: r.status, body: await r.json() };
    }, P1);
    assert(api.status === 400 && api.body.error.includes('圖片最多 8 張'), `API 超過 8 張回 400（${api.body.error}）`);
  })
);

run('前台：多張圖有縮圖列、點縮圖切換大圖、結構化資料有全部圖片；單張圖沒有縮圖列', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('product_images', [
      { id: '40000000-0000-4000-8000-0000000000f1', product_id: P1, storage_path: 'images/products/cylinder/cylinder-001.jpg', sort_order: 0 },
      { id: '40000000-0000-4000-8000-0000000000f2', product_id: P1, storage_path: 'images/products/cylinder/cylinder-002.jpg', sort_order: 1 },
      { id: '40000000-0000-4000-8000-0000000000f3', product_id: P1, storage_path: 'images/products/cylinder/cylinder-003.jpg', sort_order: 2 }
    ]);
    await page.goto(`${BASE_URL}/en/products/cylinder/std/1HV-11311-00`);
    const main = page.locator('.detail-media > img').first();
    await main.waitFor();
    assert((await main.getAttribute('src')).includes('cylinder-001.jpg'), '大圖是第一張');
    const thumbs = page.locator('.product-gallery__thumb');
    assert((await thumbs.count()) === 3, '有 3 個縮圖');
    await page.getByRole('button', { name: 'Image 3 of 3' }).click();
    assert((await main.getAttribute('src')).includes('cylinder-003.jpg'), '點第三個縮圖，大圖換成第三張');
    assert((await thumbs.nth(2).getAttribute('aria-current')) === 'true', '目前的縮圖有標示');

    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    const images = JSON.parse(ld).image;
    assert(images.length === 3 && images.every((u) => u.startsWith('http')) && images[0].includes('cylinder-001.jpg'), `結構化資料有 3 張完整網址（${images.length}）`);

    // 另一個只有一張圖的產品：沒有縮圖列
    await seed('product_images', [{ id: '40000000-0000-4000-8000-0000000000f4', product_id: '30000000-0000-4000-8000-000000000002', storage_path: 'images/products/cylinder/cylinder-002.jpg', sort_order: 0 }]);
    await page.goto(`${BASE_URL}/en/products/cylinder/std/5TJ-11311-00`);
    await page.locator('.detail-media > img').first().waitFor();
    assert((await page.locator('.product-gallery__thumb').count()) === 0, '只有一張圖時沒有縮圖列');
  })
);
