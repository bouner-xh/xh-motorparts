// E2E：網站畫面不使用 emoji，改用一致的線條圖示（D9）
// 啟動網站：npx next dev -p 3100（唯讀，也可對正式網站執行）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{1F1E6}-\u{1F1FF}]/u;
const PAGES = ['', '/products', '/about', '/contact', '/inquiry'];

run('畫面無 emoji，圖示改為 SVG', () =>
  withPage(async (page) => {
    for (const locale of ['zh-TW', 'zh-CN', 'en']) {
      for (const path of PAGES) {
        await page.goto(`${BASE_URL}/${locale}${path}`, { waitUntil: 'networkidle' });
        const text = await page.evaluate(() => document.body.innerText);
        const found = text.match(new RegExp(EMOJI.source, 'gu')) || [];
        assert(found.length === 0, `/${locale}${path || '/'} 沒有 emoji${found.length ? '：' + found.join('') : ''}`);
      }
    }
    await page.goto(`${BASE_URL}/zh-TW`, { waitUntil: 'networkidle' });
    assert((await page.locator('.why-card__icon svg').count()) === 6, '「選擇理由」6 張卡片都有線條圖示');
    assert((await page.locator('.footer-contact-list .contact-icon-label svg').count()) === 4, '頁尾 4 項聯絡資訊都有線條圖示');
    assert((await page.locator('.cart-indicator-btn svg').count()) >= 1, '詢價清單按鈕使用線條圖示');
  })
);
