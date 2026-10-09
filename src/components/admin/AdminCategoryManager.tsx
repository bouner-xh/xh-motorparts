'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Locale } from '@/lib/catalog';
import { normalizeSlug, SLUG_MESSAGE } from '@/lib/slug';
import { resizeProductImage } from '@/lib/image-resize';
import { toProductImageUrl } from '@/lib/product-image-url';

interface AdminCategoryItem {
  id: string;
  slug: string;
  nameZhTw: string;
  nameZhCn: string;
  nameEn: string;
  descriptionZhTw: string;
  descriptionZhCn: string;
  descriptionEn: string;
  sortOrder: number;
  coverImage: string;
  subCategoryCount: number;
  productCount: number;
}

interface CategoryFormState {
  id?: string;
  slug: string;
  nameZhTw: string;
  nameZhCn: string;
  nameEn: string;
  descriptionZhTw: string;
  descriptionZhCn: string;
  descriptionEn: string;
  sortOrder: number;
  coverImage: string;
}

type StatusType = 'idle' | 'info' | 'success' | 'error';

const emptyFormState: CategoryFormState = {
  slug: '',
  nameZhTw: '',
  nameZhCn: '',
  nameEn: '',
  descriptionZhTw: '',
  descriptionZhCn: '',
  descriptionEn: '',
  sortOrder: 0,
  coverImage: ''
};

