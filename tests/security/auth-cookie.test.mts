// 後台登入 cookie 加固（SX-3）
// 執行：node --experimental-strip-types --test 'tests/security/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_COOKIE_MAX_AGE_SECONDS, hardenAuthCookieOptions } from '../../src/lib/auth-cookie.ts';

const supabaseDefault = { path: '/', sameSite: 'lax' as const, httpOnly: false, maxAge: 400 * 24 * 60 * 60 };

test('效期固定 7 天', () => {
  assert.equal(AUTH_COOKIE_MAX_AGE_SECONDS, 604800);
});

test('登入寫入：HttpOnly、SameSite=Lax、效期縮短為 7 天，保留 path', () => {
  const opts = hardenAuthCookieOptions(supabaseDefault, false);
  assert.equal(opts.httpOnly, true);
  assert.equal(opts.sameSite, 'lax');
  assert.equal(opts.maxAge, 604800);
  assert.equal(opts.path, '/');
});

test('正式環境才加 Secure（本機 http 開發不能加，否則登入不了）', () => {
  assert.equal(hardenAuthCookieOptions(supabaseDefault, true).secure, true);
  assert.equal(hardenAuthCookieOptions(supabaseDefault, false).secure, false);
});

test('登出清除 cookie（maxAge 0）不能被改成 7 天', () => {
  const opts = hardenAuthCookieOptions({ ...supabaseDefault, maxAge: 0 }, true);
  assert.equal(opts.maxAge, 0);
  assert.equal(opts.httpOnly, true);
});

test('沒有傳入選項也能用', () => {
  const opts = hardenAuthCookieOptions(undefined, true);
  assert.equal(opts.httpOnly, true);
  assert.equal(opts.maxAge, 604800);
});
