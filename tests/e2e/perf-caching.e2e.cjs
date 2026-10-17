// E2E（正式環境建置）：速度——產品頁可被 CDN 快取、LCP 圖片不延遲載入、上傳圖片帶快取標頭、資料庫故障不快取假資料
// 使用模擬 Supabase；網站要用「next build + next start」啟動（開發模式不快取、也看不到 ISR 標頭）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');
const { readFileSync } = require('node:fs');

const SUB1 = '20000000-0000-4000-8000-000000000001';
const P1 = '30000000-0000-4000-8000-000000000001';
const PRODUCT_PATH = '/en/products/cylinder/std/1HV-11311-00';

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const postMock = (path, body) => fetch(`${MOCK_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();

// 取出 HTML 中所有 <img> 標籤
const imgTags = (html) => html.match(/<img\b[^>]*>/g) || [];
const isEager = (tag) => /fetchpriority="high"/i.test(tag) && !/loading="lazy"/i.test(tag);

async function loginAdmin(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
}

const adminApi = (page, method, body) =>
  page.evaluate(
    async ({ method, body }) => {
      const res = await fetch('/api/admin/products', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    },
    { method, body }
  );

run('產品頁不再每次現場渲染：回應標頭可被 CDN 快取，不是 private, no-store', async () => {
  await resetMock();
  const res = await fetch(`${BASE_URL}${PRODUCT_PATH}`);
  const cacheControl = res.headers.get('cache-control') || '';
  assert(res.status === 200, `產品頁 200（${res.status}）`);
  assert(/s-maxage=\d+/.test(cacheControl) && !/no-store|private/.test(cacheControl), `Cache-Control 可被 CDN 快取（${cacheControl}）`);
  // 還沒預先產生的產品（之後才上架）第一次被瀏覽時也要走 ISR，而不是 404
  const missing = await fetch(`${BASE_URL}/en/products/cylinder/std/NOT-EXIST-XYZ`);
  assert(missing.status === 404, `不存在的型號仍是 404（${missing.status}）`);
});

run('產品頁主圖是 LCP：不延遲載入、fetchpriority=high；縮圖維持延遲載入', async () => {
  const html = await (await fetch(`${BASE_URL}${PRODUCT_PATH}`)).text();
  const main = imgTags(html).find((tag) => /alt="1HV-11311-00 /.test(tag));
  assert(Boolean(main), '找到產品主圖');
  assert(isEager(main), `主圖 fetchpriority=high 且沒有 loading="lazy"（${main.slice(0, 160)}）`);
});

run('網址大小寫不同轉到正確網址；不存在的分類 404（ISR 不影響轉址）', async () => {
  const res = await fetch(`${BASE_URL}/en/products/CYLINDER/STD/1hv-11311-00`, { redirect: 'manual' });
  assert(res.status === 308 && (res.headers.get('location') || '').endsWith(PRODUCT_PATH), `大小寫不同轉址到 ${PRODUCT_PATH}（${res.status} ${res.headers.get('location')}）`);
  const nope = await fetch(`${BASE_URL}/en/products/nope/std/1HV-11311-00`, { redirect: 'manual' });
  assert(nope.status === 404, `不存在的分類 404（${nope.status}）`);
});

run('後台儲存產品後，產品頁馬上更新（revalidateCatalog 有效）；列表前幾張圖不延遲載入', () =>
  withPage(async (page) => {
    await resetMock();
    // 先讓產品頁進入快取
    const before = await (await fetch(`${BASE_URL}${PRODUCT_PATH}`)).text();
    assert(!before.includes('Perf Renamed Cylinder'), '更新前頁面沒有新名稱');
    await fetch(`${BASE_URL}${PRODUCT_PATH}`);

    await loginAdmin(page);
    const base = { category: 'cylinder', subCategoryId: SUB1, nameZhTw: '汽缸', nameZhCn: '汽缸', stockQuantity: 5, isActive: true };
    const updated = await adminApi(page, 'PUT', { ...base, id: P1, modelNumber: '1HV-11311-00', nameEn: 'Perf Renamed Cylinder' });
    assert(updated.status === 200, `後台更新產品（${updated.status}）`);
    const after = await (await fetch(`${BASE_URL}${PRODUCT_PATH}`)).text();
    assert(after.includes('Perf Renamed Cylinder'), '更新後產品頁立刻看到新名稱（快取已清除）');

    // 新增 5 個產品：搜尋頁（每次現場渲染）與子分類頁（ISR，新增後被清除）的前 4 張圖不延遲載入，其餘延遲
    for (let i = 1; i <= 5; i++) {
      const created = await adminApi(page, 'POST', { ...base, modelNumber: `PERF-${i}`, nameEn: `Perf part ${i}` });
      assert(created.status === 200, `新增 PERF-${i}（${created.status}）`);
    }
    for (const [label, url] of [
      ['搜尋頁', `${BASE_URL}/en/products/search?q=PERF`],
      ['子分類頁', `${BASE_URL}/en/products/cylinder/std`]
    ]) {
      const html = await (await fetch(url)).text();
      const cards = imgTags(html).filter((tag) => /class="product-card__image"/.test(tag));
      assert(cards.length >= 5, `${label}有 ${cards.length} 張卡片圖片`);
      assert(cards.slice(0, 4).every(isEager), `${label}前 4 張卡片圖片 fetchpriority=high、不延遲載入`);
      assert(cards.slice(4).every((tag) => /loading="lazy"/.test(tag) && !/fetchpriority="high"/.test(tag)), `${label}第 5 張起仍延遲載入`);
    }
  })
);

run('後台上傳的圖片帶一年快取標頭（Cache-Control: max-age=31536000）', () =>
  withPage(async (page) => {
    await resetMock();
    await loginAdmin(page);
    const png = readFileSync('images/products/cylinder/cylinder-003.jpg');
    const result = await page.evaluate(async (bytes) => {
      const form = new FormData();
      form.append('file', new File([new Uint8Array(bytes)], 'cache-test.jpg', { type: 'image/jpeg' }));
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: form });
      return { status: res.status, body: await res.json() };
    }, [...png]);
    assert(result.status === 200, `上傳成功（${result.status}）`);
    const entries = Object.entries((await mockState()).storageMeta);
    assert(entries.length === 1, '儲存空間收到一個檔案');
    assert(/31536000/.test(entries[0][1].cacheControl), `上傳時帶 cache-control（${entries[0][1].cacheControl}）`);
  })
);

run('正式環境資料庫查詢失敗：丟出錯誤（500），不回傳也不快取示範資料', async () => {
  await resetMock();
  // 預先產生過的頁面仍用上一份好的快取
  const cached = await fetch(`${BASE_URL}${PRODUCT_PATH}`);
  assert(cached.status === 200, '資料庫故障前先確認預先產生的頁面正常');
  await postMock('/__mock/drop', { table: 'categories' });
  try {
    const res = await fetch(`${BASE_URL}/en/products/cylinder/std/BRAND-NEW-PART`, { redirect: 'manual' });
    const cacheControl = res.headers.get('cache-control') || '';
    assert(res.status === 500, `資料庫查詢失敗回 500，不是用示範資料產生 404／200 頁面（${res.status}）`);
    const stillCached = await fetch(`${BASE_URL}${PRODUCT_PATH}`);
    assert(stillCached.status === 200, `預先產生的頁面在資料庫故障時仍可瀏覽（${stillCached.status}）`);
  } finally {
    await resetMock();
  }
});
