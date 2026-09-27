// E2E：每個公開頁面的 canonical 指向自己，並有三語 hreflang 與 x-default（D14）
// 使用模擬 Supabase（產品頁需要資料）：
//   node tests/e2e/mock-supabase.cjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon \
//   SUPABASE_SERVICE_ROLE_KEY=service npx next dev -p 3100
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const WWW = 'https://www.xh-motorparts.com';
const PATHS = [
  '',
  '/about',
  '/contact',
  '/products',
  '/legal/privacy',
  '/inquiry',
  '/products/cylinder',
  '/products/cylinder/std',
  '/products/cylinder/std/1HV-11311-00',
];

run('每個公開頁面的 canonical 指向自己並有三語 hreflang', () =>
  withPage(async (page) => {
    for (const path of PATHS) {
      const res = await page.goto(`${BASE_URL}/zh-CN${path}`);
      assert(res && res.status() === 200, `/zh-CN${path} 可以開啟（${res && res.status()}）`);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      assert(canonical === `${WWW}/zh-CN${path}`, `/zh-CN${path} canonical 指向本頁（${canonical}）`);
      const alternates = Object.fromEntries(
        await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => [e.hreflang, e.href]))
      );
      const expected = {
        'zh-TW': `${WWW}/zh-TW${path}`,
        'zh-CN': `${WWW}/zh-CN${path}`,
        en: `${WWW}/en${path}`,
        'x-default': `${WWW}/en${path}`,
      };
      const ok = Object.keys(expected).every((k) => alternates[k] === expected[k]) && Object.keys(alternates).length === 4;
      assert(ok, `/zh-CN${path} hreflang 正確：${JSON.stringify(alternates)}`);
    }
  })
);
