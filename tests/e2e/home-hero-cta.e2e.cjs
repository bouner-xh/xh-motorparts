// E2E：首頁 Hero 主要按鈕聚焦——按鈕在前、聯絡資訊縮為按鈕下方一行（D2）
// 啟動網站：npx next dev -p 3100（唯讀，也可對正式網站執行）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const LABEL = { 'zh-TW': '或直接聯絡業務', 'zh-CN': '或直接联系业务', en: 'Or contact our sales team' };

run('首頁 Hero：主按鈕聚焦、聯絡資訊在按鈕下方', () =>
  withPage(async (page) => {
    for (const [locale, label] of Object.entries(LABEL)) {
      await page.goto(`${BASE_URL}/${locale}`, { waitUntil: 'networkidle' });
      const hero = page.locator('section.hero');
      const primary = hero.locator('a.button-primary');
      const secondary = hero.locator('a.button-outline');
      const contact = hero.locator('.hero__contact-line');
      assert((await primary.count()) === 1 && (await secondary.count()) === 1, `/${locale} 一個主按鈕、一個外框次要按鈕`);
      const [p, c] = [await primary.boundingBox(), await contact.boundingBox()];
      assert(c.y > p.y + p.height, `/${locale} 聯絡資訊在按鈕下方`);
      const style = await primary.evaluate((el) => { const s = getComputedStyle(el); return { size: parseFloat(s.fontSize), weight: s.fontWeight }; });
      assert(style.size >= 16.5 && Number(style.weight) >= 700, `/${locale} 主按鈕放大加粗（${style.size}px / ${style.weight}）`);
      const linkColors = await contact.locator('a').evaluateAll((as) => as.map((a) => getComputedStyle(a).color));
      assert(linkColors.length === 2 && linkColors.every((color) => color !== 'rgb(239, 68, 68)'), `/${locale} 聯絡連結改為低調灰白色（不再是紅色）`);
      assert((await contact.textContent()).includes(label), `/${locale} 顯示「${label}」`);
      assert((await contact.locator('svg').count()) === 2 && !/📧|📱/.test(await contact.textContent()), `/${locale} 使用線條圖示而非 emoji`);
    }
  })
);
