// E2E：每個頁面的 <html lang> 標示該頁的語言（含英文頁），未知網址回 404，根網址仍轉到 /en
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const cases = [
  ['/en', 'en'],
  ['/en/products', 'en'],
  ['/en/about', 'en'],
  ['/en/contact', 'en'],
  ['/en/inquiry', 'en'],
  ['/en/legal/privacy', 'en'],
  ['/zh-TW', 'zh-TW'],
  ['/zh-TW/products', 'zh-TW'],
  ['/zh-TW/contact', 'zh-TW'],
  ['/zh-CN', 'zh-CN'],
  ['/zh-CN/about', 'zh-CN'],
  ['/zh-CN/legal/privacy', 'zh-CN']
];

run('各頁 <html lang> 與網址語系一致', () =>
  withPage(async (page) => {
    for (const [path, lang] of cases) {
      const res = await page.goto(`${BASE_URL}${path}`);
      const actual = await page.locator('html').getAttribute('lang');
      assert(res.status() === 200 && actual === lang, `${path} → lang="${actual}"（應為 ${lang}，HTTP ${res.status()}）`);
    }
  })
);

run('未知語系與不存在的網址回 404，根網址仍轉到 /en', () =>
  withPage(async (page) => {
    for (const path of ['/fr', '/fr/products', '/no-such-page', '/en/no-such-page']) {
      const res = await page.request.get(`${BASE_URL}${path}`, { maxRedirects: 0 });
      assert(res.status() === 404, `${path} 回應 404（${res.status()}）`);
    }
    const root = await page.request.get(`${BASE_URL}/`, { maxRedirects: 0 });
    assert(new URL(root.headers()['location'] || '', BASE_URL).pathname === '/en', '根網址轉到 /en');
  })
);

run('頁面功能正常：語言切換後 lang 跟著變、全站 metadata 描述仍在', () =>
  withPage(async (page) => {
    await page.goto(`${BASE_URL}/en`);
    await Promise.all([
      page.waitForURL(`${BASE_URL}/zh-TW`, { timeout: 30000 }),
      page.locator('nav.nav').getByRole('link', { name: '繁中', exact: true }).click()
    ]);
    await page.waitForFunction(() => document.documentElement.lang === 'zh-TW');
    const desc = await page.locator('meta[name="description"]').first().getAttribute('content');
    assert(Boolean(desc && desc.length > 10), `有 meta description（${desc}）`);
  })
);
