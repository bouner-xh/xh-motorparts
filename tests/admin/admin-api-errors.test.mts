// A9：後台 API 錯誤訊息
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeDbError, isUuid } from '../../src/lib/admin-api-errors.ts';

test('資料庫錯誤代碼轉為中文說明，不包含原始訊息', () => {
  const dup = describeDbError({ code: '23505', message: 'duplicate key value violates unique constraint "categories_slug_key"' });
  assert.equal(dup.status, 409);
  assert.match(dup.message, /資料重複/);
  assert.doesNotMatch(dup.message, /constraint|categories/);
  assert.equal(describeDbError({ code: '23503' }).status, 409);
  assert.equal(describeDbError({ code: '22P02' }).status, 400);
  const unknown = describeDbError({ code: 'XX000', message: 'internal detail: relation "secret_table"' });
  assert.equal(unknown.status, 500);
  assert.doesNotMatch(unknown.message, /secret_table/);
});

test('UUID 格式檢查', () => {
  assert.equal(isUuid('10000000-0000-4000-8000-000000000001'), true);
  assert.equal(isUuid('not-a-uuid'), false);
  assert.equal(isUuid("1' or '1'='1"), false);
  assert.equal(isUuid(null), false);
});
