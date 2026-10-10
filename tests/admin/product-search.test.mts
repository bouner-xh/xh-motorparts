// P2：前台產品搜尋
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_QUERY_LENGTH, normalizeQuery, searchProducts } from '../../src/lib/product-search.ts';

const items = [
  { model: '1HV-11311-00', names: ['汽缸本體', 'Cylinder Body'], specifications: ['STD', '47mm'] },
  { model: '5TJ-11311-00', names: ['汽缸本體 B', 'Cylinder Body B'], specifications: ['STD', '52mm'] },
  { model: 'XL-1HV', names: ['鏈條', 'Chain'], specifications: ['428'] }
];
const models = (q: string) => searchProducts(items, q).map((p) => p.model);

test('料號比對忽略大小寫、空白與連字號', () => {
  assert.deepEqual(models('1hv11311'), ['1HV-11311-00']);
  assert.deepEqual(models('5TJ 11311 00'), ['5TJ-11311-00']);
});

test('型號開頭相同的排在包含的前面', () => {
  assert.deepEqual(models('1HV'), ['1HV-11311-00', 'XL-1HV']);
});

test('可以用任一語言的名稱、規格搜尋', () => {
  assert.deepEqual(models('汽缸本體'), ['1HV-11311-00', '5TJ-11311-00']);
  assert.deepEqual(models('chain'), ['XL-1HV']);
  assert.deepEqual(models('52MM'), ['5TJ-11311-00']);
});

test('多個關鍵字都要符合', () => {
  assert.deepEqual(models('汽缸 52mm'), ['5TJ-11311-00']);
  assert.deepEqual(models('汽缸 428'), []);
});

test('空白或過長的關鍵字', () => {
  assert.deepEqual(models('   '), []);
  assert.equal(normalizeQuery('x'.repeat(500)).length, MAX_QUERY_LENGTH);
  assert.equal(normalizeQuery(['a  b', 'c']), 'a b');
  assert.equal(normalizeQuery(undefined), '');
});

test('OEM／對照料號與適用車型也能搜（P8）', () => {
  const fitted = [
    { model: '2A6-17421-00', names: ['Counter Shaft'], specifications: [], oemNumbers: ['5T5-17421-00', 'X-77'], vehicleModels: ['Yamaha DT125', 'Honda CG125'] },
    { model: 'ABC-1', names: ['Gear'], specifications: [], oemNumbers: [], vehicleModels: ['Suzuki GN125'] }
  ];
  const find = (q: string) => searchProducts(fitted, q).map((p) => p.model);
  assert.deepEqual(find('5t5-17421-00'), ['2A6-17421-00']);
  assert.deepEqual(find('5t517421'), ['2A6-17421-00']);
  assert.deepEqual(find('x77'), ['2A6-17421-00']);
  assert.deepEqual(find('yamaha dt125'), ['2A6-17421-00']);
  assert.deepEqual(find('gn125'), ['ABC-1']);
  // 型號比對仍然優先於對照料號
  assert.deepEqual(find('2a6'), ['2A6-17421-00']);
});
