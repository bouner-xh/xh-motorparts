// S2：後台管理員白名單測試
// 執行：node --experimental-strip-types --test 'tests/security/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAdminEmail, parseAdminEmails } from '../../src/lib/admin-auth.ts';

test('解析名單：去除空白、轉小寫、忽略空項目', () => {
  assert.deepEqual(parseAdminEmails(' A@x.com, b@Y.com ,,'), ['a@x.com', 'b@y.com']);
  assert.deepEqual(parseAdminEmails(undefined), []);
  assert.deepEqual(parseAdminEmails(''), []);
});

test('名單內的 email 可以進後台（不分大小寫）', () => {
  const list = 'boss@example.com,second@example.com';
  assert.equal(isAdminEmail('boss@example.com', list), true);
  assert.equal(isAdminEmail('Second@Example.com', list), true);
  assert.equal(isAdminEmail(' boss@example.com ', list), true);
});

test('名單外的 email、空值一律拒絕', () => {
  const list = 'boss@example.com';
  assert.equal(isAdminEmail('someone@example.com', list), false);
  assert.equal(isAdminEmail('boss@example.com.evil.com', list), false);
  assert.equal(isAdminEmail('', list), false);
  assert.equal(isAdminEmail(null, list), false);
  assert.equal(isAdminEmail(undefined, list), false);
});

test('未設定名單時一律拒絕', () => {
  assert.equal(isAdminEmail('boss@example.com', undefined), false);
  assert.equal(isAdminEmail('boss@example.com', ''), false);
  assert.equal(isAdminEmail('boss@example.com', ' , '), false);
});
