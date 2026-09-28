// A6 ④：回覆範本、信件內容與附件檢查
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReplyDraft, buildReplyHtml, hasUnfilledPlaceholder, isPdf, rfqCode, safeAttachmentName } from '../../src/lib/inquiry-reply.ts';

const inquiry = {
  id: '4a0b1c2d-0000-4000-8000-000000000001',
  customer_name: 'Marco Rossi',
  company_name: 'Moto Italia',
  created_at: '2026-09-27T16:30:00Z',
  items: [
    { modelNumber: 'CYL-125-STD', nameZhTw: '汽缸組 125cc', nameEn: 'Cylinder Kit 125cc', quantity: 200 },
    { modelNumber: 'CHN-428', quantity: 300 },
  ],
};

test('詢價編號使用台灣日期', () => {
  assert.equal(rfqCode(inquiry), 'RFQ-20260928-4A0B');
});

test('英文與中文範本：稱呼、品項、提示文字、簽名', () => {
  const en = buildReplyDraft(inquiry, 'en');
  assert.equal(en.subject, 'Quotation from Xie Huang Enterprise [RFQ-20260928-4A0B]');
  assert.match(en.body, /^Dear Marco Rossi,/);
  assert.match(en.body, /- CYL-125-STD Cylinder Kit 125cc × 200/);
  assert.match(en.body, /- CHN-428 × 300/);
  assert.match(en.body, /sales@xh-motorparts\.com/);
  assert.ok(hasUnfilledPlaceholder(en.body));

  const zh = buildReplyDraft(inquiry, 'zh-TW');
  assert.equal(zh.subject, '協皇企業報價回覆 [RFQ-20260928-4A0B]');
  assert.match(zh.body, /- CYL-125-STD 汽缸組 125cc × 200/);
  assert.ok(hasUnfilledPlaceholder(zh.body));
  assert.ok(!hasUnfilledPlaceholder(zh.body.replace('【請在這裡填寫單價、最小訂購量、交期與付款條件】', 'USD 12.5 / pc')));
});

test('信件 HTML：全部跳脫後才換行', () => {
  const html = buildReplyHtml('Hi <b>Marco</b>\nline2\n\n<script>alert(1)</script>');
  assert.match(html, /Hi &lt;b&gt;Marco&lt;\/b&gt;<br>line2<\/p>/);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<b>'));
  // 瀏覽器送出表單時換行為 \r\n
  const crlf = buildReplyHtml('Dear A,\r\n\r\nLine 1\r\nLine 2');
  assert.equal(crlf.match(/<p /g)?.length, 2);
  assert.ok(!crlf.includes('\r'));
  assert.match(crlf, /Line 1<br>Line 2/);
});

test('附件：以內容判斷 PDF、檔名安全', () => {
  assert.ok(isPdf(new TextEncoder().encode('%PDF-1.7\n...')));
  assert.ok(!isPdf(new TextEncoder().encode('<html>')));
  assert.equal(safeAttachmentName('報價單 Q-001.PDF'), '報價單-Q-001.pdf');
  assert.equal(safeAttachmentName('../../etc/passwd.pdf'), '..-..-etc-passwd.pdf');
  assert.equal(safeAttachmentName('.pdf'), 'quotation.pdf');
});
