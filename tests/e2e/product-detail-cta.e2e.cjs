// E2E：產品頁不用捲動就看得到「加入詢價清單」，照片為 1:1（D15）
// 使用模擬 Supabase（產品頁需要資料）：
//   node tests/e2e/mock-supabase.cjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon \
//   SUPABASE_SERVICE_ROLE_KEY=service npx next dev -p 3100
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const PRODUCT_URL = `${BASE_URL}/zh-TW/products/cylinder/std/1HV-11311-00`;
const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });

// 產品照片使用直式圖片，重現照片被拉高的情況
const seedPortraitImage = () =>
  fetch(`${MOCK_URL}/__mock/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'product_images',
      rows: [{ id: '50000000-0000-4000-8000-000000000001', product_id: '30000000-0000-4000-8000-000000000001', storage_path: 'images/products/cylinder/cylinder-003.jpg', sort_order: 0 }],
    }),
  });

async function measure(page) {
  await page.goto(PRODUCT_URL, { waitUntil: 'networkidle' });
  const button = page.getByRole('button', { name: /加入詢價清單/ });
  const box = await button.boundingBox();
  const img = await page.locator('.detail-media img').boundingBox();
  const viewport = page.viewportSize();
  return { button, box, img, viewport };
}

run('桌機 1280×800：不用捲動就看得到加入詢價清單，照片為正方形', () =>
  withPage(
    async (page) => {
      await resetMock();
      await seedPortraitImage();
      const { button, box, img, viewport } = await measure(page);
      assert(box.y + box.height <= viewport.height, `按鈕在第一個畫面內（底部 ${Math.round(box.y + box.height)}px / ${viewport.height}px）`);
      assert(Math.abs(img.width - img.height) <= 2, `照片為 1:1（${Math.round(img.width)}×${Math.round(img.height)}）`);

      const order = await page.evaluate(() => {
        const info = document.querySelector('.detail-info');
        const btn = [...info.querySelectorAll('button')].find((b) => /加入詢價清單/.test(b.textContent));
        const back = [...info.querySelectorAll('a')].find((a) => /返回/.test(a.textContent));
        return Boolean(btn && back && btn.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      assert(order, '「返回子分類」連結在按鈕下方');

      await button.click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('xh_rfq_cart') || '[]').length === 1, null, { timeout: 10000 });
      assert(true, '按下後加入詢價清單');
    },
    { viewport: { width: 1280, height: 800 } }
  )
);

run('手機 390×844：照片為正方形，按鈕在 1,100px 以內', () =>
  withPage(
    async (page) => {
      await resetMock();
      await seedPortraitImage();
      const { box, img } = await measure(page);
      assert(Math.abs(img.width - img.height) <= 2, `照片為 1:1（${Math.round(img.width)}×${Math.round(img.height)}）`);
      assert(box.y < 1100, `按鈕位置 ${Math.round(box.y)}px（原本約 1,600px）`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(overflow <= 1, '沒有橫向捲動');
    },
    { viewport: { width: 390, height: 844 }, isMobile: true }
  )
);
