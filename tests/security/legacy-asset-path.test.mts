// 舊版靜態圖片路徑檢查（SX-14）：擋路徑跳脫、擋非圖片副檔名
// 執行：node --experimental-strip-types --test 'tests/security/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveLegacyAssetPath } from '../../src/lib/legacy-asset-path.ts';

const root = path.resolve('/srv/app/images');

test('正常圖片路徑放行', () => {
  assert.equal(resolveLegacyAssetPath(root, ['products', 'a.jpg']), path.join(root, 'products', 'a.jpg'));
  assert.equal(resolveLegacyAssetPath(root, ['b.PNG']), path.join(root, 'b.PNG'));
  for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'gif']) {
    assert.ok(resolveLegacyAssetPath(root, [`x.${ext}`]), ext);
  }
});

test('.. 與 %2e%2e 解碼後的 .. 被擋', () => {
  assert.equal(resolveLegacyAssetPath(root, ['..', 'secret.jpg']), null);
  assert.equal(resolveLegacyAssetPath(root, ['products', '..', '..', 'secret.jpg']), null);
  assert.equal(resolveLegacyAssetPath(root, [decodeURIComponent('%2e%2e'), 'secret.jpg']), null);
  assert.equal(resolveLegacyAssetPath(root, ['.', 'a.jpg']), null);
});

test('編碼斜線（%2f、%5c）解碼後仍被擋', () => {
  assert.equal(resolveLegacyAssetPath(root, [decodeURIComponent('..%2f..%2fetc%2fpasswd.png')]), null);
  assert.equal(resolveLegacyAssetPath(root, [decodeURIComponent('..%5csecret.jpg')]), null);
  assert.equal(resolveLegacyAssetPath(root, ['a.jpg\0.txt']), null);
});

test('同名前綴的兄弟目錄（images-private）不能被 startsWith 騙過', () => {
  // 舊寫法 startsWith(root) 會放行 /srv/app/images-private/x.jpg
  assert.equal(resolveLegacyAssetPath(root, ['..', 'images-private', 'x.jpg']), null);
});

test('非圖片副檔名與空路徑被擋', () => {
  assert.equal(resolveLegacyAssetPath(root, ['products', 'a.txt']), null);
  assert.equal(resolveLegacyAssetPath(root, ['a.svg']), null);
  assert.equal(resolveLegacyAssetPath(root, ['noext']), null);
  assert.equal(resolveLegacyAssetPath(root, []), null);
  assert.equal(resolveLegacyAssetPath(root, ['']), null);
});
