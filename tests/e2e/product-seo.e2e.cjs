// E2E：產品頁給搜尋引擎看的標題、描述，以及 robots.txt（SEO 調整，2026-10-06）
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const meta = (page, selector) => page.locator(selector).first().getAttribute('content');

run('產品頁標題：品名在前、加上分類與公司名；描述依語言寫成完整句子', () =>
  withPage(async (page) => {
    await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });

    await page.goto(`${BASE_URL}/en/products/cylinder/std/1HV-11311-00`);
    assert((await page.title()) === 'Cylinder Body 1HV-11311-00 | Cylinder | Xie Huang Motorcycle Parts', `英文標題（${await page.title()}）`);
    const en = await meta(page, 'meta[name="description"]');
    assert(en.startsWith('Cylinder Body (part no. 1HV-11311-00)') && en.includes('Specifications: STD, 47mm.') && !/[，。：]/.test(en), `英文描述完整且沒有中文標點（${en}）`);
    assert((await meta(page, 'meta[property="og:title"]')) === (await page.title()), '分享預覽（og:title）與標題相同');

    await page.goto(`${BASE_URL}/zh-TW/products/cylinder/std/1HV-11311-00`);
    assert((await page.title()) === '汽缸本體 1HV-11311-00 | 汽缸 | 協皇企業', `繁中標題（${await page.title()}）`);
    const tw = await meta(page, 'meta[name="description"]');
    assert(tw.startsWith('汽缸本體（型號 1HV-11311-00）') && tw.includes('台灣摩托車零件製造商協皇企業'), `繁中描述（${tw}）`);
  })
);

run('robots.txt 不封鎖網站的樣式與程式（/_next/），後台與 API 仍封鎖', () =>
  withPage(async (page) => {
    const text = await (await page.request.get(`${BASE_URL}/robots.txt`)).text();
    assert(!text.includes('/_next/'), '沒有封鎖 /_next/');
    assert(text.includes('Disallow: /*/admin/') && text.includes('Disallow: /api/'), '後台與 API 仍不給搜尋引擎讀取');
    assert(text.includes('Sitemap: '), '列出 sitemap 位置');
  })
);
