// E2E：客戶確認信不回顯需求說明（2026-10-04 老闆決定）
// 確認信寄到表單填的任何信箱，不放客戶自由輸入的文字；管理員通知信保留全文
// 需要模擬 Supabase 與模擬 Resend：
//   node tests/e2e/mock-supabase.cjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon SUPABASE_SERVICE_ROLE_KEY=service \
//   RESEND_API_KEY=test-key RESEND_API_URL=http://127.0.0.1:54321 npx next dev -p 3100
const { BASE_URL, withPage, seedCart, fillInquiryForm, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const MESSAGE = 'FREE PRIZE visit spam.example now';

async function submit(page, email, message) {
  await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
  await seedCart(page);
  await page.goto(`${BASE_URL}/en/inquiry`);
  await page.getByText('1HV-11311-00').first().waitFor();
  await fillInquiryForm(page, { email, message });
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith('/api/inquiry'), { timeout: 60000 }),
    page.click('button[type="submit"]')
  ]);
  assert(response.status() === 200, `送出成功（${response.status()}）`);
  await page.getByText('Inquiry successfully sent').waitFor();
  const { emails } = await mockState();
  return {
    customer: emails.find((m) => m.to === email),
    admin: emails.find((m) => m.to !== email)
  };
}

run('有填需求說明：確認信只說明已收到，通知信保留全文', () =>
  withPage(async (page) => {
    const { customer, admin } = await submit(page, 'confirm@example.com', MESSAGE);
    assert(customer, '客戶收到確認信');
    assert(!customer.html.includes('spam.example') && !customer.html.includes('FREE PRIZE'), '確認信沒有客戶填寫的需求說明');
    assert(customer.html.includes('Your additional requirements have been received'), '確認信提示需求說明已收到');
    assert(customer.html.includes('1HV-11311-00'), '確認信仍列出詢價品項');
    assert(admin && admin.html.includes(MESSAGE), '管理員通知信有需求說明全文');
  })
);

run('沒填需求說明：確認信不顯示提示', () =>
  withPage(async (page) => {
    const { customer } = await submit(page, 'confirm2@example.com', '');
    assert(customer && !customer.html.includes('additional requirements'), '沒有多餘的提示');
  })
);
