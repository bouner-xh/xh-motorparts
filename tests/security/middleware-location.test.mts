// 防止 middleware 放錯位置：網站程式在 src/ 底下時，Next.js 只會載入 src/middleware.ts，
// 放在專案根目錄的 middleware.ts 完全不會執行（曾經有一個檔案放錯，從未生效）
// 執行：node --experimental-strip-types --test 'tests/security/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('專案根目錄沒有不會被載入的 middleware', () => {
  assert.ok(existsSync('src/app'), '網站程式在 src/app');
  for (const name of ['middleware.ts', 'middleware.js', 'middleware.mjs']) {
    assert.equal(existsSync(name), false, `根目錄的 ${name} 不會被 Next.js 載入，請放到 src/ 底下`);
  }
});
