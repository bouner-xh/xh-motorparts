// E2E：sitemap 英文優先、每個網址附各語言對應頁（hreflang）、不填不可靠的更新時間
// 使用模擬 Supabase（啟動方式同 product-urls.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

run('sitemap：英文排最前、每個網址有三語加 x-default 對應頁、沒有 lastmod', () =>
  withPage(async (page) => {
    const xml = await (await page.request.get(`${BASE_URL}/sitemap.xml`)).text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert(locs.length > 0 && /\/en$/.test(locs[0]), `第一筆是英文首頁（${locs[0]}）`);
    const order = locs.slice(0, 3).map((u) => u.match(/\/(en|zh-TW|zh-CN)(\/|$)/)[1]).join(',');
    assert(order === 'en,zh-TW,zh-CN', `同一頁的語言順序（${order}）`);
    assert(!xml.includes('<lastmod>'), '沒有 lastmod');
    assert(!xml.includes('<changefreq>'), '沒有 changefreq');

    const blocks = xml.split('<url>').slice(1);
    for (const block of blocks) {
      const links = [...block.matchAll(/<xhtml:link[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g)];
      const langs = new Set(links.map((m) => m[1]));
      const loc = block.match(/<loc>([^<]+)<\/loc>/)[1];
      assert(['en', 'zh-TW', 'zh-CN', 'x-default'].every((l) => langs.has(l)), `${loc} 有四個對應頁（${[...langs].join(',')}）`);
      const xdefault = links.find((m) => m[1] === 'x-default')[2];
      assert(/\/en(\/|$)/.test(xdefault.replace(/^https?:\/\/[^/]+/, '')), `${loc} 的 x-default 指向英文頁`);
    }
    assert(blocks.length === locs.length, `每個網址都有區塊（${blocks.length}）`);
  })
);
