// E2E：canonical、hreflang、robots.txt、sitemap.xml 使用實際網址 www.xh-motorparts.com（C4）
// 啟動網站：npx next dev -p 3100（不要設定 NEXT_PUBLIC_BASE_URL，以驗證預設值）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const WWW = 'https://www.xh-motorparts.com';
const APEX = /https:\/\/xh-motorparts\.com/;

run('正式網址統一為 www', () =>
  withPage(async (page) => {
    for (const path of ['/zh-TW', '/en/products/cylinder']) {
      await page.goto(`${BASE_URL}${path}`);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      assert(canonical && canonical.startsWith(WWW), `${path} canonical = ${canonical}`);
      const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => e.href));
      // 首頁有設定 hreflang；產品分類頁目前只設定 canonical（既有狀況，另列待處理）
      if (path === '/zh-TW') assert(alternates.length > 0, `${path} 有 hreflang`);
      assert(alternates.every((h) => h.startsWith(WWW)), `${path} hreflang 共 ${alternates.length} 筆皆為 www`);
    }

    const robots = await (await page.request.get(`${BASE_URL}/robots.txt`)).text();
    assert(robots.includes(`${WWW}/sitemap.xml`), 'robots.txt 的 sitemap 網址為 www');

    const sitemap = await (await page.request.get(`${BASE_URL}/sitemap.xml`)).text();
    const locs = sitemap.match(/<loc>[^<]+<\/loc>/g) || [];
    assert(locs.length > 0 && !APEX.test(sitemap), `sitemap.xml 共 ${locs.length} 個網址，沒有不帶 www 的網址`);
  })
);
