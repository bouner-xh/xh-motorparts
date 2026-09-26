// 正式網站唯讀檢查：部署後確認主要修改在線上正常運作
// 只瀏覽頁面、點按鈕（詢價清單只存在瀏覽器），不送出詢價、不登入後台，不會寫入任何資料
// 執行：E2E_BASE_URL=https://www.xh-motorparts.com NODE_PATH=$(npm root -g) node tests/e2e/production-check.e2e.cjs
const { chromium } = require('playwright');
const { BASE_URL, assert, run } = require('./helpers.cjs');

const TRADITIONAL_ONLY = '們會車業灣創於國詢價單錄聯絡資訊電話營時間產覽頁關週區號隱檢視調買專請詳適規與動發確認儘場無細質際紹說廠製準備應響東傳開這為來個樣';

// 從產品目錄自動找出一個有產品的子分類與其中一個產品
async function discover(page) {
  await page.goto(`${BASE_URL}/zh-TW/products`, { waitUntil: 'networkidle' });
  const categories = await page.$$eval('a[href^="/zh-TW/products/"]', (as) =>
    [...new Set(as.map((a) => a.getAttribute('href')).filter((h) => h.split('/').length === 4))]
  );
  for (const category of categories) {
    await page.goto(`${BASE_URL}${category}`, { waitUntil: 'networkidle' });
    const subs = await page.$$eval(`a[href^="${category}/"]`, (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
    for (const sub of subs) {
      await page.goto(`${BASE_URL}${sub}`, { waitUntil: 'networkidle' });
      const product = await page.$$eval('article.product-card a', (as) => as.map((a) => a.getAttribute('href'))[0]);
      if (product) return { category, sub, product };
    }
  }
  throw new Error('找不到任何有產品的子分類');
}

run('正式網站：產品卡片、語系、標題與文字檢查', async () => {
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext()).newPage();
    const { category, sub, product } = await discover(page);
    console.log(`  （使用 ${decodeURI(product)}）`);

    // D1 + D13：卡片按鈕與圖片
    await page.goto(`${BASE_URL}${sub}`, { waitUntil: 'networkidle' });
    const button = page.locator('button.product-card__inquiry').first();
    assert((await button.count()) === 1, 'D1 產品卡片有「加入詢價清單」按鈕');
    await button.click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('xh_rfq_cart') || '[]').length === 1);
    assert((await button.getAttribute('aria-pressed')) === 'true', 'D1 按下後加入詢價清單（只存在瀏覽器）');
    await button.click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('xh_rfq_cart') || '[]').length === 0);
    assert(true, 'D1 再按一次移除');
    // 產品照片多存放在 Supabase，只檢查本站圖片（外部圖片可能因檢查環境的網路限制無法載入）
    const images = await page.locator('article.product-card img').evaluateAll((imgs) =>
      imgs.map((i) => ({ local: new URL(i.currentSrc || i.src).origin === location.origin, ok: i.complete && i.naturalWidth > 0 }))
    );
    const local = images.filter((i) => i.local);
    assert(local.every((i) => i.ok), `D13 本站圖片 ${local.length} 張皆正常顯示（外部圖片 ${images.length - local.length} 張不檢查）`);
    // 以瀏覽器內的請求檢查（與真實訪客相同）
    const placeholder = await page.evaluate(async () => (await fetch('/legacy-assets/no-image.jpg')).status);
    assert(placeholder === 200, 'D13 預設圖 no-image.jpg 已部署');

    // D6：語系切換停留同頁
    await page.goto(`${BASE_URL}${product}`, { waitUntil: 'networkidle' });
    await Promise.all([page.waitForURL(/\/en\//), page.locator('nav.nav').getByRole('link', { name: 'EN', exact: true }).click()]);
    assert(new URL(page.url()).pathname === new URL(`${BASE_URL}${product}`).pathname.replace('/zh-TW/', '/en/'), 'D6 產品頁切換到英文後仍是同一個產品');

    // D10：每頁一個 H1，且不是公司名稱
    for (const path of ['/zh-TW', '/zh-TW/products', category, sub, product, '/zh-TW/about', '/zh-TW/contact']) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
      const h1 = await page.locator('h1').allTextContents();
      assert(h1.length === 1 && !h1[0].includes('協皇企業有限公司'), `D10 ${decodeURI(path)} 有一個 H1：「${(h1[0] || '').trim().slice(0, 20)}」`);
    }

    // D7：簡中頁面（網站文案）無繁體字；資料庫內容另外列出
    for (const path of ['', '/products', '/about', '/contact', '/inquiry']) {
      await page.goto(`${BASE_URL}/zh-CN${path}`, { waitUntil: 'networkidle' });
      const text = await page.evaluate(() => document.body.innerText);
      const found = [...new Set([...text].filter((ch) => TRADITIONAL_ONLY.includes(ch)))];
      assert(found.length === 0, `D7 /zh-CN${path || '/'} 沒有繁體字${found.length ? '：' + found.join('') : ''}`);
    }
    for (const path of [category, sub, product].map((p) => p.replace('/zh-TW/', '/zh-CN/'))) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
      const lines = (await page.evaluate(() => document.body.innerText)).split('\n').filter((l) => [...l].some((ch) => TRADITIONAL_ONLY.includes(ch)));
      console.log(`  （資料庫內容）${decodeURI(path)} 含繁體字的行：${lines.length ? lines.slice(0, 3).join(' / ') : '無'}`);
    }

    // S3：CSP 放行 GA4 與 Clarity
    const res = await page.goto(`${BASE_URL}/zh-TW`);
    const csp = res.headers()['content-security-policy'] || '';
    assert(csp.includes('google-analytics.com') && csp.includes('*.clarity.ms'), 'S3 CSP 已放行 GA4 與 Clarity');
  } finally {
    await browser.close();
  }
});
