// E2E：首頁 Hero 內距隨螢幕寬度調整，手機不再過窄（D5）
// 啟動網站：npx next dev -p 3100
const { chromium } = require('playwright');
const { BASE_URL, assert, run } = require('./helpers.cjs');

async function measure(viewport) {
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ viewport })).newPage();
    await page.goto(`${BASE_URL}/zh-TW`);
    return await page.evaluate(() => {
      const panel = document.querySelector('.hero__panel');
      const cs = getComputedStyle(panel);
      return {
        top: parseFloat(cs.paddingTop),
        side: parseFloat(cs.paddingLeft),
        textWidth: panel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
        pageScrollsSideways: document.documentElement.scrollWidth > window.innerWidth
      };
    });
  } finally {
    await browser.close();
  }
}

run('Hero 內距：桌機維持原樣、手機縮小', async () => {
  const desktop = await measure({ width: 1280, height: 900 });
  assert(desktop.top === 56 && desktop.side === 40, `桌機內距維持 3.5rem / 2.5rem（${desktop.top}px / ${desktop.side}px）`);

  const phone = await measure({ width: 375, height: 812 });
  assert(phone.top === 24 && phone.side === 20, `手機內距縮為 1.5rem / 1.25rem（${phone.top}px / ${phone.side}px）`);
  assert(phone.textWidth >= 290, `手機文字可用寬度 ${Math.round(phone.textWidth)}px（修改前為 264px）`);
  assert(!phone.pageScrollsSideways, '手機版頁面沒有左右捲動');
});
