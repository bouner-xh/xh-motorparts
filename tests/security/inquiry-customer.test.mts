// 工作包 B（SX-5／SX-6／UX-03）：詢價客戶資料處理、確認信額度、Turnstile 網域檢查、錯誤代碼的單元測試
// 執行：node --experimental-strip-types --test 'tests/security/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomerFillPatch, escapeIlike, normalizeEmail } from '../../src/lib/inquiry-customer.ts';
import {
  confirmationQuotaKey,
  firstForwardedIp,
  isAllowedTurnstileHostname,
  CONFIRMATION_EMAIL_DAILY_LIMIT
} from '../../src/lib/inquiry-protection.ts';
import { inquiryErrorMessageKey, INQUIRY_ERROR_CODES } from '../../src/lib/inquiry-errors.ts';

test('Email 轉小寫並去除前後空白', () => {
  assert.equal(normalizeEmail('  Buyer@Example.COM '), 'buyer@example.com');
});

test('ilike 跳脫 % _ \\，信箱不會被當成萬用字元', () => {
  assert.equal(escapeIlike('a_b%c\\d@x.com'), 'a\\_b\\%c\\\\d@x.com');
  assert.equal(escapeIlike('plain@x.com'), 'plain@x.com');
});

test('既有客戶有值的欄位不覆蓋，空欄位才補值', () => {
  const incoming = { name: 'New', company_name: 'New Co', country: 'VN', phone: '123' };
  assert.deepEqual(
    buildCustomerFillPatch({ name: 'Old', company_name: '', country: 'JP', phone: null }, incoming),
    { company_name: 'New Co', phone: '123' }
  );
  assert.equal(buildCustomerFillPatch({ name: 'Old', company_name: 'Old Co', country: 'JP', phone: '9' }, incoming), null);
});

test('這次沒填的欄位不會用空字串補', () => {
  assert.equal(
    buildCustomerFillPatch({ name: 'Old', company_name: '', country: 'JP', phone: '' }, { name: 'x', company_name: '', country: 'x', phone: '' }),
    null
  );
});

test('確認信額度：每天最多 3 封', () => {
  assert.equal(CONFIRMATION_EMAIL_DAILY_LIMIT, 3);
});

test('確認信額度的鍵：大小寫與空白視為同一信箱、不含信箱原文、隔天換新的鍵', () => {
  const day1 = new Date('2026-10-17T10:00:00Z');
  const a = confirmationQuotaKey('Buyer@Example.com', day1);
  assert.equal(a, confirmationQuotaKey(' buyer@example.com ', day1));
  assert.ok(!a.includes('buyer') && !a.includes('example'));
  assert.notEqual(a, confirmationQuotaKey('buyer@example.com', new Date('2026-10-18T00:00:01Z')));
  assert.notEqual(a, confirmationQuotaKey('other@example.com', day1));
});

test('Turnstile 網域：只接受本站與 localhost', () => {
  for (const ok of ['xh-motorparts.com', 'www.xh-motorparts.com', 'localhost', 'WWW.XH-MOTORPARTS.COM']) {
    assert.equal(isAllowedTurnstileHostname(ok), true, ok);
  }
  for (const bad of ['evil.com', 'xh-motorparts.com.evil.com', 'sub.xh-motorparts.com', '', undefined, null, 123]) {
    assert.equal(isAllowedTurnstileHostname(bad), false, String(bad));
  }
});

test('x-forwarded-for 取第一個位址', () => {
  assert.equal(firstForwardedIp('1.2.3.4, 10.0.0.1'), '1.2.3.4');
  assert.equal(firstForwardedIp(' 1.2.3.4 '), '1.2.3.4');
  assert.equal(firstForwardedIp(null), '');
});

test('錯誤代碼：認得的原樣使用，其他退回通用錯誤', () => {
  for (const code of INQUIRY_ERROR_CODES) assert.equal(inquiryErrorMessageKey(code), code);
  assert.equal(inquiryErrorMessageKey('whatever'), 'server_error');
  assert.equal(inquiryErrorMessageKey(undefined), 'server_error');
});

test('三語翻譯都有每個錯誤代碼的訊息，且附備用信箱', async () => {
  const { readFileSync } = await import('node:fs');
  for (const locale of ['en', 'zh-TW', 'zh-CN']) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')).inquiry;
    for (const code of [...INQUIRY_ERROR_CODES, 'network']) {
      assert.ok(messages.errors[code], `${locale} 缺少 ${code}`);
      assert.ok(messages.errors[code].includes('sales@xh-motorparts.com'), `${locale}.${code} 沒有備用信箱`);
    }
  }
});
