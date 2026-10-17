// E2E：詢價可靠度（2026-10-17 網站健診 工作包 B）
// 需要模擬 Supabase 與模擬 Resend（不設定 Turnstile 與 Upstash）：
//   node tests/e2e/mock-supabase.cjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon SUPABASE_SERVICE_ROLE_KEY=service \
//   RESEND_API_KEY=test-key RESEND_API_URL=http://127.0.0.1:54321 npx next dev -p 3100
const { BASE_URL, withPage, seedCart, fillInquiryForm, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const reset = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', body: JSON.stringify({ table, rows }) });
const PRODUCT_ID = '30000000-0000-4000-8000-000000000001';
const INACTIVE_ID = '30000000-0000-4000-8000-0000000000aa';
const FIELDS = {
  name: 'Keep Buyer',
  email: 'keep@example.com',
  companyName: 'Keep Trading',
  country: 'Germany',
  phone: '+49 111',
  message: 'Need OEM packing.'
};

async function openInquiry(page, locale = 'en') {
  await seedCart(page);
  await page.goto(`${BASE_URL}/${locale}/inquiry`);
  await page.locator('[name="name"]').waitFor();
}

async function readFields(page) {
  const out = {};
  for (const key of Object.keys(FIELDS)) out[key] = await page.inputValue(`[name="${key}"]`);
  return out;
}

const failures = [
  ['伺服器錯誤 500', { status: 500, body: { error: '伺服器處理詢價單時發生錯誤', code: 'server_error' } }, /Something went wrong/],
  ['流量限制 429', { status: 429, body: { error: '請求過於頻繁，請稍後再試', code: 'rate_limited' } }, /Too many requests/],
  ['驗證失敗 400', { status: 400, body: { error: '驗證失敗，請重新送出', code: 'captcha_failed' } }, /Verification failed/],
  ['舊版沒有代碼的回應', { status: 500, body: { error: '伺服器處理詢價單時發生錯誤' } }, /Something went wrong/]
];

for (const [label, response, pattern] of failures) {
  run(`送出失敗（${label}）：六個欄位保留，顯示紅色 role=alert 的英文訊息與備用信箱`, () =>
    withPage(async (page) => {
      await openInquiry(page);
      await page.route('**/api/inquiry', (route) =>
        route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.body) })
      );
      await fillInquiryForm(page, FIELDS);
      await page.click('button[type="submit"]');
      const alert = page.getByTestId('inquiry-error');
      await alert.waitFor();
      assert((await alert.getAttribute('role')) === 'alert', '訊息有 role=alert');
      const text = await alert.innerText();
      assert(pattern.test(text), `顯示英文訊息（${text}）`);
      assert(text.includes('sales@xh-motorparts.com'), '訊息附上備用聯絡信箱');
      assert(!/[一-鿿]/.test(text), '英文介面不出現中文錯誤訊息');
      const color = await alert.evaluate((el) => getComputedStyle(el).color);
      const [r, g, b] = color.match(/\d+/g).map(Number);
      assert(r > 200 && g < 190 && b < 190, `訊息為紅色系（${color}）`);
      const fields = await readFields(page);
      assert(JSON.stringify(fields) === JSON.stringify(FIELDS), `失敗後欄位內容保留（${JSON.stringify(fields)}）`);
      assert(await page.locator('button[type="submit"]').isEnabled(), '送出按鈕恢復可按');
    })
  );
}

run('網路斷線：欄位保留並顯示網路錯誤訊息', () =>
  withPage(async (page) => {
    await openInquiry(page);
    await page.route('**/api/inquiry', (route) => route.abort('connectionrefused'));
    await fillInquiryForm(page, FIELDS);
    await page.click('button[type="submit"]');
    const alert = page.getByTestId('inquiry-error');
    await alert.waitFor();
    assert(/Network error/.test(await alert.innerText()), '顯示網路錯誤訊息');
    assert(JSON.stringify(await readFields(page)) === JSON.stringify(FIELDS), '欄位內容保留');
  })
);

run('繁體中文介面：錯誤訊息依代碼顯示中文', () =>
  withPage(async (page) => {
    await openInquiry(page, 'zh-TW');
    await page.route('**/api/inquiry', (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'x', code: 'rate_limited' }) })
    );
    await fillInquiryForm(page, FIELDS);
    await page.click('button[type="submit"]');
    const text = await page.getByTestId('inquiry-error').innerText();
    assert(text.includes('送出太頻繁') && text.includes('sales@xh-motorparts.com'), `顯示中文訊息（${text}）`);
  })
);

