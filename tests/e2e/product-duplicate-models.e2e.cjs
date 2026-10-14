// E2E：型號可重複（網址代號）、OEM／對照料號全站唯一
// 資料庫還沒執行 20261014_product_url_key.sql：照舊（型號不可重複）；執行後：同一型號可有多個產品，
// 每個產品有自己的網址（型號、型號-OEM、型號-2），OEM 料號不可重複，批量匯入不會誤覆蓋
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const migrate = () => fetch(`${MOCK_URL}/__mock/migrate-url-key`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const SUB1 = '20000000-0000-4000-8000-000000000001';
const OEM1 = '23411-GW0-010.23421-GW0-000';
const OEM2 = '23411-GW1-020.23421-GW1-111';

async function login(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
}

const api = (page, method, url, body) =>
  page.evaluate(
    async ({ method, url, body }) => {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: res.status, body: await res.json() };
    },
    { method, url, body }
  );

const dio = (extra = {}) => ({ category: 'cylinder', subCategoryId: SUB1, modelNumber: 'DIO50', nameEn: 'DIO Racing Final Drive Gear Set', stockQuantity: 5, isActive: true, ...extra });
const keyOf = async (id) => (await mockState()).tables.products.find((p) => p.id === id).url_key;

run('資料庫還沒執行更新語法：型號仍不可重複，網站照常', () =>
  withPage(async (page) => {
    await resetMock();
    await login(page);
    const first = await api(page, 'POST', '/api/admin/products', dio());
    assert(first.status === 200, `新增第一個 DIO50（${first.status}）`);
    const second = await api(page, 'POST', '/api/admin/products', dio({ nameEn: 'Another' }));
    assert(second.status === 409 && second.body.error.includes('已經存在'), `第二個 DIO50 被擋下（${second.status} ${second.body.error}）`);
    const res = await page.request.get(`${BASE_URL}/en/products/cylinder/std/DIO50`);
    assert(res.status() === 200, `產品頁照常（${res.status()}）`);
  })
);

run('型號可重複：網址代號、前台各自的網址、列表與搜尋、sitemap', () =>
  withPage(async (page) => {
    await resetMock();
    await migrate();
    await login(page);
    const a = await api(page, 'POST', '/api/admin/products', dio({ nameEn: 'DIO Racing Final Drive Gear Set 12x34', oemNumbers: [OEM1] }));
    const b = await api(page, 'POST', '/api/admin/products', dio({ nameEn: 'DIO Racing Final Drive Gear Set 16x38', oemNumbers: [OEM2] }));
    const c = await api(page, 'POST', '/api/admin/products', dio({ nameEn: 'DIO Plain Gear Set' }));
    assert([a, b, c].every((r) => r.status === 200), `三個 DIO50 都新增成功（${a.status}/${b.status}/${c.status} ${JSON.stringify(b.body)}）`);
    assert((await keyOf(a.body.id)) === 'DIO50', '第一個的網址代號是型號本身');
    assert((await keyOf(b.body.id)) === 'DIO50-23411-GW1-020-23421-GW1-111', `第二個用型號-OEM（${await keyOf(b.body.id)}）`);
    assert((await keyOf(c.body.id)) === 'DIO50-2', `沒有 OEM 的用流水號（${await keyOf(c.body.id)}）`);

    // 各自的產品頁（大小寫不同會轉址）
    const pages = [['DIO50', '12x34'], ['DIO50-23411-GW1-020-23421-GW1-111', '16x38'], ['DIO50-2', 'Plain']];
    for (const [key, text] of pages) {
      await page.goto(`${BASE_URL}/en/products/cylinder/std/${key}`);
      const body = await page.locator('main').innerText();
      assert(body.includes(text), `網址 ${key} 顯示對應的產品（${text}）`);
      assert((await page.locator('h1').first().innerText()).includes('DIO50'), '標題維持型號 DIO50');
    }
    const redirect = await page.request.get(`${BASE_URL}/en/products/cylinder/std/dio50-2`, { maxRedirects: 0 });
    assert(redirect.status() === 308 && redirect.headers().location.endsWith('/DIO50-2'), `大小寫不同轉址到正確網址（${redirect.status()}）`);

    // 子分類列表：三張卡片、三個不同的連結
    await page.goto(`${BASE_URL}/en/products/cylinder/std`);
    const hrefs = await page.locator('article.product-card a.text-link').evaluateAll((links) => links.map((l) => l.getAttribute('href')));
    const dioLinks = hrefs.filter((h) => /\/DIO50/.test(h));
    assert(dioLinks.length === 3 && new Set(dioLinks).size === 3, `列表有三個不同的連結（${dioLinks.join(', ')}）`);

    // 搜尋：型號找到三個；OEM 只找到對應的那一個，連結正確
    await page.goto(`${BASE_URL}/en/products/search?q=DIO50`);
    assert((await page.locator('.product-card').count()) === 3, '搜尋型號找到三個產品');
    await page.goto(`${BASE_URL}/en/products/search?q=${encodeURIComponent(OEM2)}`);
    assert((await page.locator('.product-card').count()) === 1, '搜尋 OEM 料號只找到一個');
    const link = await page.locator('.product-card a.text-link').first().getAttribute('href');
    assert(link.endsWith('/DIO50-23411-GW1-020-23421-GW1-111'), `搜尋結果連到正確網址（${link}）`);

    const sitemap = await (await page.request.get(`${BASE_URL}/sitemap.xml`)).text();
    for (const key of ['DIO50', 'DIO50-23411-GW1-020-23421-GW1-111', 'DIO50-2']) {
      assert(sitemap.includes(`/en/products/cylinder/std/${key}<`), `sitemap 有 ${key}`);
    }
  })
);

