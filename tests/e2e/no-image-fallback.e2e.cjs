// E2E：沒有圖片或圖片載入失敗時，顯示 SVG 的「No Image」圖，不顯示破圖
// 使用模擬 Supabase（啟動方式同 product-urls.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });
const P1 = '30000000-0000-4000-8000-000000000001';
const BROKEN = 'images/products/missing/no-such-file.jpg';
const isPlaceholder = (src) => new URL(src, BASE_URL).pathname === '/no-image.svg';

run('預設圖是 SVG：網址可開啟、類型正確，內容有 No Image 字樣', () =>
  withPage(async (page) => {
    const res = await page.request.get(`${BASE_URL}/no-image.svg`);
    assert(res.status() === 200 && (res.headers()['content-type'] || '').includes('image/svg+xml'), `回應 200 svg（${res.status()} ${res.headers()['content-type']}）`);
    const body = await res.text();
    assert(body.includes('<svg') && body.includes('NO IMAGE'), '內容是 SVG，並有 NO IMAGE 字樣');
    assert((await page.request.get(`${BASE_URL}/legacy-assets/no-image.jpg`)).status() === 404, '舊的 no-image.jpg 已移除');
  })
);

run('沒有圖片的產品：卡片與產品頁都顯示 No Image 圖', () =>
  withPage(async (page) => {
    await resetMock();
    for (const path of ['/en/products/cylinder/std', '/en/products/cylinder/std/1HV-11311-00']) {
      await page.goto(`${BASE_URL}${path}`);
      const img = page.locator('main img[alt*="1HV-11311-00"]').first();
      await img.waitFor({ state: 'attached' });
      assert(isPlaceholder(await img.getAttribute('src')), `${path} 沒有圖片時使用 No Image 圖（${await img.getAttribute('src')}）`);
      await page.waitForFunction((el) => el.complete && el.naturalWidth > 0, await img.elementHandle());
    }
  })
);

run('圖片網址失效：卡片、產品頁、分類卡片自動換成 No Image 圖，不破圖', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('product_images', [{ id: '40000000-0000-4000-8000-0000000000e1', product_id: P1, storage_path: BROKEN, sort_order: 0 }]);
    // 分類卡片：封面網址失效
    const cat = await fetch(`${MOCK_URL}/__mock/state`).then((r) => r.json());
    const cylinder = cat.tables.categories.find((c) => c.slug === 'cylinder');
    await seed('categories', [{ ...cylinder, cover_image: BROKEN }]);

    for (const [path, selector] of [
      ['/en/products/cylinder/std', 'main img[alt*="1HV-11311-00"]'],
      ['/en/products/cylinder/std/1HV-11311-00', 'main img[alt*="1HV-11311-00"]'],
      ['/en/products', '.category-card img']
    ]) {
      await page.goto(`${BASE_URL}${path}`);
      const img = page.locator(selector).first();
      await img.waitFor({ state: 'attached' });
      await page.waitForFunction((sel) => document.querySelector(sel)?.getAttribute('src')?.endsWith('/no-image.svg'), selector, { timeout: 15000 });
      await page.waitForFunction((sel) => { const el = document.querySelector(sel); return el.complete && el.naturalWidth > 0; }, selector, { timeout: 15000 });
      assert(true, `${path} 失效的圖片已換成 No Image 圖並正常顯示`);
    }
  })
);

run('後台縮圖：圖片網址失效時也顯示 No Image 圖', () =>
  withPage(async (page) => {
    await resetMock();
    await seed('product_images', [{ id: '40000000-0000-4000-8000-0000000000e2', product_id: P1, storage_path: BROKEN, sort_order: 0 }]);
    await page.goto(`${BASE_URL}/zh-TW/admin/login`);
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', PASSWORD);
    await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
    await openAdminTab(page, '產品');
    const thumb = page.getByRole('row', { name: /1HV-11311-00/ }).locator('img').first();
    await thumb.waitFor({ timeout: 30000 });
    await page.waitForFunction(() => { const el = [...document.querySelectorAll('tbody tr')].find((r) => r.textContent.includes('1HV-11311-00'))?.querySelector('img'); return el?.getAttribute('src') === '/no-image.svg'; }, null, { timeout: 15000 });
  })
);
