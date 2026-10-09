// 文字依語系挑選：語系不明或缺漏時退回英文（國際買家為主）
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localized } from '../../src/lib/localized-text.ts';

const text = { 'zh-TW': '繁', 'zh-CN': '简', en: 'English' };

test('依語系挑選', () => {
  assert.equal(localized('zh-TW', text), '繁');
  assert.equal(localized('zh-CN', text), '简');
  assert.equal(localized('en', text), 'English');
});

test('語系不明時退回英文，不退回繁中', () => {
  assert.equal(localized('fr', text), 'English');
  assert.equal(localized('', text), 'English');
});
