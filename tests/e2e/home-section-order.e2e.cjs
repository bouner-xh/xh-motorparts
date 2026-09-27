// E2E：首頁區塊順序——產品分類緊接在 Hero 之後，品牌故事移到最後，內容不減少（D3）
// 啟動網站：npx next dev -p 3100
const { chromium } = require('playwright');
const { BASE_URL, assert, run } = require('./helpers.cjs');

const ORDER = ['9 大品類', '開始合作', '全球採購商選擇協皇', '我們不是最大的'];
const MUST_KEEP = ['我們的名字不會出現在你的摩托車上', '— 協皇企業，台灣，1990 至今', '摩托車零件產業裡，有太多廠商以價格競爭。', '那些每年回來找我們的採購夥伴。'];

run('首頁區塊順序與內容', async () => {
  const browser = await chromium.launch();
  try {
    for (const [label, viewport, maxScreens] of [['桌機', { width: 1280, height: 900 }, 1.1], ['手機', { width: 390, height: 844 }, 1.6]]) {
      const page = await (await browser.newContext({ viewport })).newPage();
      await page.goto(`${BASE_URL}/zh-TW`, { waitUntil: 'networkidle' });
      const h2 = await page.$$eval('main h2', (els) => els.map((e) => e.textContent.trim()));
      const indexes = ORDER.map((t) => h2.findIndex((h) => h.startsWith(t)));
      assert(indexes.every((i, n) => i >= 0 && (n === 0 || i > indexes[n - 1])), `${label} 區塊順序：產品分類 → 詢價步驟 → 選擇理由 → 品牌故事`);
      const y = await page.$eval('.category-card', (el) => el.getBoundingClientRect().top + scrollY);
      assert(y <= viewport.height * maxScreens, `${label} 第一個產品分類在 ${Math.round(y)}px（${(y / viewport.height).toFixed(2)} 個畫面內）`);
      const text = await page.evaluate(() => document.body.innerText);
      for (const phrase of MUST_KEEP) assert(text.includes(phrase), `${label} 保留內容「${phrase.slice(0, 12)}…」`);
      assert((await page.locator('.category-card').count()) === 9, `${label} 9 個產品分類都在`);
    }
  } finally {
    await browser.close();
  }
});
