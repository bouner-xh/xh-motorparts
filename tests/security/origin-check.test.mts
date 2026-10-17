// 後台寫入 API 的 Origin 檢查（SX-13）
// 執行：node --experimental-strip-types --test 'tests/security/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSameOriginRequest, isWriteMethod } from '../../src/lib/origin-check.ts';

test('沒有 Origin（curl、伺服器對伺服器）不擋', () => {
  assert.equal(isSameOriginRequest({ host: 'www.xh-motorparts.com' }), true);
  assert.equal(isSameOriginRequest({ origin: null, host: 'www.xh-motorparts.com' }), true);
  assert.equal(isSameOriginRequest({ origin: '', host: 'www.xh-motorparts.com' }), true);
});

test('Origin 與 Host 同源放行（含連接埠、大小寫）', () => {
  assert.equal(isSameOriginRequest({ origin: 'https://www.xh-motorparts.com', host: 'www.xh-motorparts.com' }), true);
  assert.equal(isSameOriginRequest({ origin: 'http://localhost:3112', host: 'localhost:3112' }), true);
  assert.equal(isSameOriginRequest({ origin: 'https://WWW.XH-Motorparts.com', host: 'www.xh-motorparts.com' }), true);
});

test('Origin 與 Host 不同源就拒絕', () => {
  assert.equal(isSameOriginRequest({ origin: 'https://evil.example', host: 'www.xh-motorparts.com' }), false);
  assert.equal(isSameOriginRequest({ origin: 'https://www.xh-motorparts.com.evil.example', host: 'www.xh-motorparts.com' }), false);
  assert.equal(isSameOriginRequest({ origin: 'http://localhost:3000', host: 'localhost:3112' }), false);
  assert.equal(isSameOriginRequest({ origin: 'https://evil.example', host: null }), false);
});

test('Origin 為 null 或格式錯誤一律拒絕', () => {
  assert.equal(isSameOriginRequest({ origin: 'null', host: 'www.xh-motorparts.com' }), false);
  assert.equal(isSameOriginRequest({ origin: 'not a url', host: 'www.xh-motorparts.com' }), false);
});

test('有 x-forwarded-host 時以它（或 Host）比對，取第一個值', () => {
  assert.equal(isSameOriginRequest({ origin: 'https://www.xh-motorparts.com', host: 'internal:3000', forwardedHost: 'www.xh-motorparts.com' }), true);
  assert.equal(isSameOriginRequest({ origin: 'https://www.xh-motorparts.com', host: 'internal:3000', forwardedHost: 'www.xh-motorparts.com, proxy.example' }), true);
  assert.equal(isSameOriginRequest({ origin: 'https://evil.example', host: 'internal:3000', forwardedHost: 'www.xh-motorparts.com' }), false);
});

test('只檢查寫入方法', () => {
  for (const m of ['POST', 'PUT', 'DELETE', 'PATCH', 'post']) assert.equal(isWriteMethod(m), true, m);
  for (const m of ['GET', 'HEAD', 'OPTIONS']) assert.equal(isWriteMethod(m), false, m);
});
