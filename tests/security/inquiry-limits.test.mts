// R3：詢價品項名稱以資料庫為準
// 執行：node --experimental-strip-types --test 'tests/security/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productIdsToLookup, resolveInquiryItems } from '../../src/lib/inquiry-limits.ts';

const ID = '30000000-0000-4000-8000-000000000001';
const product = { id: ID, model_number: '1HV-11311-00', name_i18n: { 'zh-TW': '汽缸本體', 'zh-CN': '汽缸本体', en: 'Cylinder Body' } };

test('只查詢 UUID 格式的產品編號，重複的只查一次', () => {
  assert.deepEqual(productIdsToLookup([{ productId: ID }, { productId: ID }, { productId: 'e2e-cylinder-1' }, { productId: "1' or 1=1" }]), [ID]);
});

test('資料庫有的品項：名稱與型號改用資料庫的值', () => {
  const [item] = resolveInquiryItems([{ productId: ID, modelNumber: 'FAKE', nameZhTw: 'Visit http://spam.example', nameEn: 'spam', quantity: 3 }], [product]);
  assert.equal(item.modelNumber, '1HV-11311-00');
  assert.equal(item.nameZhTw, '汽缸本體');
  assert.equal(item.nameZhCn, '汽缸本体');
  assert.equal(item.nameEn, 'Cylinder Body');
  assert.equal(item.quantity, 3);
});

test('資料庫查不到的品項：清空名稱，只保留型號與數量', () => {
  const [item] = resolveInquiryItems([{ productId: 'unknown', modelNumber: 'X-1', nameZhTw: 'Buy now http://spam.example', quantity: 5 }], [product]);
  assert.deepEqual([item.modelNumber, item.nameZhTw, item.nameZhCn, item.nameEn, item.quantity], ['X-1', '', '', '', 5]);
});
