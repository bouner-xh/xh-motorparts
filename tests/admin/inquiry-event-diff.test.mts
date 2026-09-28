// A6 ③：處理紀錄的產生規則
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeleteEvent, buildInquiryChangeEvents, inquiryLabel } from '../../src/lib/inquiry-event-diff.ts';

const before = { id: 'i1', status: 'pending', reply_notes: '', company_name: 'Moto Italia', customer_email: 'marco@moto.example' };

test('狀態與備忘各自產生一筆紀錄，含操作人與前後值', () => {
  const events = buildInquiryChangeEvents(before, { status: 'processing', reply_notes: '已寄報價單 Q-1' }, 'admin@example.com');
  assert.equal(events.length, 2);
  assert.deepEqual(
    events.map((e) => [e.action, e.from_value, e.to_value, e.actor_email, e.inquiry_label]),
    [
      ['status', 'pending', 'processing', 'admin@example.com', 'Moto Italia / marco@moto.example'],
      ['notes', '', '已寄報價單 Q-1', 'admin@example.com', 'Moto Italia / marco@moto.example'],
    ]
  );
});

test('沒有改變時不產生紀錄', () => {
  assert.deepEqual(buildInquiryChangeEvents(before, { status: 'pending', reply_notes: '' }, 'a@x'), []);
});

test('刪除紀錄保留公司與 Email 快照', () => {
  const e = buildDeleteEvent(before, 'admin@example.com');
  assert.equal(e.action, 'delete');
  assert.equal(e.inquiry_label, 'Moto Italia / marco@moto.example');
  assert.equal(inquiryLabel({ customer_name: 'Eve', customer_email: '' }), 'Eve');
});
