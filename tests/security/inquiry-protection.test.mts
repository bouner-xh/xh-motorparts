// S4：詢價防護設定檢查測試
// 執行：node --experimental-strip-types --test 'tests/security/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMissingProtectionConfig, isProductionDeployment } from '../../src/lib/inquiry-protection.ts';

const full = {
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'site',
  TURNSTILE_SECRET_KEY: 'secret',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'token'
};

test('Vercel 以 VERCEL_ENV 判斷，只有 production 算正式環境', () => {
  assert.equal(isProductionDeployment({ VERCEL_ENV: 'production', NODE_ENV: 'production' }), true);
  assert.equal(isProductionDeployment({ VERCEL_ENV: 'preview', NODE_ENV: 'production' }), false);
  assert.equal(isProductionDeployment({ VERCEL_ENV: 'development', NODE_ENV: 'development' }), false);
});

test('非 Vercel 主機以 NODE_ENV 判斷', () => {
  assert.equal(isProductionDeployment({ NODE_ENV: 'production' }), true);
  assert.equal(isProductionDeployment({ NODE_ENV: 'development' }), false);
});

test('設定齊全時沒有缺漏', () => {
  assert.deepEqual(getMissingProtectionConfig(full), []);
});

test('列出缺少或空白的設定', () => {
  assert.deepEqual(getMissingProtectionConfig({ ...full, TURNSTILE_SECRET_KEY: '' }), ['TURNSTILE_SECRET_KEY']);
  assert.deepEqual(getMissingProtectionConfig({}), [
    'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
    'TURNSTILE_SECRET_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ]);
});
