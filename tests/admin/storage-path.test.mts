// A5：從公開網址取出 Storage 檔案路徑
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storageObjectPath } from '../../src/lib/storage-path.ts';

const base = 'https://abc.supabase.co/storage/v1/object/public/product-images/';

test('取出本儲存空間的檔案路徑（含中文檔名與查詢參數）', () => {
  assert.equal(storageObjectPath(`${base}products/2026-09-27/a.jpg`, 'product-images'), 'products/2026-09-27/a.jpg');
  assert.equal(storageObjectPath(`${base}products/%E6%B1%BD%E7%BC%B8.jpg?v=1`, 'product-images'), 'products/汽缸.jpg');
});

test('其他來源的圖片不處理', () => {
  assert.equal(storageObjectPath('images/products/cylinder/cylinder-003.jpg', 'product-images'), null);
  assert.equal(storageObjectPath('https://abc.supabase.co/storage/v1/object/public/other-bucket/a.jpg', 'product-images'), null);
  assert.equal(storageObjectPath(`${base}`, 'product-images'), null);
  assert.equal(storageObjectPath(`${base}../secret`, 'product-images'), null);
});
