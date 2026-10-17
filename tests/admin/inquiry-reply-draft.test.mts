// 健診 UX-12：回覆信草稿暫存（sessionStorage）
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearReplyDraft, isReplyEdited, loadReplyDraft, replyDraftKey, saveReplyDraft } from '../../src/lib/inquiry-reply-draft.ts';

function fakeStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), data };
}
const draft = { language: 'zh-TW' as const, subject: 's', body: 'b', hadAttachment: true, savedAt: 123 };

test('草稿存取：鍵含詢價單編號，清除後讀不到', () => {
  const storage = fakeStorage();
  saveReplyDraft(storage, 'abc', draft);
  assert.ok(storage.data.has(replyDraftKey('abc')) && replyDraftKey('abc').includes('abc'));
  assert.deepEqual(loadReplyDraft(storage, 'abc'), draft);
  assert.equal(loadReplyDraft(storage, 'other'), null);
  clearReplyDraft(storage, 'abc');
  assert.equal(loadReplyDraft(storage, 'abc'), null);
});

test('壞資料、儲存空間丟錯或不存在都不影響使用', () => {
  const storage = fakeStorage();
  storage.setItem(replyDraftKey('x'), '{not json');
  assert.equal(loadReplyDraft(storage, 'x'), null);
  storage.setItem(replyDraftKey('x'), JSON.stringify({ language: 'fr', subject: 's', body: 'b' }));
  assert.equal(loadReplyDraft(storage, 'x'), null);
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); }, removeItem: () => { throw new Error('blocked'); } };
  assert.equal(loadReplyDraft(broken, 'x'), null);
  assert.doesNotThrow(() => saveReplyDraft(broken, 'x', draft));
  assert.doesNotThrow(() => clearReplyDraft(broken, 'x'));
  assert.equal(loadReplyDraft(null, 'x'), null);
});

test('內容和範本一樣不算編輯過', () => {
  assert.equal(isReplyEdited({ subject: 'a', body: 'b' }, { subject: 'a', body: 'b' }), false);
  assert.equal(isReplyEdited({ subject: 'a', body: 'b!' }, { subject: 'a', body: 'b' }), true);
});
