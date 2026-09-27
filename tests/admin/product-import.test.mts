// A1、A4：批量匯入解析測試
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTemplateCsv,
  chunk,
  parseBoolean,
  parseCsv,
  parseProductRows,
  rowsToObjects,
} from '../../src/lib/product-import.ts';

test('CSV：引號內的逗號、換行與跳脫引號', () => {
  const rows = parseCsv('﻿a,b,c\r\n"STD, 47MM","第一行\n第二行","說 ""好"""\r\n\r\n');
  assert.deepEqual(rows, [
    ['a', 'b', 'c'],
    ['STD, 47MM', '第一行\n第二行', '說 "好"'],
  ]);
});

test('上架欄位：FALSE／0／否 都視為不上架，空白視為上架', () => {
  for (const v of ['FALSE', 'false', '0', '否', 'no', '下架']) assert.equal(parseBoolean(v), false, v);
  for (const v of ['TRUE', '1', '是', 'yes', '上架']) assert.equal(parseBoolean(v), true, v);
  assert.equal(parseBoolean(''), true);
  assert.equal(parseBoolean('也許'), null);
});

test('解析產品列：多語名稱、規格、Excel 的數字與布林值', () => {
  const objects = rowsToObjects([
    ['model_number', 'name_zh_tw', 'name_en', 'category_slug', 'category_name_zh_tw', 'subcategory_slug', 'specifications', 'stock_quantity', 'is_active'],
    ['A-1', '汽缸', 'Cylinder', 'Cylinder', '汽缸系列', 'std', 'STD, 47MM', 12, false],
  ]);
  const { rows, errors } = parseProductRows(objects);
  assert.deepEqual(errors, []);
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.deepEqual(row.nameI18n, { 'zh-TW': '汽缸', en: 'Cylinder' });
  assert.deepEqual(row.categoryNameI18n, { 'zh-TW': '汽缸系列' });
  assert.equal(row.categorySlug, 'cylinder');
  assert.deepEqual(row.specifications, ['STD', '47MM']);
  assert.equal(row.stockQuantity, 12);
  assert.equal(row.isActive, false);
});

test('規格與庫存沒填時為 null（既有產品保留原本內容）', () => {
  const { rows } = parseProductRows([{ model_number: 'C-1', category_slug: 'c', subcategory_slug: 's' }]);
  assert.equal(rows[0].specifications, null);
  assert.equal(rows[0].stockQuantity, null);
  assert.equal(rows[0].isActive, true);
});

test('中文欄位名稱也能辨識', () => {
  const { rows, errors } = parseProductRows([
    { 型號: 'B-1', 產品名稱_繁中: '鏈條', 大分類代號: 'chain', 子分類代號: 'std', 庫存: '3', 上架: '否' },
  ]);
  assert.deepEqual(errors, []);
  assert.equal(rows[0].nameI18n['zh-TW'], '鏈條');
  assert.equal(rows[0].isActive, false);
});

test('錯誤檢查：型號重複、缺少分類、庫存格式、上架欄無法判讀', () => {
  const base = { category_slug: 'c', subcategory_slug: 's' };
  const { rows, errors } = parseProductRows([
    { ...base, model_number: 'X-1' },
    { ...base, model_number: 'X-1' },
    { model_number: 'X-2' },
    { ...base, model_number: 'X-3', stock_quantity: '-1' },
    { ...base, model_number: 'X-4', is_active: '也許' },
    { ...base, model_number: '' , name_zh_tw: '沒有型號' },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(errors.length, 5);
  assert.match(errors[0], /第 3 列：型號 X-1 與第 2 列重複/);
  assert.match(errors[1], /第 4 列（X-2）：缺少大分類代號.*缺少子分類代號/);
  assert.match(errors[2], /庫存「-1」/);
  assert.match(errors[3], /上架欄「也許」/);
  assert.match(errors[4], /第 7 列：缺少型號/);
});

test('範例檔可以被自己的解析器讀回來', () => {
  const { rows, errors } = parseProductRows(rowsToObjects(parseCsv(buildTemplateCsv())));
  assert.deepEqual(errors, []);
  assert.equal(rows[0].modelNumber, 'CYL-001');
  assert.deepEqual(rows[0].specifications, ['STD', '47MM']);
});

test('分批', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});
