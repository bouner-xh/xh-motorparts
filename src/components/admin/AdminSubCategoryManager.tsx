'use client';

import { useCallback, useEffect, useState } from 'react';
import { categoryKeys, type Locale } from '@/lib/catalog';

interface AdminSubCategoryItem {
  id: string;
  category: string;
  slug: string;
  nameZhTw: string;
  nameZhCn: string;
  nameEn: string;
  sortOrder: number;
}

interface SubCategoryFormState {
  id?: string;
  category: string;
  slug: string;
  nameZhTw: string;
  nameZhCn: string;
  nameEn: string;
  sortOrder: number;
}

type StatusType = 'idle' | 'info' | 'success' | 'error';

const emptyFormState: SubCategoryFormState = {
  category: categoryKeys[0],
  slug: '',
  nameZhTw: '',
  nameZhCn: '',
  nameEn: '',
  sortOrder: 0
};

export function AdminSubCategoryManager({ locale }: { locale: Locale }) {
  const [rows, setRows] = useState<AdminSubCategoryItem[]>([]);
  const [form, setForm] = useState<SubCategoryFormState>(emptyFormState);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setStatus(type: StatusType, message: string) {
    setStatusType(type);
    setStatusMessage(message);
  }

  const loadSubCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/sub-categories', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '載入失敗');
      setRows(data.items || []);
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '載入失敗');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubCategories();
  }, [loadSubCategories]);

  async function submitSubCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus('info', '儲存中...');

    const payload = {
      id: form.id,
      category: form.category,
      slug: form.slug.trim(),
      nameZhTw: form.nameZhTw.trim(),
      nameZhCn: form.nameZhCn.trim(),
      nameEn: form.nameEn.trim(),
      sortOrder: Number(form.sortOrder)
    };

    const method = form.id ? 'PUT' : 'POST';

    try {
      const response = await fetch('/api/admin/sub-categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '儲存失敗');

      setStatus('success', '儲存成功');
      setForm(emptyFormState);
      await loadSubCategories();
      window.dispatchEvent(new Event('subcategories-updated'));
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '儲存失敗');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(row: AdminSubCategoryItem) {
    setForm({
      id: row.id,
      category: row.category,
      slug: row.slug,
      nameZhTw: row.nameZhTw,
      nameZhCn: row.nameZhCn,
      nameEn: row.nameEn,
      sortOrder: row.sortOrder
    });
  }

  async function deleteSubCategory(id: string) {
    if (!window.confirm('確認刪除？這可能會影響到底下的產品！')) return;
    setStatus('info', '刪除中...');
    try {
      const response = await fetch(`/api/admin/sub-categories?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '刪除失敗');
      }
      setStatus('success', '刪除成功');
      await loadSubCategories();
      window.dispatchEvent(new Event('subcategories-updated'));
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '刪除失敗');
    }
  }

  return (
    <div>
      <h3>子目錄 CRUD（{locale}）</h3>
      <p className="muted">管理大分類下的子分類標籤。</p>

      <form className="admin-form" onSubmit={submitSubCategory}>
        <label>
          大分類
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
            {categoryKeys.map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </label>

        <label>
          Slug (網址代號)
          <input required value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="例如: cylinder-a" />
        </label>

        <label>
          名稱 (zh-TW)
          <input required value={form.nameZhTw} onChange={e => setForm(p => ({ ...p, nameZhTw: e.target.value }))} />
        </label>

        <label>
          名稱 (zh-CN)
          <input required value={form.nameZhCn} onChange={e => setForm(p => ({ ...p, nameZhCn: e.target.value }))} />
        </label>

        <label>
          名稱 (en)
          <input required value={form.nameEn} onChange={e => setForm(p => ({ ...p, nameEn: e.target.value }))} />
        </label>

        <label>
          排序 (Sort Order)
          <input type="number" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))} />
        </label>

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
          <button type="submit" disabled={isSubmitting}>{form.id ? '更新子目錄' : '新增子目錄'}</button>
          <button type="button" onClick={() => setForm(emptyFormState)} style={{ background: '#334155' }}>清空表單</button>
        </div>
      </form>

      {statusMessage && (
        <p style={{ marginTop: '1rem', color: statusType === 'error' ? '#fca5a5' : '#86efac' }}>
          {statusMessage}
        </p>
      )}

      <table style={{ width: '100%', marginTop: '1.5rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155' }}>
            <th>大分類</th>
            <th>Slug</th>
            <th>名稱</th>
            <th>排序</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (<tr><td colSpan={5}>載入中...</td></tr>) : rows.length === 0 ? (<tr><td colSpan={5}>無子目錄</td></tr>) : rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '0.5rem 0' }}>{r.category}</td>
              <td>{r.slug}</td>
              <td>{r.nameZhTw}</td>
              <td>{r.sortOrder}</td>
              <td>
                <button type="button" onClick={() => startEdit(r)} style={{ marginRight: '0.5rem', padding: '0.3rem 0.6rem' }}>編輯</button>
                <button type="button" onClick={() => void deleteSubCategory(r.id)} style={{ background: '#991b1b', padding: '0.3rem 0.6rem' }}>刪除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