// locale 由後台頁面傳入，目前分類表單固定顯示繁中
export function AdminCategoryManager(_props: { locale: Locale }) {
  const [rows, setRows] = useState<AdminCategoryItem[]>([]);
  const [form, setForm] = useState<CategoryFormState>(emptyFormState);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // 已上傳但還沒存檔的封面；換圖、移除或取消時刪除，避免留在儲存空間
  const [unsavedUpload, setUnsavedUpload] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function setStatus(type: StatusType, message: string) {
    setStatusType(type);
    setStatusMessage(message);
  }

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/categories', { cache: 'no-store' });
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
    void loadCategories();
    // 產品或子分類變動時更新筆數
    const reload = () => void loadCategories();
    window.addEventListener('products-updated', reload);
    window.addEventListener('subcategories-updated', reload);
    return () => {
      window.removeEventListener('products-updated', reload);
      window.removeEventListener('subcategories-updated', reload);
    };
  }, [loadCategories]);

  // 刪除已上傳但沒有存檔的封面（伺服器只會刪除沒有分類或產品使用的檔案）
  function discardUnsavedUpload() {
    if (!unsavedUpload) return;
    void fetch(`/api/admin/upload-image?url=${encodeURIComponent(unsavedUpload)}`, { method: 'DELETE' });
    setUnsavedUpload('');
  }

  async function uploadCover(file: File) {
    setIsUploading(true);
    setStatus('info', `封面上傳中：${file.name}`);
    try {
      // 上傳前先縮小照片，買家瀏覽時不用下載數 MB 的原檔
      const prepared = await resizeProductImage(file);
      const body = new FormData();
      body.append('file', prepared);
      const response = await fetch('/api/admin/upload-image', { method: 'POST', body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.imagePath) throw new Error(result.error || `封面上傳失敗（HTTP ${response.status}）`);
      discardUnsavedUpload();
      setUnsavedUpload(result.imagePath);
      setForm((p) => ({ ...p, coverImage: result.imagePath }));
      setStatus('success', '封面上傳成功，按下「更新大分類」後才會儲存');
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '封面上傳失敗');
    } finally {
      setIsUploading(false);
    }
  }

  function removeCover() {
    discardUnsavedUpload();
    setForm((p) => ({ ...p, coverImage: '' }));
    setStatus('info', form.id ? '已移除封面，按下「更新大分類」後才會儲存' : '已移除封面');
  }

  function clearForm() {
    discardUnsavedUpload();
    setForm(emptyFormState);
  }

  async function submitCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normalizeSlug(form.slug)) {
      setStatus('error', SLUG_MESSAGE);
      return;
    }
    setIsSubmitting(true);
    setStatus('info', '儲存中...');

    const payload = {
      id: form.id,
      slug: normalizeSlug(form.slug),
      nameZhTw: form.nameZhTw.trim(),
      nameZhCn: form.nameZhCn.trim(),
      nameEn: form.nameEn.trim(),
      descriptionZhTw: form.descriptionZhTw.trim(),
      descriptionZhCn: form.descriptionZhCn.trim(),
      descriptionEn: form.descriptionEn.trim(),
      sortOrder: Number(form.sortOrder),
      coverImage: form.coverImage.trim()
    };

    const method = form.id ? 'PUT' : 'POST';

    try {
      const response = await fetch('/api/admin/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '儲存失敗');

      setStatus('success', '儲存成功');
      setUnsavedUpload('');
      setForm(emptyFormState);
      await loadCategories();
      // 通知其他元件分類已更新 (如子目錄管理和產品管理)
      window.dispatchEvent(new Event('categories-updated'));
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '儲存失敗');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(row: AdminCategoryItem) {
    discardUnsavedUpload();
    setForm({
      id: row.id,
      slug: row.slug,
      nameZhTw: row.nameZhTw,
      nameZhCn: row.nameZhCn,
      nameEn: row.nameEn,
      descriptionZhTw: row.descriptionZhTw,
      descriptionZhCn: row.descriptionZhCn,
      descriptionEn: row.descriptionEn,
      sortOrder: row.sortOrder,
      coverImage: row.coverImage
    });
  }

  // 刪除前依實際情況提示：有產品時不能刪除；子分類會一併刪除（A5）
  async function deleteCategory(row: AdminCategoryItem) {
    if (row.productCount > 0) {
      setStatus('error', `「${row.nameZhTw}」底下還有 ${row.productCount} 個產品，請先把產品移到其他分類或刪除後再刪除分類。`);
      return;
    }
    const subNote = row.subCategoryCount > 0 ? `底下的 ${row.subCategoryCount} 個子分類會一併刪除。` : '';
    if (!window.confirm(`確定刪除大分類「${row.nameZhTw}」？${subNote}`)) return;
    const id = row.id;
    setStatus('info', '刪除中...');
    try {
      const response = await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '刪除失敗');
      }
      setStatus('success', '刪除成功');
      await loadCategories();
      window.dispatchEvent(new Event('categories-updated'));
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '刪除失敗');
    }
  }

  return (
    <div>
      <h3>大分類管理</h3>
      <p className="muted">管理網站頂層大分類，如汽缸系列、鏈條系列等。</p>

      <form className="admin-form" onSubmit={submitCategory}>
        <label>
          Slug (網址代號)
          <input required value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} onBlur={() => setForm(p => ({ ...p, slug: normalizeSlug(p.slug) || p.slug }))} placeholder="例如: cylinder" />
          <small>只能用小寫英文、數字與連字號，輸入空白或大寫會自動轉換</small>
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
          描述 (zh-TW)
          <input value={form.descriptionZhTw} onChange={e => setForm(p => ({ ...p, descriptionZhTw: e.target.value }))} />
        </label>

        <label>
          描述 (zh-CN)
          <input value={form.descriptionZhCn} onChange={e => setForm(p => ({ ...p, descriptionZhCn: e.target.value }))} />
        </label>

        <label>
          描述 (en)
          <input value={form.descriptionEn} onChange={e => setForm(p => ({ ...p, descriptionEn: e.target.value }))} />
        </label>

        <label>
          排序 (Sort Order)
          <input type="number" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))} />
        </label>

        <label>
          封面圖片
          <small>選填；沒有上傳時，首頁與產品目錄的分類卡片會用該分類第一個產品的照片。照片會自動縮小後再上傳。</small>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void uploadCover(file);
            }}
          />
        </label>
        {form.coverImage ? (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toProductImageUrl(form.coverImage)} alt="目前的封面" width={96} height={64} style={{ objectFit: 'cover', borderRadius: '6px' }} />
            <button type="button" onClick={removeCover} disabled={isUploading || isSubmitting} style={{ background: '#334155' }}>移除封面</button>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
          <button type="submit" disabled={isSubmitting || isUploading}>{form.id ? '更新大分類' : '新增大分類'}</button>
          <button type="button" onClick={clearForm} style={{ background: '#334155' }}>清空表單</button>
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
            <th style={{ width: '40px' }}></th>
            <th>Slug</th>
            <th>名稱 (繁中)</th>
            <th>排序</th>
            <th>子分類</th>
            <th>產品</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (<tr><td colSpan={7}>載入中...</td></tr>) : rows.length === 0 ? (<tr><td colSpan={7}>無大分類</td></tr>) : rows.map((r, index) => (
            <tr
              key={r.id}
              style={{ borderBottom: '1px solid #1e293b' }}
              draggable
              onDragStart={(e) => {
                setDraggedIndex(index);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedIndex !== index && dragOverIndex !== index) {
                  setDragOverIndex(index);
                }
              }}
              onDragLeave={() => {
                if (dragOverIndex === index) {
                  setDragOverIndex(null);
                }
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOverIndex(null);
                if (draggedIndex === null || draggedIndex === index) return;

                const newRows = [...rows];
                const [draggedItem] = newRows.splice(draggedIndex, 1);
                newRows.splice(index, 0, draggedItem);

                const updatedRows = newRows.map((item, idx) => ({
                  ...item,
                  sortOrder: (idx + 1) * 10
                }));

                setRows(updatedRows);
                setDraggedIndex(null);

                setStatus('info', '正在儲存排列順序...');
                try {
                  const payload = updatedRows.map(item => ({
                    id: item.id,
                    sortOrder: item.sortOrder
                  }));
                  const response = await fetch('/api/admin/categories', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  const result = await response.json();
                  if (!response.ok) throw new Error(result.error || '儲存排列失敗');
                  setStatus('success', '排列順序儲存成功');
                  window.dispatchEvent(new Event('categories-updated'));
                } catch (error) {
                  setStatus('error', error instanceof Error ? error.message : '儲存排列失敗');
                  void loadCategories();
                }
              }}
              className={`draggable-row ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
            >
              <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0.5rem 0' }}>
                <span className="drag-handle">☰</span>
              </td>
              <td style={{ padding: '0.5rem 0' }}>{r.slug}</td>
              <td>{r.nameZhTw}</td>
              <td>{r.sortOrder}</td>
              <td>{r.subCategoryCount}</td>
              <td>{r.productCount}</td>
              <td>
                <button type="button" onClick={() => startEdit(r)} style={{ marginRight: '0.5rem', padding: '0.3rem 0.6rem' }}>編輯</button>
                <button type="button" onClick={() => void deleteCategory(r)} style={{ background: '#991b1b', padding: '0.3rem 0.6rem' }}>刪除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
