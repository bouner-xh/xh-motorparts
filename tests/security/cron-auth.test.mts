// 排程 API 驗證（Upstash 每日保持運作）
// 執行：node --experimental-strip-types --test 'tests/security/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAuthorizedCron } from '../../src/lib/cron-auth.ts';

test('帶正確的 Bearer 密碼才放行', () => {
  assert.equal(isAuthorizedCron('Bearer s3cret-value', 's3cret-value'), true);
});

test('密碼錯誤、少了 Bearer、沒帶標頭都拒絕', () => {
  assert.equal(isAuthorizedCron('Bearer wrong', 's3cret-value'), false);
  assert.equal(isAuthorizedCron('s3cret-value', 's3cret-value'), false);
  assert.equal(isAuthorizedCron(null, 's3cret-value'), false);
  assert.equal(isAuthorizedCron('', 's3cret-value'), false);
});

test('沒有設定 CRON_SECRET 時一律拒絕', () => {
  assert.equal(isAuthorizedCron('Bearer ', ''), false);
  assert.equal(isAuthorizedCron('Bearer undefined', undefined), false);
});
