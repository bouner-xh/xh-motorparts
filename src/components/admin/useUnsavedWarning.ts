'use client';

// 表單有尚未儲存的修改時：重新整理或關閉分頁會跳出瀏覽器的離開確認，並登記到 admin-unsaved 讓語言切換連結也能先確認
import {useEffect} from 'react';
import {setAdminUnsaved} from '@/lib/admin-unsaved';

export function useUnsavedWarning(key: string, dirty: boolean) {
  useEffect(() => {
    setAdminUnsaved(key, dirty);
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // 部分舊版瀏覽器需要設定 returnValue 才會跳出確認
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [key, dirty]);

  // 元件卸載（例如登出）時一定要移除登記
  useEffect(() => () => setAdminUnsaved(key, false), [key]);
}