run('錯誤訊息出現時捲入視野', () =>
  withPage(
    async (page) => {
      await openInquiry(page);
      await page.route('**/api/inquiry', (route) =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'x', code: 'server_error' }) })
      );
      await fillInquiryForm(page, FIELDS);
      await page.click('button[type="submit"]');
      await page.getByTestId('inquiry-error').waitFor();
      await page.waitForFunction(() => {
        const rect = document.querySelector('[data-testid="inquiry-error"]').getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      });
      assert(true, '錯誤訊息完整出現在視窗內');
    },
    { viewport: { width: 390, height: 600 } }
  )
);

run('API 錯誤回應：保留中文 error 欄位與狀態碼，另附穩定代碼', () =>
  withPage(async (page) => {
    await reset();
    const res = await page.request.post(`${BASE_URL}/api/inquiry`, { data: { name: 'x' } });
    assert(res.status() === 400, `狀態碼 400（${res.status()}）`);
    const body = await res.json();
    assert(body.code === 'invalid_input', `代碼 invalid_input（${body.code}）`);
    assert(body.error === '表單或詢價品項資料不完整', '中文 error 欄位不變');
  })
);

run('切換語言：已填內容以 sessionStorage 草稿保留；草稿不含驗證 token；送出成功後清除', () =>
  withPage(async (page) => {
    await reset();
    await openInquiry(page, 'en');
    await fillInquiryForm(page, FIELDS);
    await page.waitForFunction(() => sessionStorage.getItem('xh_inquiry_draft'));
    const stored = await page.evaluate(() => sessionStorage.getItem('xh_inquiry_draft'));
    assert(!/token/i.test(stored), '草稿不含 token');
    await page.goto(`${BASE_URL}/zh-TW/inquiry`);
    await page.locator('[name="name"]').waitFor();
    await page.waitForFunction((v) => document.querySelector('[name="name"]').value === v, FIELDS.name);
    assert(JSON.stringify(await readFields(page)) === JSON.stringify(FIELDS), '換成繁體中文後欄位內容仍在');
    await page.click('button[type="submit"]');
    await page.getByText('詢價已成功送出').waitFor();
    const draft = await page.evaluate(() => sessionStorage.getItem('xh_inquiry_draft'));
    assert(draft === null, '送出成功後草稿已清除');
  })
);

run('sessionStorage 不可用：頁面仍可正常填寫與送出', () =>
  withPage(async (page) => {
    await reset();
    await page.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('blocked'); } });
    });
    await openInquiry(page, 'en');
    await fillInquiryForm(page, FIELDS);
    await page.click('button[type="submit"]');
    await page.getByText('Inquiry successfully sent').waitFor();
    assert(true, '無法使用 sessionStorage 仍可送出');
  })
);

run('成功畫面：顯示項數、確認信信箱、詢價編號與回覆時效', () =>
  withPage(async (page) => {
    await reset();
    await openInquiry(page, 'en');
    await fillInquiryForm(page, { ...FIELDS, email: 'summary@example.com' });
    await page.click('button[type="submit"]');
    const summary = page.getByTestId('inquiry-success-summary');
    await summary.waitFor();
    const text = await summary.innerText();
    assert(text.includes('1 item submitted') && text.includes('summary@example.com'), `摘要含項數與信箱（${text}）`);
    assert(/Inquiry No\. RFQ-\d{8}-[0-9A-F]{4}/.test(text), '顯示詢價編號');
    assert(text.includes('We reply within 24 hours on business days'), '顯示回覆時效');
    assert(text.includes('09:00–18:00') && text.includes('GMT+8'), '註明營業時間與時區');
  })
);

run('成功畫面（繁體中文）', () =>
  withPage(async (page) => {
    await reset();
    await openInquiry(page, 'zh-TW');
    await fillInquiryForm(page, { ...FIELDS, email: 'summary2@example.com' });
    await page.click('button[type="submit"]');
    const summary = page.getByTestId('inquiry-success-summary');
    await summary.waitFor();
    const text = await summary.innerText();
    assert(text.includes('已送出 1 項') && text.includes('summary2@example.com') && text.includes('24 小時內回覆'), `中文摘要（${text}）`);
  })
);

