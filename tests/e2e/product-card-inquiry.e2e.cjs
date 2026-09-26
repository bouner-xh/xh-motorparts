// E2E：產品列表卡片直接加入詢價清單（D1）
// 使用模擬 Supabase 的範例產品（tests/e2e/mock-supabase.cjs）：
//   node tests/e2e/mock-supabase.cjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon \
//   SUPABASE_SERVICE_ROLE_KEY=service npx next dev -p 3100
const { chromium } = require('playwright');
const { BASE_URL, assert, run } = require('./helpers.cjs');

const LIST = `${BASE_URL}/zh-TW/products/cylinder/std`;

const cartItems = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('xh_rfq_cart') || '[]'));
const badge = async (page) => {
  const el = page.locator('.cart-badge');
  return (await el.count()) ? Number((await el.first().textContent()).trim()) : 0;
};
const cardButton = (page, model) =>
  page.locator('article.product-card', { hasText: model }).locator('button.product-card__inquiry');

for (const [label, viewport] of [['桌機', { width: 1280, height: 900 }], ['手機', { width: 390, height: 844 }]]) {
  run(`${label}：從產品列表直接加入、移除多個料號`, async () => {
    const browser = await chromium.launch();
    try {
      const page = await (await browser.newContext({ viewport })).newPage();
      await page.goto(LIST);
      const first = cardButton(page, '1HV-11311-00');
      const second = cardButton(page, '5TJ-11311-00');
      await first.waitFor();
      assert((await page.locator('button.product-card__inquiry').count()) === 2, '每張產品卡片都有加入詢價按鈕');
      // 範例產品沒有上傳照片，應顯示「暫無圖片」預設圖而不是破圖
      await page.waitForLoadState('networkidle');
      const images = await page.locator('article.product-card img').evaluateAll((imgs) => imgs.map((img) => img.complete && img.naturalWidth > 0));
      assert(images.length === 2 && images.every(Boolean), '沒有照片的產品顯示預設圖（不是破圖）');

      const box = await first.boundingBox();
      assert(box.height >= 44 && box.width <= viewport.width, `按鈕尺寸適合點擊（${Math.round(box.width)}×${Math.round(box.height)}）`);
      assert((await first.textContent()).includes('加入詢價清單'), '初始文字為「加入詢價清單」');

      await first.click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('xh_rfq_cart') || '[]').length === 1);
      assert((await first.getAttribute('aria-pressed')) === 'true', '按下後標示為已加入');
      assert((await first.textContent()).includes('已加入'), '按鈕文字變成「已加入，點此移除」');
      let items = await cartItems(page);
      assert(items[0].modelNumber === '1HV-11311-00' && items[0].quantity === 100, '清單內容正確（料號、預設數量 100）');
      assert(items[0].nameZhTw === '汽缸本體', '清單記錄中文品名');

      await second.click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('xh_rfq_cart') || '[]').length === 2);
      assert((await badge(page)) === 2, '標頭詢價數量顯示 2');
      assert(page.url() === LIST, '全程停留在產品列表頁，不需要進入產品頁');

      await first.click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('xh_rfq_cart') || '[]').length === 1);
      assert((await first.getAttribute('aria-pressed')) === 'false', '再按一次可以移除');

      await page.reload();
      await cardButton(page, '5TJ-11311-00').waitFor();
      await page.waitForFunction(() => document.querySelector('button.product-card__inquiry[aria-pressed="true"]'));
      assert((await cardButton(page, '5TJ-11311-00').getAttribute('aria-pressed')) === 'true', '重新整理後仍顯示已加入');

      await page.goto(`${BASE_URL}/zh-TW/inquiry`);
      await page.getByText('5TJ-11311-00').first().waitFor();
      assert((await page.getByText('1HV-11311-00').count()) === 0, '詢價頁只列出目前清單中的料號');
    } finally {
      await browser.close();
    }
  });
}
