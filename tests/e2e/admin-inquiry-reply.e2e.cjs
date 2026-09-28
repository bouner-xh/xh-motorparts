// E2E：從後台回覆客戶（A6 ④）
// 範本、提示文字未改不能寄、PDF 附件、預覽、寄出後狀態與處理紀錄、非 PDF 被拒、寄信失敗不改狀態
// 需要模擬 Supabase 與模擬 Resend：
//   node tests/e2e/mock-supabase.cjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon SUPABASE_SERVICE_ROLE_KEY=service \
//   RESEND_API_KEY=test-key RESEND_API_URL=http://127.0.0.1:54321 ADMIN_EMAILS=admin@example.com npx next dev -p 3100
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const post = (p, body) => fetch(`${MOCK_URL}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const INQ_ID = '4a0b1c2d-0000-4000-8000-000000000601';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xh-reply-'));
const pdfPath = path.join(dir, 'Quotation Q-001.pdf');
fs.writeFileSync(pdfPath, '%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n');
const fakePdf = path.join(dir, 'fake.pdf');
fs.writeFileSync(fakePdf, '<html>not a pdf</html>');

async function open(page) {
  await post('/__mock/reset');
  await post('/__mock/seed', {
    table: 'inquiry_requests',
    rows: [{
      id: INQ_ID, customer_name: 'Marco Rossi', customer_email: 'marco@moto.example', company_name: 'Moto Italia', country: 'Italy',
      items: [{ modelNumber: 'CYL-125-STD', nameZhTw: '汽缸組 125cc', nameEn: 'Cylinder Kit 125cc', quantity: 200 }],
      status: 'pending', reply_notes: '', created_at: '2026-09-27T16:30:00Z', updated_at: '2026-09-27T16:30:00Z',
    }],
  });
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, '詢價');
  await page.locator('.admin-crm-panel tr', { hasText: 'Moto Italia' }).getByRole('button', { name: '檢視' }).click();
  const dialog = page.getByRole('dialog', { name: '詢價單詳情' });
  await dialog.getByRole('button', { name: '回覆客戶' }).click();
  await dialog.getByTestId('reply-editor').waitFor();
  return dialog;
}

run('範本、提示文字未改不能寄、附 PDF 寄出；狀態改為已回覆並留下紀錄', () =>
  withPage(async (page) => {
    const dialog = await open(page);
    const subject = dialog.getByLabel('主旨');
    const body = dialog.getByLabel('內容');
    assert((await subject.inputValue()) === 'Quotation from Xie Huang Enterprise [RFQ-20260928-4A0B]', `英文主旨含詢價編號（${await subject.inputValue()}）`);
    assert((await body.inputValue()).includes('- CYL-125-STD Cylinder Kit 125cc × 200'), '內容帶入型號與數量');

    await dialog.getByRole('button', { name: '中文' }).click();
    assert((await subject.inputValue()) === '協皇企業報價回覆 [RFQ-20260928-4A0B]', '切換中文範本');
    await dialog.getByRole('button', { name: 'English' }).click();

    await dialog.getByRole('button', { name: '預覽' }).click();
    const preview = dialog.getByTestId('reply-preview');
    assert(await preview.getByText(/內容還有範本的提示文字/).isVisible(), '提示文字未改時顯示警告');
    assert(await preview.getByRole('button', { name: '確認寄出' }).isDisabled(), '且不能寄出');

    await preview.getByRole('button', { name: '返回修改' }).click();
    const filled = (await body.inputValue()).replace('[Please fill in unit price, MOQ, lead time and payment terms here]', 'Unit price: USD 12.50 <FOB>\nMOQ: 100 pcs');
    await body.fill(filled);
    await dialog.getByLabel(/附件/).setInputFiles(pdfPath);
    await dialog.getByRole('button', { name: '預覽' }).click();
    const text = await preview.innerText();
    assert(text.includes('marco@moto.example') && text.includes('Quotation Q-001.pdf') && text.includes('USD 12.50 <FOB>'), '預覽顯示收件人、附件與內容（HTML 以文字顯示）');
    await preview.getByRole('button', { name: '確認寄出' }).click();
    await page.getByText('已寄出回覆給 Moto Italia，狀態已改為「已回覆」').waitFor({ timeout: 15000 });

    const { emails, tables } = await mockState();
    assert(emails.length === 1, `寄出 1 封（${emails.length}）`);
    const mail = emails[0];
    assert(mail.to === 'marco@moto.example' && mail.reply_to === 'sales@xh-motorparts.com' && mail.cc.join() === 'sales@xh-motorparts.com', '收件人、回覆地址與副本');
    assert(mail.html.includes('USD 12.50 &lt;FOB&gt;<br>MOQ: 100 pcs') && !mail.html.includes('<FOB>'), '內容跳脫 HTML 並保留換行');
    assert(mail.attachments.length === 1 && mail.attachments[0].filename === 'Quotation-Q-001.pdf', '附件檔名');
    assert(Buffer.from(mail.attachments[0].content, 'base64').toString().startsWith('%PDF-'), '附件內容為 PDF');

    const inquiry = tables.inquiry_requests.find((r) => r.id === INQ_ID);
    assert(inquiry.status === 'replied', '狀態改為已回覆');
    const events = tables.inquiry_events || [];
    const reply = events.find((e) => e.action === 'reply');
    assert(reply && reply.actor_email === 'admin@example.com' && reply.detail.subject.includes('RFQ-20260928-4A0B') && reply.detail.attachment === 'Quotation-Q-001.pdf', '處理紀錄記下寄出人、主旨與附件');
    assert(events.some((e) => e.action === 'status' && e.to_value === 'replied'), '處理紀錄記下狀態變更');

    await page.locator('.admin-crm-panel tr', { hasText: 'Moto Italia' }).getByRole('button', { name: '檢視' }).click();
    const eventsBox = page.getByRole('dialog', { name: '詢價單詳情' }).getByTestId('inquiry-events');
    await eventsBox.getByText('載入中...').waitFor({ state: 'detached', timeout: 10000 });
    const timeline = await eventsBox.innerText();
    assert(timeline.includes('寄出回覆：「Quotation from Xie Huang Enterprise [RFQ-20260928-4A0B]」（附件 Quotation-Q-001.pdf）'), `時間軸顯示寄出紀錄（${timeline}）`);
  })
);

async function fillAndPreview(dialog) {
  const body = dialog.getByLabel('內容');
  await body.fill((await body.inputValue()).replace('[Please fill in unit price, MOQ, lead time and payment terms here]', 'USD 12.50'));
  await dialog.getByRole('button', { name: '預覽' }).click();
  await dialog.getByTestId('reply-preview').getByRole('button', { name: '確認寄出' }).click();
}

run('附件不是真的 PDF：拒絕並說明，不寄出', () =>
  withPage(async (page) => {
    const dialog = await open(page);
    await dialog.getByLabel(/附件/).setInputFiles(fakePdf);
    await fillAndPreview(dialog);
    await dialog.getByText('附件只接受 PDF 檔').waitFor({ timeout: 10000 });
    const { emails, tables } = await mockState();
    assert(emails.length === 0, '沒有寄出');
    assert(tables.inquiry_requests[0].status === 'pending', '狀態不變');
  })
);

run('寄信失敗：顯示錯誤、狀態不變、不留寄出紀錄', () =>
  withPage(async (page) => {
    const dialog = await open(page);
    await post('/__mock/email-fail', { fail: true });
    await fillAndPreview(dialog);
    await dialog.getByText(/寄信失敗/).waitFor({ timeout: 10000 });
    const { tables } = await mockState();
    assert(tables.inquiry_requests[0].status === 'pending', '狀態不變');
    assert(!(tables.inquiry_events || []).some((e) => e.action === 'reply'), '沒有寄出紀錄');
    assert(await dialog.getByTestId('reply-editor').isVisible(), '回到編輯畫面，內容保留可再試');
  })
);
