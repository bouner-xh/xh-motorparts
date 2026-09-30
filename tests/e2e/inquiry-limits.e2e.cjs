// E2E：詢價欄位上限與品項名稱以資料庫為準（R3，2026-09-29 安全複查）
// 需要模擬 Supabase 與模擬 Resend：
//   node tests/e2e/mock-supabase.cjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon SUPABASE_SERVICE_ROLE_KEY=service \
//   RESEND_API_KEY=test-key RESEND_API_URL=http://127.0.0.1:54321 npx next dev -p 3100
const { BASE_URL, withPage, seedCart, fillInquiryForm, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const reset = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const PRODUCT_ID = '30000000-0000-4000-8000-000000000001';
const SPAM = 'FREE PRIZE visit http://spam.example now';

run('瀏覽器改過的品項名稱：信件與詢價單都用資料庫的名稱', () =>
  withPage(async (page) => {
    await reset();
    // 模擬有人竄改瀏覽器裡的詢價清單，把品項名稱換成廣告文字
    await seedCart(page, [
      { id: PRODUCT_ID, modelNumber: '1HV-11311-00', nameZhTw: SPAM, nameZhCn: SPAM, nameEn: SPAM, quantity: 10 },
      { id: 'not-in-db', modelNumber: 'X-1', nameZhTw: SPAM, nameZhCn: SPAM, nameEn: SPAM, quantity: 2 }
    ]);
    await page.goto(`${BASE_URL}/en/inquiry`);
    await page.getByText('1HV-11311-00').first().waitFor();
    await fillInquiryForm(page, { email: 'limits@example.com' });
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith('/api/inquiry'), { timeout: 60000 }),
      page.click('button[type="submit"]')
    ]);
    assert(response.status() === 200, `送出成功（${response.status()}）`);
    await page.getByText('Inquiry successfully sent').waitFor();

    const { emails, tables } = await mockState();
    assert(emails.length === 2, `寄出 2 封信（${emails.length}）`);
    assert(emails.every((m) => !m.html.includes('spam.example')), '兩封信都沒有竄改的文字');
    const customerMail = emails.find((m) => m.to === 'limits@example.com');
    assert(customerMail && customerMail.html.includes('汽缸本體'), '確認信使用資料庫的品項名稱');
    const saved = tables.inquiry_requests.find((r) => r.customer_email === 'limits@example.com');
    assert(!JSON.stringify(saved.items).includes('spam.example'), '詢價單存的也是資料庫名稱');
    assert(saved.items.some((i) => i.modelNumber === 'X-1' && i.quantity === 2), '查不到的品項保留型號與數量');
  })
);

run('表單欄位有長度上限；超過上限的請求被拒絕且不寄信', () =>
  withPage(async (page) => {
    await reset();
    await seedCart(page);
    await page.goto(`${BASE_URL}/en/inquiry`);
    await page.getByText('1HV-11311-00').first().waitFor();
    await page.fill('[name="name"]', 'A'.repeat(300));
    const typed = await page.inputValue('[name="name"]');
    assert(typed.length === 100, `姓名最多只能輸入 100 字（${typed.length}）`);
    await page.fill('[name="message"]', 'B'.repeat(3000));
    assert((await page.inputValue('[name="message"]')).length === 2000, '需求說明最多 2,000 字');

    const base = { name: 'Buyer', email: 'limits2@example.com', companyName: 'Co', country: 'VN', turnstileToken: '' };
    const item = { productId: PRODUCT_ID, modelNumber: '1HV-11311-00', quantity: 1 };
    const cases = [
      ['姓名過長', { ...base, name: 'A'.repeat(101), items: [item] }],
      ['需求說明過長', { ...base, message: 'B'.repeat(2001), items: [item] }],
      ['品項超過 100 項', { ...base, items: Array.from({ length: 101 }, () => item) }],
      ['品項名稱過長', { ...base, items: [{ ...item, nameEn: 'C'.repeat(201) }] }],
      ['數量超過上限', { ...base, items: [{ ...item, quantity: 1_000_001 }] }]
    ];
    for (const [label, data] of cases) {
      const res = await page.request.post(`${BASE_URL}/api/inquiry`, { data });
      assert(res.status() === 400, `${label}：拒絕（${res.status()}）`);
    }
    const { emails, tables } = await mockState();
    assert(emails.length === 0, '沒有寄出任何信');
    assert(!(tables.inquiry_requests || []).some((r) => r.customer_email === 'limits2@example.com'), '沒有寫入詢價單');
  })
);
