// P1：產品照片縮圖尺寸計算
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitWithin, replaceExtension } from '../../src/lib/image-resize.ts';

test('長邊縮到 1600px，保持比例', () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: 1600, height: 1200 });
  assert.deepEqual(fitWithin(3000, 4000), { width: 1200, height: 1600 });
  assert.deepEqual(fitWithin(4032, 1816), { width: 1600, height: 721 });
});

test('小於 1600px 的圖片不放大', () => {
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(1600, 900), { width: 1600, height: 900 });
});

test('更換副檔名', () => {
  assert.equal(replaceExtension('IMG_1234.JPG', 'webp'), 'IMG_1234.webp');
  assert.equal(replaceExtension('汽缸.photo.png', 'jpg'), '汽缸.photo.jpg');
  assert.equal(replaceExtension('noext', 'webp'), 'noext.webp');
  assert.equal(replaceExtension('.jpg', 'webp'), 'image.webp');
});
