// E2E：手機版詢價清單改為直式卡片，不需左右捲動、按鈕易點（D12）
// 啟動網站：npx next dev -p 3100（詢價清單只存在瀏覽器，不會送出）
const { chromium } = require('playwright');
const { BASE_URL, assert, run } = require('./helpers.cjs');

const CART = [
  { id: 'a', modelNumber: '1HV-11311-00', nameZhTw: '汽缸本體（標準尺寸 47mm）', nameZhCn: '', nameEn: '', quantity: 100 },
  { id: 'b', modelNumber: '5TJ-11311-00', nameZhTw: '汽缸本體 B', nameZhCn: '', nameEn: '', quantity: 250 }
];

async function openInquiry(browser, viewport) {
  const page = await (await browser.newContext({ viewport })).newPage();
  await page.goto(`${BASE_URL}/zh-TW`);
  await page.evaluate((items) => localStorage.setItem('xh_rfq_cart', JSON.stringify(items)), CART);
  await page.goto(`${BASE_URL}/zh-TW/inquiry`, { waitUntil: 'networkidle' });
  await page.locator('.inquiry-cart-table tbody tr').first().waitFor();
  return page;
}

run('手機版詢價清單卡片', async () => {
  const browser = await chromium.launch();
  try {
    const page = await openInquiry(browser, { width: 390, height: 844 });
    const table = page.locator('.inquiry-cart-table');
    const overflow = await table.evaluate((el) => el.parentElement.scrollWidth - el.parentElement.clientWidth);
    assert(overflow <= 0, `清單不需要左右捲動（超出 ${overflow}px；修改前超出 80px）`);
    assert(!(await page.locator('.inquiry-cart-table thead').isVisible()), '手機不顯示表格標題列');

    const row = page.locator('.inquiry-cart-table tbody tr').first();
    const remove = row.locator('.remove-btn');
    const box = await remove.boundingBox();
    assert(box.x + box.width <= 390, '「移除」按鈕完整顯示在畫面內');
    const sizes = await row.locator('.qty-btn, .remove-btn').evaluateAll((els) => els.map((e) => [e.offsetWidth, e.offsetHeight]));
    assert(sizes.every(([w, h]) => w >= 44 && h >= 44), `數量與移除按鈕至少 44×44（${sizes.map((s) => s.join('×')).join('、')}）`);
    // 以文字實際排版出的行數判斷（修改前會被拆成 3 行）
    const lines = await row.locator('td').first().evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
    });
    assert(lines === 1, `料號維持一行，不被拆開（${lines} 行）`);

    await row.locator('.qty-btn').nth(1).click();
    assert((await row.locator('.qty-input').inputValue()) === '150', '按「+」數量加 50');
    await remove.click();
    await page.waitForFunction(() => document.querySelectorAll('.inquiry-cart-table tbody tr').length === 1);
    assert(true, '按「移除」刪除該料號');

    const desktop = await openInquiry(browser, { width: 1280, height: 900 });
    assert(await desktop.locator('.inquiry-cart-table thead').isVisible(), '桌機維持表格樣式');
  } finally {
    await browser.close();
  }
});
