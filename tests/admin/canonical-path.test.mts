// 網址大小寫不同時找出正確寫法
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchCanonicalSegments, type CanonicalCatalog } from '../../src/lib/canonical-path.ts';

const catalog: CanonicalCatalog = {
  categories: ['transmission', 'clutch-housing'],
  subCategories: [
    { categorySlug: 'transmission', slug: 'counter-shaft' },
    { categorySlug: 'clutch-housing', slug: 'yamaha' }
  ],
  products: [
    { category: 'transmission', subCategory: 'counter-shaft', model: '2A6-17421-00' },
    { category: 'clutch-housing', subCategory: 'yamaha', model: 'DT125-2A6-16150-00' }
  ]
};

test('大分類大小寫不同：回傳正確寫法', () => {
  assert.deepEqual(matchCanonicalSegments(catalog, ['Transmission']), ['transmission']);
  assert.deepEqual(matchCanonicalSegments(catalog, ['CLUTCH-HOUSING']), ['clutch-housing']);
});

test('子分類與型號大小寫不同：全部修正', () => {
  assert.deepEqual(matchCanonicalSegments(catalog, ['TRANSMISSION', 'Counter-Shaft']), ['transmission', 'counter-shaft']);
  assert.deepEqual(matchCanonicalSegments(catalog, ['transmission', 'counter-shaft', '2a6-17421-00']), ['transmission', 'counter-shaft', '2A6-17421-00']);
  assert.deepEqual(matchCanonicalSegments(catalog, ['Clutch-Housing', 'YAMAHA', 'dt125-2a6-16150-00']), ['clutch-housing', 'yamaha', 'DT125-2A6-16150-00']);
});

test('本來就正確或找不到：回傳 null（不轉址）', () => {
  assert.equal(matchCanonicalSegments(catalog, ['transmission']), null);
  assert.equal(matchCanonicalSegments(catalog, ['transmission', 'counter-shaft', '2A6-17421-00']), null);
  assert.equal(matchCanonicalSegments(catalog, ['no-such']), null);
  assert.equal(matchCanonicalSegments(catalog, ['transmission', 'no-such']), null);
  assert.equal(matchCanonicalSegments(catalog, ['transmission', 'counter-shaft', 'NOPE']), null);
});

test('子分類必須屬於該大分類，不會跨分類配對', () => {
  assert.equal(matchCanonicalSegments(catalog, ['Transmission', 'YAMAHA']), null);
  assert.equal(matchCanonicalSegments(catalog, ['transmission', 'counter-shaft', 'DT125-2A6-16150-00']), null);
});
