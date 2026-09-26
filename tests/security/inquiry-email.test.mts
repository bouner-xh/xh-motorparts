// S1：詢價信件 HTML 跳脫測試
// 執行：node --experimental-strip-types --test tests/security/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdminMailHtml,
  buildCustomerMailHtml,
  escapeHtml,
  sanitizeSubject
} from '../../src/lib/inquiry-email.ts';

const payload = '<a href="https://evil.example/pay">Confirm payment</a><script>alert(1)</script>';

const malicious = {
  name: `Eve ${payload}`,
  email: 'victim@example.com',
  companyName: `<img src=x onerror=alert(1)>`,
  country: `"><b>TW</b>`,
  phone: `<i>123</i>`,
  message: payload,
  items: [
    { modelNumber: `<u>1HV</u>`, nameEn: `<form action="https://evil.example">`, quantity: 2 }
  ]
};

test('escapeHtml 轉換所有 HTML 特殊字元', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(5), '5');
});

for (const [label, build] of [
  ['管理員通知信', buildAdminMailHtml],
  ['客戶確認信', buildCustomerMailHtml]
] as const) {
  test(`${label}不含使用者注入的 HTML 標籤`, () => {
    const html = build(malicious);
    for (const raw of ['<a href="https://evil', '<script>', '<img src=x', '<b>TW</b>', '<i>123', '<u>1HV', '<form action']) {
      assert.ok(!html.includes(raw), `${label} 含有未跳脫內容：${raw}`);
    }
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), '訊息應以文字形式呈現');
  });
}

test('正常內容照常顯示', () => {
  const html = buildAdminMailHtml({
    name: 'Chen',
    email: 'buyer@shop.vn',
    companyName: 'Saigon Moto',
    country: 'Vietnam',
    message: 'Need 50 pcs',
    items: [{ modelNumber: '1HV-11311-00', nameEn: 'Cylinder', quantity: 50 }]
  });
  for (const text of ['Chen', 'buyer@shop.vn', 'Saigon Moto', 'Vietnam', 'Need 50 pcs', '1HV-11311-00', 'Cylinder', '<strong>50</strong>', 'N/A']) {
    assert.ok(html.includes(text), `缺少：${text}`);
  }
});

test('信件標題移除換行字元', () => {
  assert.equal(sanitizeSubject('A\r\nBcc: x@y.com\nB'), 'A Bcc: x@y.com B');
});