run('桌機版詢價清單：「移除」按鈕不換行', () =>
  withPage(
    async (page) => {
      await openInquiry(page, 'zh-TW');
      const button = page.locator('.inquiry-cart-table .remove-btn').first();
      await button.waitFor();
      assert((await button.evaluate((el) => getComputedStyle(el).whiteSpace)) === 'nowrap', 'white-space: nowrap');
      const box = await button.boundingBox();
      assert(box.height < 50, `按鈕沒有被擠成直排（高度 ${box.height}）`);
    },
    { viewport: { width: 1280, height: 800 } }
  )
);

run('既有客戶（信箱大小寫不同）：視為同一人、不覆蓋姓名公司電話，只補空欄位；詢價單存這次內容', () =>
  withPage(async (page) => {
    await reset();
    await seed('customers', [
      { id: 'c0000000-0000-4000-8000-000000000001', email: 'Mixed.Case@Example.com', name: 'Original Name', company_name: '', country: 'Japan', phone: '', created_at: '2026-01-01T00:00:00Z' }
    ]);
    await openInquiry(page, 'en');
    await fillInquiryForm(page, { ...FIELDS, email: 'mixed.case@example.com', name: 'Hacker', companyName: 'Evil Co', country: 'Nowhere', phone: '999' });
    await page.click('button[type="submit"]');
    await page.getByText('Inquiry successfully sent').waitFor();

    const { tables } = await mockState();
    assert(tables.customers.length === 1, `沒有新增重複客戶（${tables.customers.length} 筆）`);
    const customer = tables.customers[0];
    assert(customer.name === 'Original Name', `姓名未被覆蓋（${customer.name}）`);
    assert(customer.country === 'Japan', `國家未被覆蓋（${customer.country}）`);
    assert(customer.company_name === 'Evil Co' && customer.phone === '999', '原本空白的公司與電話被補上');
    const inquiry = tables.inquiry_requests.find((r) => r.customer_email === 'mixed.case@example.com');
    assert(inquiry && inquiry.customer_id === customer.id, '詢價單綁定到既有客戶');
    assert(inquiry.customer_name === 'Hacker' && inquiry.company_name === 'Evil Co', '詢價單仍存這次填寫的內容快照');
  })
);

run('新客戶：Email 以小寫儲存', () =>
  withPage(async (page) => {
    await reset();
    await openInquiry(page, 'en');
    await fillInquiryForm(page, { ...FIELDS, email: 'New.Buyer@Example.COM' });
    await page.click('button[type="submit"]');
    await page.getByText('Inquiry successfully sent').waitFor();
    const { tables } = await mockState();
    assert(tables.customers.length === 1 && tables.customers[0].email === 'new.buyer@example.com', `客戶信箱為小寫（${tables.customers[0]?.email}）`);
  })
);

run('未上架的產品：查不到名稱，只保留型號', () =>
  withPage(async (page) => {
    await reset();
    await seed('products', [
      { id: INACTIVE_ID, category_id: '10000000-0000-4000-8000-000000000001', sub_category_id: '20000000-0000-4000-8000-000000000001', model_number: 'HIDDEN-001', name_i18n: { 'zh-TW': '機密新品', 'zh-CN': '机密新品', en: 'Secret New Part' }, stock_quantity: 1, specifications: [], is_active: false }
    ]);
    await seedCart(page, [
      { id: INACTIVE_ID, modelNumber: 'HIDDEN-001', nameZhTw: '', nameZhCn: '', nameEn: '', quantity: 5 },
      { id: PRODUCT_ID, modelNumber: '1HV-11311-00', nameZhTw: '', nameZhCn: '', nameEn: '', quantity: 1 }
    ]);
    await page.goto(`${BASE_URL}/en/inquiry`);
    await page.locator('[name="name"]').waitFor();
    await fillInquiryForm(page, { ...FIELDS, email: 'inactive@example.com' });
    await page.click('button[type="submit"]');
    await page.getByText('Inquiry successfully sent').waitFor();
    const { tables, emails } = await mockState();
    const saved = tables.inquiry_requests.find((r) => r.customer_email === 'inactive@example.com');
    const hidden = saved.items.find((i) => i.modelNumber === 'HIDDEN-001');
    assert(hidden && hidden.nameEn === '' && hidden.nameZhTw === '', '未上架產品名稱清空、型號保留');
    const live = saved.items.find((i) => i.modelNumber === '1HV-11311-00');
    assert(live.nameEn === 'Cylinder Body', '上架中的產品名稱照常帶入');
    assert(emails.every((m) => !m.html.includes('Secret New Part') && !m.html.includes('机密新品')), '信件沒有未上架產品的名稱');
  })
);
