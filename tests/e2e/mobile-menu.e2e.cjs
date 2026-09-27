// E2E：手機版標頭收合為 ☰ 選單，桌機維持完整導覽列（D4）
// 啟動網站：npx next dev -p 3100
const { chromium } = require('playwright');
const { BASE_URL, assert, run } = require('./helpers.cjs');

run('手機 ☰ 選單與桌機導覽列', async () => {
  const browser = await chromium.launch();
  try {
    // 手機
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await phone.goto(`${BASE_URL}/zh-TW`, { waitUntil: 'networkidle' });
    const toggle = phone.locator('button.menu-toggle');
    const nav = phone.locator('#site-nav');
    assert(await toggle.isVisible(), '手機顯示 ☰ 按鈕');
    assert(!(await nav.isVisible()), '手機預設收合導覽列');
    const headerHeight = await phone.locator('header.site-header').evaluate((el) => el.offsetHeight);
    assert(headerHeight <= 90, `手機收合時標頭高度 ${headerHeight}px（修改前約 310px）`);
    assert(await phone.locator('.header-actions .cart-indicator-btn').isVisible(), '收合時仍看得到詢價清單按鈕');

    await toggle.focus();
    await phone.keyboard.press('Enter');
    assert((await toggle.getAttribute('aria-expanded')) === 'true' && (await nav.isVisible()), '按下 ☰（鍵盤 Enter）展開選單');
    for (const name of ['首頁', '產品目錄', '關於我們', '聯絡我們', '繁中', '简中', 'EN']) {
      assert(await nav.getByRole('link', { name, exact: true }).isVisible(), `選單中有「${name}」`);
    }
    await Promise.all([phone.waitForURL(`${BASE_URL}/zh-TW/products`), nav.getByRole('link', { name: '產品目錄', exact: true }).click()]);
    await phone.waitForFunction(() => document.querySelector('button.menu-toggle')?.getAttribute('aria-expanded') === 'false');
    assert(!(await nav.isVisible()), '換頁後選單自動收合');
    const scrolls = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert(!scrolls, '手機頁面沒有左右捲動');

    // 桌機
    const desktop = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await desktop.goto(`${BASE_URL}/zh-TW`, { waitUntil: 'networkidle' });
    assert(!(await desktop.locator('button.menu-toggle').isVisible()), '桌機不顯示 ☰ 按鈕');
    assert(await desktop.locator('#site-nav').getByRole('link', { name: '產品目錄', exact: true }).isVisible(), '桌機直接顯示導覽列');
    assert(await desktop.locator('.nav-cart .cart-indicator-btn').isVisible(), '桌機詢價清單按鈕在導覽列右側');
  } finally {
    await browser.close();
  }
});