run('OEM 料號全站唯一；改 OEM 不改網址，改型號才改網址', () =>
  withPage(async (page) => {
    await resetMock();
    await migrate();
    await login(page);
    const a = await api(page, 'POST', '/api/admin/products', dio({ oemNumbers: [OEM1] }));
    const b = await api(page, 'POST', '/api/admin/products', dio({ nameEn: 'Second', oemNumbers: [OEM2] }));
    const dup = await api(page, 'POST', '/api/admin/products', dio({ nameEn: 'Third', oemNumbers: [OEM1.toLowerCase()] }));
    assert(dup.status === 409 && dup.body.error.includes('OEM') && dup.body.error.includes('DIO50'), `OEM 重複被擋下並指出產品（${dup.status} ${dup.body.error}）`);
    assert((await mockState()).tables.products.filter((p) => p.model_number === 'DIO50').length === 2, '被擋下的沒有存入');

    const self = await api(page, 'PUT', '/api/admin/products', dio({ id: a.body.id, oemNumbers: [OEM1, 'EXTRA-1'] }));
    assert(self.status === 200, `儲存自己的 OEM 不算重複（${self.status}）`);
    const steal = await api(page, 'PUT', '/api/admin/products', dio({ id: b.body.id, nameEn: 'Second', oemNumbers: [OEM2, 'EXTRA-1'] }));
    assert(steal.status === 409, `把別人的 OEM 加進來被擋下（${steal.status}）`);

    const before = await keyOf(b.body.id);
    await api(page, 'PUT', '/api/admin/products', dio({ id: b.body.id, nameEn: 'Second', oemNumbers: ['BRAND-NEW-9'] }));
    assert((await keyOf(b.body.id)) === before, '改 OEM 料號，網址代號不變，舊連結不會失效');
    await api(page, 'PUT', '/api/admin/products', dio({ id: b.body.id, nameEn: 'Second', modelNumber: 'DIO51', oemNumbers: ['BRAND-NEW-9'] }));
    assert((await keyOf(b.body.id)) === 'DIO51', '改型號才會重新產生網址代號');
  })
);

run('批量匯入：型號有多個產品時不亂覆蓋；新型號照常建立', () =>
  withPage(async (page) => {
    await resetMock();
    await migrate();
    await login(page);
    await api(page, 'POST', '/api/admin/products', dio({ nameEn: 'One', oemNumbers: [OEM1] }));
    await api(page, 'POST', '/api/admin/products', dio({ nameEn: 'Two', oemNumbers: [OEM2] }));
    const imp = await api(page, 'POST', '/api/admin/products/batch', {
      products: [
        { categorySlug: 'cylinder', subCategorySlug: 'std', modelNumber: 'DIO50', nameI18n: { en: 'Overwritten?' } },
        { categorySlug: 'cylinder', subCategorySlug: 'std', modelNumber: 'NEW-1', nameI18n: { en: 'Brand new' } }
      ]
    });
    assert(imp.status === 200, '匯入完成');
    const [dioRow, newRow] = imp.body.results;
    assert(!dioRow.success && dioRow.error.includes('有多個產品'), `重複型號回報原因（${dioRow.error}）`);
    assert(newRow.success, '新型號照常建立');
    const { tables } = await mockState();
    assert(tables.products.filter((p) => p.model_number === 'DIO50').every((p) => ['One', 'Two'].includes(p.name_i18n.en)), '兩個 DIO50 都沒被覆蓋');
    assert(tables.products.find((p) => p.model_number === 'NEW-1').url_key === 'NEW-1', '新產品有網址代號');
  })
);
