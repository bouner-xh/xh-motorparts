'use client';

// 後台共用的結果訊息（健診 UX-15）：貼在視窗頂端的 toast
// - 成功／處理中訊息放在 role="status"（aria-live="polite"），數秒後自動消失
// - 錯誤放在 role="alert"，不會自動消失，要手動關閉
// - 各管理區用 useAdminStatus() 取得 setStatus(type, message)，用法和原本各自的 setStatus 相同
//   （'idle' 或空訊息代表清除），不用再各自維護狀態與樣式
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';

export type AdminStatusType = 'idle' | 'info' | 'success' | 'error';

interface ToastState {
  id: number;
  type: Exclude<AdminStatusType, 'idle'>;
  message: string;
}

type SetStatus = (type: AdminStatusType, message: string) => void;

const SUCCESS_MS = 5000;
const INFO_MS = 8000;

const AdminToastContext = createContext<SetStatus | null>(null);

export function AdminToastProvider({children}: {children: ReactNode}) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  const setStatus = useCallback<SetStatus>((type, message) => {
    window.clearTimeout(timer.current);
    if (type === 'idle' || !message) {
      setToast(null);
      return;
    }
    const id = ++counter.current;
    setToast({id, type, message});
    if (type !== 'error') {
      timer.current = window.setTimeout(() => setToast((current) => (current?.id === id ? null : current)), type === 'success' ? SUCCESS_MS : INFO_MS);
    }
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const node = (current: ToastState) => (
    <div key={current.id} className={`admin-toast admin-toast--${current.type}`} data-testid="admin-toast">
      <span className="admin-toast__message">{current.message}</span>
      <button type="button" className="admin-toast__close" aria-label="關閉訊息" onClick={dismiss}>
        ×
      </button>
    </div>
  );

  return (
    <AdminToastContext.Provider value={setStatus}>
      {children}
      {/* 兩個區域一直存在（內容為空），螢幕閱讀器才會在訊息出現時朗讀 */}
      <div className="admin-toast-region">
        <div role="status" aria-live="polite">
          {toast && toast.type !== 'error' ? node(toast) : null}
        </div>
        <div role="alert">{toast && toast.type === 'error' ? node(toast) : null}</div>
      </div>
    </AdminToastContext.Provider>
  );
}

const noop: SetStatus = () => {};

export function useAdminStatus(): SetStatus {
  const setStatus = useContext(AdminToastContext);
  return useMemo(() => setStatus ?? noop, [setStatus]);
}
