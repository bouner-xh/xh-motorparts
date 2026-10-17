// OP-17：資料庫查詢失敗時，正式環境不退回靜態示範資料（避免 ISR 把假資料快取 5 分鐘）
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldFallbackToStatic, isRealQueryFailure, rethrowUnlessFallback } from '../../src/lib/catalog-fallback.ts';

const DB = { NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' };

test('沒設定資料庫：不論環境都用靜態示範資料', () => {
  assert.equal(shouldFallbackToStatic({ NODE_ENV: 'production' }), true);
  assert.equal(shouldFallbackToStatic({ NODE_ENV: 'development' }), true);
  assert.equal(shouldFallbackToStatic({ NODE_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' }), true);
});

test('已設定資料庫：開發與測試環境仍退回示範資料，正式環境不退回', () => {
  assert.equal(shouldFallbackToStatic({ ...DB, NODE_ENV: 'development' }), true);
  assert.equal(shouldFallbackToStatic({ ...DB, NODE_ENV: 'test' }), true);
  assert.equal(shouldFallbackToStatic({ ...DB, NODE_ENV: 'production' }), false);
});

test('正式環境 + 已設定資料庫 + 查詢失敗：丟出錯誤，不回傳示範資料', () => {
  const quiet = console.error;
  console.error = () => {};
  try {
    assert.throws(() => rethrowUnlessFallback(new Error('connection refused 10.0.0.1'), 'getCategorySummaries', { ...DB, NODE_ENV: 'production' }), /catalog query failed: getCategorySummaries/);
    // 錯誤訊息不帶資料庫細節
    assert.throws(() => rethrowUnlessFallback({ message: 'secret detail' }, 'x', { ...DB, NODE_ENV: 'production' }), (error: Error) => !/secret|10\.0/.test(error.message));
  } finally {
    console.error = quiet;
  }
});

test('開發環境或沒設資料庫：查詢失敗不丟錯，由呼叫端退回示範資料', () => {
  assert.doesNotThrow(() => rethrowUnlessFallback(new Error('boom'), 'x', { ...DB, NODE_ENV: 'development' }));
  assert.doesNotThrow(() => rethrowUnlessFallback(new Error('boom'), 'x', { NODE_ENV: 'production' }));
});

test('查無資料（PGRST116）不算故障，其他錯誤才算', () => {
  assert.equal(isRealQueryFailure(null), false);
  assert.equal(isRealQueryFailure(undefined), false);
  assert.equal(isRealQueryFailure({ code: 'PGRST116' }), false);
  assert.equal(isRealQueryFailure({ code: 'PGRST205' }), true);
  assert.equal(isRealQueryFailure({ code: '42P01' }), true);
  assert.equal(isRealQueryFailure({}), true);
});
