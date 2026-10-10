import assert from 'node:assert/strict';
import test from 'node:test';
import {auditValue, diffFields, isAuditTableMissing, safeSnapshot, writeAuditLog} from '../../src/lib/audit-log.ts';

test('diffFields：只列出有變的欄位', () => {
  const changes = diffFields({型號: 'A-1', 庫存: '5', 上架: '是'}, {型號: 'A-1', 庫存: '8', 上架: '否'});
  assert.deepEqual(changes, {庫存: ['5', '8'], 上架: ['是', '否']});
  assert.deepEqual(diffFields({型號: 'A-1'}, {型號: 'A-1'}), {});
});

test('diffFields：新增列出有值的欄位，刪除列出原有的值', () => {
  assert.deepEqual(diffFields(null, {型號: 'A-1', 規格: ''}), {型號: [null, 'A-1']});
  assert.deepEqual(diffFields({型號: 'A-1', 規格: ''}, null), {型號: ['A-1', null]});
});

test('diffFields：欄位只出現在一邊時視為空字串', () => {
  assert.deepEqual(diffFields({型號: 'A-1'}, {型號: 'A-1', 規格: 'STD'}), {規格: ['', 'STD']});
});

test('auditValue：陣列、布林與空值', () => {
  assert.equal(auditValue(['a', '', 'b']), 'a, b');
  assert.equal(auditValue(true), '是');
  assert.equal(auditValue(null), '');
  assert.equal(auditValue(12), '12');
});

test('isAuditTableMissing：資料表不存在的錯誤代碼', () => {
  assert.equal(isAuditTableMissing({code: 'PGRST205'}), true);
  assert.equal(isAuditTableMissing({code: '42P01'}), true);
  assert.equal(isAuditTableMissing({code: '23505'}), false);
  assert.equal(isAuditTableMissing(null), false);
});

test('writeAuditLog：寫入失敗或丟出錯誤都不會往外丟（不擋操作）', async () => {
  const entry = {actorEmail: 'a@example.com', action: 'create' as const, entityType: 'product' as const, entityLabel: 'A-1'};
  const failing = {from: () => ({insert: async () => ({error: {code: 'PGRST205', message: 'missing'}})})};
  const throwing = {from: () => ({insert: async () => { throw new Error('network down'); }})};
  const ok = {from: () => ({insert: async () => ({error: null})})};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert.equal(await writeAuditLog(failing as any, entry), false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert.equal(await writeAuditLog(throwing as any, entry), false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert.equal(await writeAuditLog(ok as any, entry), true);
});

test('safeSnapshot：取快照失敗回傳 undefined', async () => {
  assert.equal(await safeSnapshot(async () => { throw new Error('x'); }), undefined);
  assert.equal(await safeSnapshot(async () => 5), 5);
});
