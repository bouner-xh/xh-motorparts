// 後台回覆信草稿暫存（健診 UX-12）：寫到 sessionStorage，不小心關掉視窗或重新整理後可還原
// 純函式、儲存空間由呼叫端傳入（瀏覽器的 sessionStorage 或測試用的假物件），方便單元測試

import type {ReplyLanguage} from './inquiry-reply';

export interface ReplyDraft {
  language: ReplyLanguage;
  subject: string;
  body: string;
  // 附件檔案無法暫存，只記錄「當時有附件」好提醒重新選擇
  hadAttachment: boolean;
  savedAt: number;
}

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const REPLY_DRAFT_PREFIX = 'xh-admin-reply-draft:';

export function replyDraftKey(inquiryId: string) {
  return `${REPLY_DRAFT_PREFIX}${inquiryId}`;
}

// 內容和範本一樣就不算草稿
export function isReplyEdited(current: {subject: string; body: string}, template: {subject: string; body: string}) {
  return current.subject !== template.subject || current.body !== template.body;
}

// 讀不到、格式不對或瀏覽器停用儲存空間時都回傳 null，不影響正常使用
export function loadReplyDraft(storage: DraftStorage | null | undefined, inquiryId: string): ReplyDraft | null {
  try {
    const raw = storage?.getItem(replyDraftKey(inquiryId));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<ReplyDraft>;
    if ((data.language !== 'en' && data.language !== 'zh-TW') || typeof data.subject !== 'string' || typeof data.body !== 'string') return null;
    return {language: data.language, subject: data.subject, body: data.body, hadAttachment: Boolean(data.hadAttachment), savedAt: Number(data.savedAt) || 0};
  } catch {
    return null;
  }
}

export function saveReplyDraft(storage: DraftStorage | null | undefined, inquiryId: string, draft: ReplyDraft) {
  try {
    storage?.setItem(replyDraftKey(inquiryId), JSON.stringify(draft));
  } catch {
    // 空間已滿或停用時略過，草稿只是額外保護
  }
}

export function clearReplyDraft(storage: DraftStorage | null | undefined, inquiryId: string) {
  try {
    storage?.removeItem(replyDraftKey(inquiryId));
  } catch {
    // 同上
  }
}

// 取得瀏覽器的 sessionStorage；存取本身可能丟錯（私密視窗、封鎖網站資料）
export function browserSessionStorage(): DraftStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
