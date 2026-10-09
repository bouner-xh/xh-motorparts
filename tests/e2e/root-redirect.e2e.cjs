// E2E：根網址預設英文（主要客戶是國際買家）
// 不論瀏覽器語言為何，www.xh-motorparts.com 一律轉到 /en；中文版網址照舊可用
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const headers = [
  ['en-US,en;q=0.9'],
  ['zh-TW,zh;q=0.9'],
  ['zh-CN,zh;q=0.9'],
  ['ja'],
  [undefined]
];

run('根網址：各種瀏覽器語言都轉到 /en', () =>
  withPage(async (page) => {
    for (const [lang] of headers) {
      const res = await page.request.get(`${BASE_URL}/`, { maxRedirects: 0, headers: lang ? { 'Accept-Language': lang } : {} });
      const location = res.headers()['location'] || '';
      assert(res.status() >= 300 && res.status() < 400, `${lang || '無語言標頭'}：回應轉址（${res.status()}）`);
      assert(new URL(location, BASE_URL).pathname === '/en', `${lang || '無語言標頭'} → /en（${location}）`);
    }
  })
);

run('瀏覽器打開根網址：看到英文首頁，語言切換列 EN 排第一', () =>
  withPage(async (page) => {
    await page.goto(`${BASE_URL}/`);
    assert(new URL(page.url()).pathname === '/en', `停在 /en（${page.url()}）`);
    const labels = await page.locator('nav.nav a[hreflang]').allInnerTexts();
    assert(labels.join(',') === 'EN,繁中,简中', `語言切換順序（${labels.join(',')}）`);
  })
);

run('中文版網址照舊可用', () =>
  withPage(async (page) => {
    for (const path of ['/zh-TW', '/zh-CN']) {
      const res = await page.request.get(`${BASE_URL}${path}`);
      assert(res.status() === 200, `${path} 回應 200（${res.status()}）`);
    }
  })
);
