// E2E：小型體驗改善包（健檢 UX-06、07、08、09、11，2026-10-17）
// UX-06 搜尋結果超過上限時提示總數、子分類頁顯示產品數；UX-07 查無結果給分類連結與信箱
// UX-08 詢價清單的型號連回產品頁；UX-09 數量欄位有標籤、上下限一致；UX-11 跳到主要內容、焦點外框、側欄分類標題翻譯
// 使用模擬 Supabase（啟動方式同 product-search.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });

async function prepare(bulk = 0) {
  await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
  if (!bulk) return;
  const rows = [];
  for (let i = 0; i < bulk; i += 1) {
    const n = String(i).padStart(3, '0');
    rows.push({
      id: `30000000-0000-4000-8000-000000009${n}`,
      category_id: '10000000-0000-4000-8000-000000000001',
      sub_category_id: '20000000-0000-4000-8000-000000000001',
      model_number: `BULK-${n}`,
      name_i18n: { 'zh-TW': `批量零件${n}`, 'zh-CN': `批量零件${n}`, en: `Bulk Part ${n}` },
      specifications: [],
      stock_quantity: 1,
      is_active: true
    });
  }
  await seed('products', rows);
}

run('搜尋結果超過上限：提示總數與只顯示前 60 項', () =>
  withPage(async (page) => {
    await prepare(65);
    await page.goto(`${BASE_URL}/zh-TW/products/search?q=BULK`);
    const summary = await page.getByTestId('search-summary').innerText();
    assert(summary.includes('共 65 項產品'), `摘要顯示總數 65（${summary}）`);
    assert((await page.locator('.product-card').count()) === 60, '只列出 60 項');
    const note = await page.getByTestId('search-truncated').innerText();
    assert(note.includes('65') && note.includes('60'), `有截斷提示（${note}）`);
    await page.goto(`${BASE_URL}/zh-TW/products/search?q=1HV`);
    assert((await page.getByTestId('search-truncated').count()) === 0, '沒超過上限時不顯示截斷提示');
  })
);

run('子分類頁顯示產品數', () =>
  withPage(async (page) => {
    await prepare(3);
    await page.goto(`${BASE_URL}/zh-TW/products/cylinder/std`);
    const text = await page.getByTestId('subcategory-count').innerText();
    const shown = await page.locator('.product-card').count();
    assert(text.includes(`${shown}`), `顯示產品數 ${shown}（${text}）`);
  })
);

run('查無結果：提供分類連結與業務信箱', () =>
  withPage(async (page) => {
    await prepare();
    await page.goto(`${BASE_URL}/zh-TW/products/search?q=NOPE-NOTHING`);
    const links = page.getByTestId('search-empty-categories').getByRole('link');
    assert((await links.count()) >= 1, '有分類連結');
    const href = await links.first().getAttribute('href');
    assert(/^\/zh-TW\/products\/[^/]+$/.test(href), `分類連結指向分類頁（${href}）`);
    assert((await page.locator('.search-empty a[href="mailto:sales@xh-motorparts.com"]').count()) === 1, '有業務信箱連結');
  })
);

run('詢價清單：型號連回產品頁、數量欄位有標籤', () =>
  withPage(async (page) => {
    await prepare();
    await page.goto(`${BASE_URL}/zh-TW/products/cylinder/std`);
    await page.locator('.product-card__inquiry').first().click();
    await page.goto(`${BASE_URL}/zh-TW/inquiry`);
    await page.locator('.cart-row').first().waitFor();
    const link = page.locator('.cart-row__model a').first();
    assert((await link.count()) === 1, '型號是連結');
    const href = await link.getAttribute('href');
    assert(/^\/zh-TW\/products\/cylinder\/std\/[^/]+$/.test(href), `連到產品頁（${href}）`);
    const row = page.locator('.cart-row').first();
    assert((await row.getByRole('button', { name: '減少數量' }).count()) === 1, '減少按鈕有標籤');
    assert((await row.getByRole('button', { name: '增加數量' }).count()) === 1, '增加按鈕有標籤');
    assert((await row.getByRole('spinbutton', { name: /的數量$/ }).count()) === 1, '數量欄位有標籤');
    await row.getByRole('spinbutton').fill('1000000');
    assert(await row.getByRole('status').isVisible(), '達上限時提示');
    await Promise.all([page.waitForURL(new RegExp(`${href}$`)), link.click()]);
  })
);

run('產品頁數量：標籤對應欄位、最小為 1', () =>
  withPage(async (page) => {
    await prepare();
    await page.goto(`${BASE_URL}/zh-TW/products/cylinder/std/1HV-11311-00`);
    const input = page.getByLabel('需求數量', { exact: true });
    assert((await input.count()) === 1, '點標籤對應到數量欄位');
    assert((await page.getByRole('button', { name: '減少數量' }).count()) === 1, '減少按鈕有標籤');
    await input.fill('20');
    await page.getByRole('button', { name: '減少數量' }).click();
    assert((await input.inputValue()) === '1', `減少不會低於 1（${await input.inputValue()}）`);
  })
);

run('鍵盤：跳到主要內容、焦點外框、側欄分類標題已翻譯', () =>
  withPage(async (page) => {
    await prepare();
    await page.goto(`${BASE_URL}/zh-TW/products`);
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: '跳到主要內容' });
    assert(await skip.isVisible(), '第一個 Tab 出現「跳到主要內容」');
    const box = await skip.boundingBox();
    assert(box && box.y >= 0, '連結在畫面內');
    await page.keyboard.press('Enter');
    const focusedId = await page.evaluate(() => document.activeElement && document.activeElement.id);
    assert(focusedId === 'main-content', `Enter 後焦點到主要內容（${focusedId}）`);

    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement);
      return { style: s.outlineStyle, width: s.outlineWidth };
    });
    assert(outline.style !== 'none' && parseFloat(outline.width) >= 2, `鍵盤聚焦有外框（${JSON.stringify(outline)}）`);

    const label = await page.locator('.category-sidebar__label').first().innerText();
    assert(label === '產品分類', `側欄標題為中文（${label}）`);
    await page.goto(`${BASE_URL}/en/products`);
    assert((await page.locator('.category-sidebar__label').first().innerText()).toLowerCase() === 'catalog', '英文頁維持 Catalog');
  })
);
