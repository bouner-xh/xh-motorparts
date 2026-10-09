// 分類網址代號正規化：小寫、空白與符號轉連字號
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSlug } from '../../src/lib/slug.ts';

test('大寫轉小寫、空白轉連字號', () => {
  assert.equal(normalizeSlug('Clutch Housing'), 'clutch-housing');
  assert.equal(normalizeSlug('DT125 COUNTER SHAFT'), 'dt125-counter-shaft');
  assert.equal(normalizeSlug('SARTER MOTOR'), 'sarter-motor');
});

test('連續空白與符號合併、頭尾不留連字號', () => {
  assert.equal(normalizeSlug('  Main   shaft  '), 'main-shaft');
  assert.equal(normalizeSlug('a_b/c--d'), 'a-b-c-d');
  assert.equal(normalizeSlug('-x-'), 'x');
});

test('已經正確的代號不變；全形字元先轉半形', () => {
  assert.equal(normalizeSlug('sprocket'), 'sprocket');
  assert.equal(normalizeSlug('cylinder-a'), 'cylinder-a');
  assert.equal(normalizeSlug('ＡＢＣ １２'), 'abc-12');
});

test('只有中文或符號時回傳空字串（由呼叫端提示）', () => {
  assert.equal(normalizeSlug('離合器'), '');
  assert.equal(normalizeSlug(' -- '), '');
});
