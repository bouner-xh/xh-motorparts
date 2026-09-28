// A6 ②：客戶列表整理
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomerCsv, filterCustomers, sortCustomers, summarizeCustomers } from '../../src/lib/customer-summary.ts';

const customers = [
  { id: 'c1', email: 'marco@moto.example', name: 'Marco', company_name: 'Moto Italia', country: 'Italy' },
  { id: 'c2', email: 'Kenji@Tokyo.example', name: 'Kenji', company_name: 'Tokyo Parts', country: 'Japan' },
  { id: 'c3', email: 'new@x.example', name: 'New', company_name: 'No Inquiry Yet', country: 'Peru' },
];
const inquiries = [
  { id: 'i1', customer_id: 'c1', status: 'replied' as const, created_at: '2026-08-01T00:00:00Z', items: [{ modelNumber: 'CYL-125' }] },
  { id: 'i2', customer_id: 'c1', status: 'pending' as const, created_at: '2026-09-20T00:00:00Z', items: [{ modelNumber: 'CYL-125' }, { modelNumber: 'CHN-428' }] },
  // 早期沒有 customer_id 的詢價單，以 Email（不分大小寫）對應
  { id: 'i3', customer_id: null, customer_email: 'kenji@tokyo.example', status: 'processing' as const, created_at: '2026-09-25T00:00:00Z', items: [] },
];

test('詢價次數、待處理、首次與最近詢價、常詢價的型號', () => {
  const [marco, kenji, fresh] = summarizeCustomers(customers, inquiries);
  assert.equal(marco.inquiryCount, 2);
  assert.equal(marco.pendingCount, 1);
  assert.equal(marco.firstInquiryAt, '2026-08-01T00:00:00Z');
  assert.equal(marco.lastInquiryAt, '2026-09-20T00:00:00Z');
  assert.deepEqual(marco.topModels, ['CYL-125', 'CHN-428']);
  assert.equal(kenji.inquiryCount, 1, '沒有 customer_id 時以 Email 對應');
  assert.equal(fresh.inquiryCount, 0);
});

test('排序與篩選', () => {
  const rows = summarizeCustomers(customers, inquiries);
  assert.deepEqual(sortCustomers(rows, 'recent').map((r) => r.id), ['c2', 'c1', 'c3']);
  assert.deepEqual(sortCustomers(rows, 'count').map((r) => r.id), ['c1', 'c2', 'c3']);
  assert.deepEqual(sortCustomers(rows, 'name').map((r) => r.id), ['c1', 'c3', 'c2']);
  assert.deepEqual(filterCustomers(rows, 'chn-428', '').map((r) => r.id), ['c1'], '可用詢價過的型號搜尋');
  assert.deepEqual(filterCustomers(rows, '', 'Japan').map((r) => r.id), ['c2']);
});

test('客戶 CSV', () => {
  const csv = buildCustomerCsv(summarizeCustomers(customers, inquiries));
  assert.ok(csv.startsWith('﻿公司,聯絡人,Email'));
  assert.match(csv, /Moto Italia,Marco,marco@moto\.example,Italy,,2,1,2026-08-01 08:00,2026-09-20 08:00,CYL-125、CHN-428/);
});
