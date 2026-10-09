// E2E：主要頁面冒煙測試——頁面可開啟、本站資源（圖片 / CSS / JS）沒有載入失敗
// 啟動網站：npx next dev -p 3100 或 next build && next start -p 3100
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const PAGES = [
  '/zh-TW', '/zh-CN', '/en',
  '/zh-TW/products', '/zh-TW/products/cylinder',
  '/zh-TW/about', '/zh-TW/contact', '/zh-TW/legal/privacy', '/zh-TW/inquiry'
];

run('主要頁面與本站資源都能正常載入', () =>
  withPage(async (page) => {
    for (const path of PAGES) {
      const failed = [];
      const onResponse = (res) => {
        const url = res.url();
        // Vercel Analytics 腳本只在部署到 Vercel 時存在，本機一律 404，略過
        if (url.includes('/_vercel/')) return;
        if (url.startsWith(BASE_URL) && res.status() >= 400) failed.push(`${res.status()} ${url.replace(BASE_URL, '')}`);
      };
      page.on('response', onResponse);
      const res = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
      page.off('response', onResponse);
      assert(res.status() === 200, `${path} 回應 200`);
      assert(failed.length === 0, `${path} 本站資源沒有載入失敗${failed.length ? '：' + failed.join(', ') : ''}`);
    }

    await page.goto(`${BASE_URL}/zh-TW`, { waitUntil: 'networkidle' });
    // 分類卡片的封面圖（沒有封面時是預設圖）都要能載入
    const srcs = await page.locator('.category-card img').evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src')));
    assert(srcs.length > 0, `首頁有分類卡片（${srcs.length} 張）`);
    for (const src of srcs) {
      const res = await page.request.get(new URL(src, BASE_URL).toString());
      assert(res.status() === 200 && (res.headers()['content-type'] || '').startsWith('image/'), `首頁分類封面圖可載入：${src}`);
    }
  })
);
