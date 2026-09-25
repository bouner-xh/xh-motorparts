// S8：圖片格式偵測測試
// 執行：node --experimental-strip-types --test 'tests/security/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectImageType } from '../../src/lib/image-signature.ts';

test('辨識專案內真實的 JPG 產品圖', () => {
  const bytes = readFileSync(new URL('../../images/products/cylinder/cylinder-001.jpg', import.meta.url));
  assert.equal(detectImageType(bytes), 'image/jpeg');
});

test('辨識 PNG 與 WEBP 檔頭', () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const webp = new Uint8Array([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBPVP8 ')]);
  assert.equal(detectImageType(png), 'image/png');
  assert.equal(detectImageType(webp), 'image/webp');
});

test('拒絕偽裝成圖片的非圖片檔', () => {
  for (const content of ['<html><script>alert(1)</script></html>', '%PDF-1.7', 'MZ\u0090\u0000', 'RIFF\u0000\u0000\u0000\u0000WAVEfmt ', '']) {
    assert.equal(detectImageType(Buffer.from(content)), null, `應拒絕：${JSON.stringify(content.slice(0, 10))}`);
  }
});
