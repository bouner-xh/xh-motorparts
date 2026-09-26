// E2E：頁尾與隱私權頁的小字顏色對比達到 WCAG AA 4.5:1（D8）
// 啟動網站：npx next dev -p 3100
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

// 以頁面漸層背景中最亮的顏色 #111827 計算（最保守）
const BACKGROUND = [17, 24, 39];

function luminance([r, g, b]) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (fg) => {
  const [a, b] = [luminance(fg), luminance(BACKGROUND)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};

run('小字對比達 4.5:1', () =>
  withPage(async (page) => {
    for (const [path, selector, label] of [
      ['/zh-TW', '.footer-bottom', '頁尾版權文字'],
      ['/zh-TW', '.footer-privacy-link', '頁尾隱私權連結'],
      ['/zh-TW/legal/privacy', '.privacy-last-updated', '隱私權頁最後更新日期']
    ]) {
      await page.goto(`${BASE_URL}${path}`);
      const rgb = await page.locator(selector).first().evaluate((el) => getComputedStyle(el).color.match(/\d+/g).slice(0, 3).map(Number));
      const r = ratio(rgb);
      assert(r >= 4.5, `${label} 對比 ${r.toFixed(2)}:1`);
    }
  })
);
