// E2E：前台視覺細修（健診 VI-06、VI-24，工作包 N1，2026-10-18）
// 子分類少時分類頁右側補聯絡卡片；平板產品目錄落單的分類卡片撐滿整列；搜尋卡規格字縮小
// 使用模擬 Supabase（啟動方式同 product-search.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const post = (p, body) => fetch(`${MOCK_URL}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
const i18n = (tw, cn, en) => ({ 'zh-TW': tw, 'zh-CN': cn, en });

async function prepare(extraCategories = 0) {
  await post('/__mock/reset');
  if (!extraCategories) return;
  await post('/__mock/seed', {
    table: 'categories',
    rows: Array.from({ length: extraCategories }, (_, i) => ({
      id: `10000000-0000-4000-8000-0000000001${String(i).padStart(2, '0')}`,
      slug: `extra-${i}`,
      sort_order: 10 + i,
      name_i18n: i18n(`額外分類${i}`, `额外分类${i}`, `Extra ${i}`),
      description_i18n: i18n('說明', '说明', 'Desc')
    }))
  });
}

run('分類頁子分類少時：右側補「找不到零件」聯絡卡片（三語）', () =>
  withPage(async (page) => {
    await prepare();
    await page.goto(`${BASE_URL}/zh-TW/products/cylinder`, { waitUntil: 'networkidle' });
    const cta = page.getByTestId('category-contact-card');
    assert(await cta.isVisible(), '子分類只有 1 個時顯示聯絡卡片');
    assert((await cta.locator('a[href="mailto:sales@xh-motorparts.com"]').count()) === 1, '卡片有業務信箱連結');
    await page.goto(`${BASE_URL}/en/products/cylinder`, { waitUntil: 'networkidle' });
    assert((await page.getByTestId('category-contact-card').innerText()).includes('part'), '英文頁有英文說明');
  })
);

run('平板（820px）產品目錄：分類卡片 2 欄，最後落單的一張撐滿整列；桌機維持 3 欄', async () => {
  await prepare(1); // 預設 2 個 + 1 個 = 3 個分類
  await withPage(
    async (page) => {
      await page.goto(`${BASE_URL}/zh-TW/products`, { waitUntil: 'networkidle' });
      const rects = await page.locator('.card-grid > .category-card').evaluateAll((els) => els.map((e) => {
        const r = e.getBoundingClientRect();
        return { left: Math.round(r.left), width: Math.round(r.width) };
      }));
      assert(rects.length === 3, `3 張分類卡片（${rects.length}）`);
      assert(Math.abs(rects[0].left - rects[2].left) <= 1, '第 3 張回到第一欄');
      assert(rects[2].width >= rects[0].width * 1.9, `第 3 張撐滿整列（${rects[2].width}px vs ${rects[0].width}px）`);
    },
    { viewport: { width: 820, height: 1180 } }
  );
  await withPage(
    async (page) => {
      await page.goto(`${BASE_URL}/zh-TW/products`, { waitUntil: 'networkidle' });
      const lefts = await page.locator('.card-grid > .category-card').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
      assert(new Set(lefts).size === 3, `桌機 3 張在同一列（${lefts.join(',')}）`);
    },
    { viewport: { width: 1280, height: 900 } }
  );
});

run('搜尋結果卡片：規格字縮小', () =>
  withPage(async (page) => {
    await prepare();
    await page.goto(`${BASE_URL}/zh-TW/products/search?q=1HV`, { waitUntil: 'networkidle' });
    const size = await page.locator('.product-card__specs').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    assert(size <= 13.5, `規格字 ${size}px（至少縮到 13.5px 以下）`);
  })
);
