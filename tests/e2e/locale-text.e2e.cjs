// E2E：簡中頁面不出現繁體字、英文頁面不出現中文（D7）
// 使用模擬 Supabase 的範例產品（啟動方式同 product-card-inquiry.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

// 繁簡寫法不同、網站文案常用的繁體字
const TRADITIONAL_ONLY = '們會車業灣創於國詢價單錄聯絡資訊電話營時間產覽頁關週區號隱檢視調買專請詳適規與動發確認儘場無細質際紹說廠製準備應響東傳開這為來個樣';
const PATHS = ['', '/products', '/products/cylinder', '/products/cylinder/std', '/products/cylinder/std/1HV-11311-00', '/about', '/contact', '/inquiry'];

const visibleText = (page) => page.evaluate(() => document.body.innerText);

run('簡中頁面沒有繁體字', () =>
  withPage(async (page) => {
    for (const path of PATHS) {
      await page.goto(`${BASE_URL}/zh-CN${path}`, { waitUntil: 'networkidle' });
      const text = await visibleText(page);
      const found = [...new Set([...text].filter((ch) => TRADITIONAL_ONLY.includes(ch)))];
      const sample = found.length ? text.split('\n').filter((l) => found.some((ch) => l.includes(ch))).slice(0, 3).join(' / ') : '';
      assert(found.length === 0, `/zh-CN${path || '/'} 沒有繁體字${found.length ? `：${found.join('')}（${sample}）` : ''}`);
    }
  })
);

run('英文頁面沒有中文（語系按鈕除外）', () =>
  withPage(async (page) => {
    for (const path of PATHS) {
      await page.goto(`${BASE_URL}/en${path}`, { waitUntil: 'networkidle' });
      const text = (await visibleText(page)).replace(/繁中|简中/g, '');
      const lines = text.split('\n').filter((l) => /[一-鿿]/.test(l));
      assert(lines.length === 0, `/en${path || '/'} 沒有中文${lines.length ? `：${lines.slice(0, 3).join(' / ')}` : ''}`);
    }
  })
);

run('繁中頁面維持繁體文案', () =>
  withPage(async (page) => {
    await page.goto(`${BASE_URL}/zh-TW`, { waitUntil: 'networkidle' });
    const text = await visibleText(page);
    for (const phrase of ['創立於 1990 年', '台灣・台中', '摩托車零件產品目錄與商務詢價平台', '週一至週五']) {
      assert(text.includes(phrase), `繁中首頁顯示「${phrase}」`);
    }
  })
);
