// E2E：sitemap 與產品結構化資料的產品網址正確（產品上架檢查 P10，2026-10-04）
// 實際產品網址為 /products/大分類/子分類/型號；原本少了子分類，sitemap 送給 Google 的產品網址會 404
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

// sitemap 與結構化資料使用正式網址，測試時換成本機網址
const toLocal = (url) => url.replace(/^https?:\/\/[^/]+/, BASE_URL);

run('sitemap 的產品網址都能打開，結構化資料的網址與目前頁面相同', () =>
  withPage(async (page) => {
    await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
    const xml = await (await page.request.get(`${BASE_URL}/sitemap.xml`)).text();
    const productUrls = [...xml.matchAll(/<loc>([^<]*\/products\/[^<]*)<\/loc>/g)]
      .map((m) => m[1])
      .filter((u) => /1HV-11311-00|5TJ-11311-00/.test(u));
    assert(productUrls.length === 6, `sitemap 列出 2 個產品 × 3 種語言（${productUrls.length}）`);
    assert(productUrls.every((u) => /\/products\/cylinder\/std\//.test(u)), '網址包含子分類');
    for (const url of productUrls) {
      const res = await page.request.get(toLocal(url));
      assert(res.status() === 200, `${url.replace(/^https?:\/\/[^/]+/, '')} 可以打開（${res.status()}）`);
    }

    await page.goto(`${BASE_URL}/en/products/cylinder/std/1HV-11311-00`);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const product = blocks.map((t) => JSON.parse(t)).find((d) => d['@type'] === 'Product');
    const schemaPath = new URL(product.offers.url).pathname;
    assert(schemaPath === '/en/products/cylinder/std/1HV-11311-00', `結構化資料的網址與頁面相同（${schemaPath}）`);
  })
);
