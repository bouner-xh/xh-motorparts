'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Locale } from '@/lib/catalog';
import { VEHICLE_NAME_MAX } from '@/lib/vehicle-models';

interface VehicleModelItem {
  id: string;
  name: string;
  productCount: number;
}

type StatusType = 'idle' | 'info' | 'success' | 'error';

// 車型清單管理（P8）：先在這裡建立車型，產品表單再勾選「適用車型」
// locale 由後台頁面傳入，目前固定顯示繁中
export function AdminVehicleModelManager(_props: { locale: Locale }) {
  const [items, setItems] = useState<VehicleModelItem[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  function setStatus(type: StatusType, message: string) {
    setStatusType(type);
    setStatusMessage(message);
  }

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/vehicle-models', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '載入失敗');
      setItems(result.items || []);
      setEnabled(result.enabled !== false);
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '載入失敗');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(method: 'POST' | 'PUT', body: { id?: string; name: string }, doneMessage: string) {
    setStatus('info', '儲存中...');
    try {
      const response = await fetch('/api/admin/vehicle-models', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '儲存失敗');
      setStatus('success', doneMessage);
      await load();
      // 通知產品表單重新取得車型清單
      window.dispatchEvent(new Event('vehicle-models-updated'));
      return true;
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '儲存失敗');
      return false;
    }
  }

  async function addModel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) {
      setStatus('error', '請輸入車型名稱');
      return;
    }
    if (await send('POST', { name: newName }, '車型已新增')) setNewName('');
  }

  async function saveRename(item: VehicleModelItem) {
    if (await send('PUT', { id: item.id, name: editName }, '車型名稱已更新')) setEditingId('');
  }

  async function removeModel(item: VehicleModelItem) {
    const note = item.productCount > 0 ? `已有 ${item.productCount} 個產品勾選了這個車型，刪除後這些產品不再顯示此車型（產品本身不受影響）。` : '';
    if (!window.confirm(`確定刪除車型「${item.name}」？${note}`)) return;
    setStatus('info', '刪除中...');
    try {
      const response = await fetch(`/api/admin/vehicle-models?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '刪除失敗');
      }
      setStatus('success', '車型已刪除');
      await load();
      window.dispatchEvent(new Event('vehicle-models-updated'));
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '刪除失敗');
    }
  }

  return (
    <div data-testid="admin-vehicle-models">
      <h3>車型清單</h3>
      <p className="muted">先在這裡建立車型（例如 Yamaha DT125），再到「產品」勾選每個產品的適用車型。前台產品頁會顯示，買家也能用車型搜尋。</p>

      {!enabled ? (
        <p className="muted" role="note">
          車型清單尚未啟用：請先在 Supabase 的 SQL Editor 執行 <code>supabase/migrations/20261010_vehicle_models_oem.sql</code>，執行後重新整理本頁。
        </p>
      ) : null}

      <form className="admin-form" onSubmit={addModel}>
        <label>
          新增車型
          <input value={newName} maxLength={VEHICLE_NAME_MAX} onChange={(e) => setNewName(e.target.value)} placeholder="例如: Yamaha DT125" disabled={!enabled} />
        </label>
        <div>
          <button type="submit" disabled={!enabled}>新增車型</button>
        </div>
      </form>

      {statusMessage ? (
        <p style={{ marginTop: '1rem', color: statusType === 'error' ? '#fca5a5' : '#86efac' }}>{statusMessage}</p>
      ) : null}

      <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155' }}>
            <th>車型名稱</th>
            <th>使用的產品數</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={3}>載入中...</td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan={3}>{enabled ? '還沒有車型，請先新增。' : '尚未啟用。'}</td></tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td>
                  {editingId === item.id ? (
                    <input aria-label={`車型名稱：${item.name}`} value={editName} maxLength={VEHICLE_NAME_MAX} onChange={(e) => setEditName(e.target.value)} />
                  ) : (
                    item.name
                  )}
                </td>
                <td>{item.productCount}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {editingId === item.id ? (
                      <>
                        <button type="button" onClick={() => void saveRename(item)}>儲存</button>
                        <button type="button" onClick={() => setEditingId('')} style={{ background: '#334155' }}>取消</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => { setEditingId(item.id); setEditName(item.name); }}>改名</button>
                        <button type="button" onClick={() => void removeModel(item)} style={{ background: '#991b1b' }}>刪除</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
