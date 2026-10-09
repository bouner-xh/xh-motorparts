// E2E：產品網址不分大小寫都能開啟（分類、子分類、型號大小寫寫錯會轉到正確網址），找不到的網址仍是 404
// 使用模擬 Supabase（啟動方式同 product-urls.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const get = (page, path) => page.request.get(`${BASE_URL}${path}`, { maxRedirects: 0 });

run('大小寫寫錯的網址：轉到正確網址（保留語系），正確網址可開啟', () =>
  withPage(async (page) => {
    const cases = [
      ['/en/products/CYLINDER', '/en/products/cylinder'],
      ['/zh-TW/products/Cylinder/STD', '/zh-TW/products/cylinder/std'],
      ['/en/products/CYLINDER/Std/1hv-11311-00', '/en/products/cylinder/std/1HV-11311-00'],
      ['/zh-CN/products/cylinder/std/1hv-11311-00', '/zh-CN/products/cylinder/std/1HV-11311-00']
    ];
    for (const [from, to] of cases) {
      const res = await get(page, from);
      const location = res.headers()['location'] || '';
      assert(res.status() === 308 && new URL(location, BASE_URL).pathname === to, `${from} → ${to}（${res.status()} ${location}）`);
      const target = await get(page, to);
      assert(target.status() === 200, `${to} 可以開啟（${target.status()}）`);
    }
    // 瀏覽器實際打開：最後停在正確網址並顯示產品
    await page.goto(`${BASE_URL}/en/products/CYLINDER/STD/1hv-11311-00`);
    assert(new URL(page.url()).pathname === '/en/products/cylinder/std/1HV-11311-00', `瀏覽器停在正確網址（${page.url()}）`);
    assert((await page.locator('h1').first().innerText()).includes('1HV-11311-00'), '顯示產品頁');
  })
);

run('不存在的網址仍是 404，不會無限轉址；跨分類的子分類不配對', () =>
  withPage(async (page) => {
    for (const path of ['/en/products/NO-SUCH', '/en/products/CYLINDER/NOPE', '/en/products/CYLINDER/std/NOPE', '/en/products/CHAIN/std']) {
      const res = await get(page, path);
      assert(res.status() === 404, `${path} 回應 404（${res.status()}）`);
    }
    for (const path of ['/en/products/cylinder', '/en/products/cylinder/std', '/en/products/cylinder/std/1HV-11311-00']) {
      assert((await get(page, path)).status() === 200, `${path} 正確網址不轉址、回應 200`);
    }
  })
);
