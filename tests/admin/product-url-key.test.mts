// 產品網址代號（型號可重複）：網址片段整理、候選順序、OEM 料號衝突判斷
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseUrlKey, findOemConflictIn, oemConflictMessage, slugifyUrlPart, urlKeyCandidates } from '../../src/lib/product-url-key.ts';

test('slugifyUrlPart：句號、斜線、空白換成 -，連續的 - 合併，頭尾去掉', () => {
  assert.equal(slugifyUrlPart('23411-GW0-010.23421-GW0-000'), '23411-GW0-010-23421-GW0-000');
  assert.equal(slugifyUrlPart(' 23411/GW0  010 '), '23411-GW0-010');
  assert.equal(slugifyUrlPart('..A--B..'), 'A-B');
  assert.equal(slugifyUrlPart('***'), '');
});

test('urlKeyCandidates：型號 → 型號-OEM → 型號-2…', () => {
  const list = urlKeyCandidates('DIO50', ['23411-GW0-010.23421-GW0-000', 'X-1'], 3);
  assert.deepEqual(list, ['DIO50', 'DIO50-23411-GW0-010-23421-GW0-000', 'DIO50-2', 'DIO50-3', 'DIO50-4']);
  assert.deepEqual(urlKeyCandidates('DIO50', [], 2), ['DIO50', 'DIO50-2', 'DIO50-3']);
  assert.deepEqual(urlKeyCandidates('DIO50', ['...'], 1), ['DIO50', 'DIO50-2']);
});

test('chooseUrlKey：略過已被占用的（不分大小寫）', () => {
  const candidates = ['DIO50', 'DIO50-A', 'DIO50-2'];
  assert.equal(chooseUrlKey(candidates, []), 'DIO50');
  assert.equal(chooseUrlKey(candidates, ['dio50']), 'DIO50-A');
  assert.equal(chooseUrlKey(candidates, ['DIO50', 'dio50-a']), 'DIO50-2');
  assert.equal(chooseUrlKey(candidates, ['DIO50', 'DIO50-A', 'DIO50-2']), null);
});

test('findOemConflictIn：不分大小寫比對，略過自己', () => {
  const rows = [
    { id: '1', model_number: 'DIO50', oem_numbers: ['23411-GW0-010.23421-GW0-000'] },
    { id: '2', model_number: 'DIO50', oem_numbers: null }
  ];
  assert.deepEqual(findOemConflictIn(rows, ['23411-gw0-010.23421-gw0-000']), { oem: '23411-gw0-010.23421-gw0-000', model: 'DIO50' });
  assert.equal(findOemConflictIn(rows, ['23411-GW0-010.23421-GW0-000'], '1'), null);
  assert.equal(findOemConflictIn(rows, ['23411-GW0-010']), null);
  assert.equal(findOemConflictIn(rows, []), null);
  assert.match(oemConflictMessage({ oem: 'A-1', model: 'DIO50' }), /A-1.*DIO50/);
});
