// 健診 UX-14／UX-29：批量匯入預覽的比對（新增或更新、新建分類、名稱全空）與失敗清單 CSV
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeImportRows, buildFailedCsv, describeNewCategories } from '../../src/lib/product-import-preview.ts';

const existing = {
  modelNumbers: ['1HV-11311-00', 'DUP-1', 'dup-1'],
  categorySlugs: ['cylinder', 'chain'],
  subCategories: [{ category: 'cylinder', slug: 'std' }, { category: 'chain', slug: 'chain-std' }]
};
const row = (modelNumber: string, categorySlug: string, subCategorySlug: string, nameI18n: Record<string, string> = { en: 'X' }) => ({ modelNumber, categorySlug, subCategorySlug, nameI18n });

test('型號不分大小寫：新增、更新既有、多筆同型號無法更新', () => {
  const result = analyzeImportRows([row('1hv-11311-00', 'cylinder', 'std'), row('NEW-1', 'cylinder', 'std'), row('DUP-1', 'cylinder', 'std')], existing);
  assert.deepEqual(result.rows.map((r) => r.action), ['update', 'create', 'ambiguous']);
});

test('代號不存在就是將新建；大分類新建時子分類也一定新建，同一個代號只算一次', () => {
  const result = analyzeImportRows([row('A', 'cylinder', 'std'), row('B', 'cylinder', 'big-bore'), row('C', 'cyilnder', 'std'), row('D', 'cyilnder', 'std')], existing);
  assert.deepEqual(result.rows.map((r) => [r.newCategory, r.newSubCategory]), [[false, false], [false, true], [true, true], [true, true]]);
  assert.deepEqual(result.newCategories, ['cyilnder']);
  assert.deepEqual(result.newSubCategories, ['cylinder/big-bore', 'cyilnder/std']);
  assert.equal(describeNewCategories(result), '將新建 1 個大分類、2 個子分類：大分類 cyilnder、子分類 cylinder/big-bore、子分類 cyilnder/std');
});

test('沒有要新建的分類時摘要為空', () => {
  assert.equal(describeNewCategories(analyzeImportRows([row('A', 'cylinder', 'std')], existing)), '');
});

test('新產品三語名稱全空要擋下；既有產品名稱空白沒關係', () => {
  const result = analyzeImportRows([row('NEW-2', 'cylinder', 'std', {}), row('1HV-11311-00', 'cylinder', 'std', {})], existing);
  assert.deepEqual(result.rows.map((r) => r.nameMissing), [true, false]);
});

test('失敗清單 CSV：含 BOM、型號與原因，逗號與引號會跳脫', () => {
  const csv = buildFailedCsv([{ modelNumber: 'A-1', message: '建立產品失敗：資料重複' }, { modelNumber: 'B-2', message: '含,逗號與"引號"' }, { modelNumber: 'C-3' }]);
  assert.ok(csv.startsWith('﻿model_number,失敗原因\r\n'));
  assert.ok(csv.includes('A-1,建立產品失敗：資料重複\r\n'));
  assert.ok(csv.includes('B-2,"含,逗號與""引號"""\r\n'));
  assert.ok(csv.includes('C-3,匯入失敗\r\n'));
});
