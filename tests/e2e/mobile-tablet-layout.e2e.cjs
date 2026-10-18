// E2E：平板與手機前台版面（健診 VI-12、VI-23、UX-10，2026-10-18）
// 平板（≤1024px）頁首收合成 ☰ 選單；手機產品列表的分類側欄預設收合；手機 Cookie 橫幅縮小、按鈕至少 44px 高
// 使用模擬 Supabase（啟動方式同 product-search.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const reset = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });

run('平板（820px）頁首收合成 ☰ 選單；桌機（1280px）維持完整導覽列', async () => {
  await withPage(
    async (page) => {
      await page.goto(`${BASE_URL}/zh-TW/products`, { waitUntil: 'networkidle' });
      assert(await page.locator('button.menu-toggle').isVisible(), '平板顯示 ☰ 按鈕');
      assert(!(await page.locator('#site-nav').isVisible()), '平板預設收合導覽列');
      const h = await page.locator('header.site-header').evaluate((el) => el.offsetHeight);
      assert(h <= 100, `平板頁首高度 ${h}px`);
      await page.locator('button.menu-toggle').click();
      assert(await page.locator('#site-nav').getByRole('link', { name: '產品目錄', exact: true }).isVisible(), '按下 ☰ 後看得到導覽連結');
    },
    { viewport: { width: 820, height: 1180 } }
  );
  await withPage(
    async (page) => {
      await page.goto(`${BASE_URL}/zh-TW/products`, { waitUntil: 'networkidle' });
      assert(!(await page.locator('button.menu-toggle').isVisible()), '桌機不顯示 ☰ 按鈕');
      assert(await page.locator('#site-nav').getByRole('link', { name: '產品目錄', exact: true }).isVisible(), '桌機直接顯示導覽列');
    },
    { viewport: { width: 1280, height: 900 } }
  );
});

run('手機產品列表：分類側欄預設收合，商品露出在第一屏；可展開；桌機維持攤開', async () => {
  await reset();
  await withPage(
    async (page) => {
      await page.goto(`${BASE_URL}/zh-TW/products/cylinder/std`, { waitUntil: 'networkidle' });
      const toggle = page.locator('button.category-sidebar__toggle');
      assert(await toggle.isVisible(), '手機有「產品分類」展開按鈕');
      assert((await toggle.getAttribute('aria-expanded')) === 'false', '預設收合');
      assert(!(await page.locator('.category-sidebar__list').isVisible()), '分類清單預設不顯示');
      const top = await page.locator('.product-card').first().evaluate((el) => el.getBoundingClientRect().top);
      assert(top < 844, `第一張商品卡在第一屏內（top=${Math.round(top)}px）`);
      await toggle.click();
      assert((await toggle.getAttribute('aria-expanded')) === 'true', '按下後展開');
      assert(await page.locator('.category-sidebar__list').isVisible(), '分類清單顯示');
    },
    { viewport: { width: 390, height: 844 } }
  );
  await withPage(
    async (page) => {
      await page.goto(`${BASE_URL}/zh-TW/products/cylinder/std`, { waitUntil: 'networkidle' });
      assert(!(await page.locator('button.category-sidebar__toggle').isVisible()), '桌機沒有展開按鈕');
      assert(await page.locator('.category-sidebar__list').isVisible(), '桌機分類清單攤開');
    },
    { viewport: { width: 1280, height: 900 } }
  );
});

run('手機 Cookie 橫幅：縮小且按鈕至少 44px 高', () =>
  withPage(
    async (page) => {
      await page.goto(`${BASE_URL}/zh-TW/contact`, { waitUntil: 'networkidle' });
      const banner = page.locator('.CookieConsent');
      await banner.waitFor();
      const box = await banner.boundingBox();
      assert(box.height <= 150, `橫幅高度 ${Math.round(box.height)}px`);
      for (const [name, id] of [['接受', '#rcc-confirm-button'], ['拒絕', '#rcc-decline-button']]) {
        const b = await banner.locator(id).boundingBox();
        assert(b.height >= 44, `「${name}」按鈕高 ${Math.round(b.height)}px（至少 44px）`);
      }
    },
    { viewport: { width: 390, height: 844 } }
  )
);
