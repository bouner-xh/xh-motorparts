// 後台「尚未儲存的修改」登記（健診 UX-25、UX-18）
// 各表單在有未儲存修改時登記一個名稱；語言切換連結等不在表單內的元件靠這裡得知是否要先確認。
// 存在 window 上，不同打包區塊的程式碼也讀得到同一份。

declare global {
  interface Window {
    __xhAdminUnsaved?: Set<string>;
  }
}

function registry(): Set<string> | null {
  if (typeof window === 'undefined') return null;
  if (!window.__xhAdminUnsaved) window.__xhAdminUnsaved = new Set();
  return window.__xhAdminUnsaved;
}

export function setAdminUnsaved(key: string, dirty: boolean) {
  const set = registry();
  if (!set) return;
  if (dirty) set.add(key);
  else set.delete(key);
}

export function hasAdminUnsaved() {
  return (registry()?.size ?? 0) > 0;
}

export const ADMIN_UNSAVED_LANGUAGE_MESSAGE = '後台有尚未儲存的內容，切換語言後會消失。確定要切換嗎？';
