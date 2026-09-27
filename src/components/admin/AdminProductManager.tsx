'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import type { Locale } from '@/lib/catalog';

interface AdminCategoryItem {
  id: string;
  slug: string;
  nameZhTw: string;
}

interface AdminProductItem {
  id: string;
  category: string;
  modelNumber: string;
  nameZhTw: string;
  nameZhCn: string;
  nameEn: string;
  specifications: string[];
  stockQuantity: number;
  isActive: boolean;
  subCategoryId: string;
  imagePath: string;
}

interface ProductFormState {
  id?: string;
  category: string;
  modelNumber: string;
  nameZhTw: string;
  nameZhCn: string;
  nameEn: string;
  specifications: string;
  stockQuantity: number;
  isActive: boolean;
  subCategoryId: string;
  imagePath: string;
}

interface AdminSubCategoryItem {
  id: string;
  category: string;
  slug: string;
  nameZhTw: string;
}

type StatusType = 'idle' | 'info' | 'success' | 'error';

// 舊版偵錯面板存在瀏覽器的紀錄（A2 移除偵錯工具時一併清除）
const LEGACY_DEBUG_STORAGE_KEY = 'admin-debug-logs';

const emptyFormState: ProductFormState = {
  category: '',
  modelNumber: '',
  nameZhTw: '',
  nameZhCn: '',
  nameEn: '',
  specifications: '',
  stockQuantity: 0,
  // 預設不上架，確認內容後再勾選，避免誤上架（A2）
  isActive: false,
  subCategoryId: '',
  imagePath: ''
};

export function AdminProductManager({locale}: {locale: Locale}) {
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [rows, setRows] = useState<AdminProductItem[]>([]);
  const [subCategories, setSubCategories] = useState<AdminSubCategoryItem[]>([]);
  const [form, setForm] = useState<ProductFormState>(emptyFormState);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('idle');
  const [loadError, setLoadError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  function setStatus(type: StatusType, message: string) {
    setStatusType(type);
    setStatusMessage(message);
  }

  async function parseResponseJson<T>(response: Response): Promise<T | null> {
    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_DEBUG_STORAGE_KEY);
    } catch {
      // 瀏覽器停用 localStorage 時略過
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const [productsRes, subCatRes, catRes] = await Promise.all([
        fetch('/api/admin/products', {cache: 'no-store'}),
        fetch('/api/admin/sub-categories', {cache: 'no-store'}),
        fetch('/api/admin/categories', {cache: 'no-store'})
      ]);
      
      const data = (await parseResponseJson<{items?: AdminProductItem[]; error?: string}>(productsRes)) || {};
      const subCatData = (await parseResponseJson<{items?: AdminSubCategoryItem[] }>(subCatRes)) || {};
      const catData = (await parseResponseJson<{items?: AdminCategoryItem[] }>(catRes)) || {};

      if (catData.items) {
        setCategories(catData.items);
        if (catData.items.length > 0) {
          const firstSlug = catData.items[0].slug;
          setForm((p) => (p.category ? p : {...p, category: firstSlug}));
        }
      }

      if (subCatData.items) {
        setSubCategories(subCatData.items);
      }

      if (!productsRes.ok) {
        throw new Error(data.error || `載入產品失敗（HTTP ${productsRes.status}）`);
      }

      setRows(data.items || []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '載入產品失敗');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();

    const handleSubCategoryUpdate = () => {
      void loadProducts();
    };
    const handleCategoryUpdate = () => {
      void loadProducts();
    };
    window.addEventListener('subcategories-updated', handleSubCategoryUpdate);
    window.addEventListener('categories-updated', handleCategoryUpdate);
    return () => {
      window.removeEventListener('subcategories-updated', handleSubCategoryUpdate);
      window.removeEventListener('categories-updated', handleCategoryUpdate);
    };
  }, [loadProducts]);

  const submitLabel = useMemo(() => (form.id ? '更新產品' : '新增產品'), [form.id]);

  async function submitProduct() {
    setIsSubmitting(true);
    setStatus('info', form.id ? '更新產品中...' : '新增產品中...');

    const payload = {
      id: form.id,
      category: form.category,
      modelNumber: form.modelNumber.trim(),
      nameZhTw: form.nameZhTw.trim(),
      nameZhCn: form.nameZhCn.trim(),
      nameEn: form.nameEn.trim(),
      specifications: form.specifications
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      stockQuantity: Number(form.stockQuantity),
      isActive: form.isActive,
      subCategoryId: form.subCategoryId,
      imagePath: form.imagePath.trim()
    };

    const method = form.id ? 'PUT' : 'POST';

    const validationErrors: string[] = [];
    if (!payload.modelNumber) {
      validationErrors.push('型號不可為空');
    }
    if (!payload.subCategoryId) {
      validationErrors.push('子分類不可為空（請先建立子分類）');
    }
    if (!payload.nameZhTw) {
      validationErrors.push('名稱（zh-TW）不可為空');
    }
    if (!payload.nameZhCn) {
      validationErrors.push('名稱（zh-CN）不可為空');
    }
    if (!payload.nameEn) {
      validationErrors.push('名稱（en）不可為空');
    }

    if (validationErrors.length) {
      const message = `表單驗證失敗：${validationErrors.join(' / ')}`;
      setStatus('error', message);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/products', {
        method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });

      const result = (await parseResponseJson<{error?: string}>(response)) || {};
      if (!response.ok) {
        throw new Error(result.error || `儲存失敗（HTTP ${response.status}）`);
      }

      setStatus('success', form.id ? '產品更新成功' : '產品新增成功');
      // 保留剛剛選的分類與子分類，方便連續新增同分類的產品（A3）
      setForm({...emptyFormState, category: form.category, subCategoryId: form.subCategoryId});
      await loadProducts();
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '儲存失敗');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitProduct();
  }

  function startEdit(row: AdminProductItem) {
    setForm({
      id: row.id,
      category: row.category,
      modelNumber: row.modelNumber,
      nameZhTw: row.nameZhTw,
      nameZhCn: row.nameZhCn,
      nameEn: row.nameEn,
      specifications: row.specifications.join(', '),
      stockQuantity: row.stockQuantity,
      isActive: row.isActive,
      subCategoryId: row.subCategoryId,
      imagePath: row.imagePath
    });
  }

  async function deleteProduct(id: string) {
    const confirmed = window.confirm('確認要刪除這筆產品嗎？');
    if (!confirmed) {
      return;
    }

    setStatus('info', '刪除產品中...');

    try {
      const response = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      const result = (await parseResponseJson<{error?: string}>(response)) || {};
      if (!response.ok) {
        throw new Error(result.error || `刪除失敗（HTTP ${response.status}）`);
      }

      setStatus('success', '產品已刪除');
      await loadProducts();
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '刪除失敗');
    }
  }

  async function uploadImage(file: File) {
    setIsUploading(true);
    setStatus('info', `圖片上傳中：${file.name}`);

    const body = new FormData();
    body.append('file', file);

    try {
      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body
      });

      const result =
        (await parseResponseJson<{imagePath?: string; error?: string}>(response)) || {};
      if (!response.ok || !result.imagePath) {
        throw new Error(result.error || `圖片上傳失敗（HTTP ${response.status}）`);
      }

      setForm((prev) => ({...prev, imagePath: result.imagePath || ''}));
      setSelectedFile(null);
      setStatus('success', '圖片上傳成功，已填入圖片路徑');
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '圖片上傳失敗');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <h3>產品 CRUD 與圖片管理（{locale}）</h3>
      <p className="muted">可新增、編輯、刪除產品，並上傳產品主圖（會綁定為第一張圖片）。</p>

      <form className="admin-form" data-testid="admin-product-form" onSubmit={handleSubmit} noValidate>
        <label>
          分類
          <select
            value={form.category}
            // 切換大分類時清空子分類，避免產品掛到其他大分類的子分類（A3）
            onChange={(event) => setForm((prev) => ({...prev, category: event.target.value, subCategoryId: ''}))}
          >
            <option value="" disabled>
              請選擇分類
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.nameZhTw} ({c.slug})
              </option>
            ))}
          </select>
        </label>

        <label>
          子分類
          <select
            required
            value={form.subCategoryId}
            onChange={(event) => setForm((prev) => ({...prev, subCategoryId: event.target.value}))}
          >
            <option value="">請選擇子分類</option>
            {subCategories
              .filter((sc) => sc.category === form.category)
              .map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.nameZhTw} ({sc.slug})
                </option>
              ))}
          </select>
        </label>

        <label>
          型號
          <input
            required
            value={form.modelNumber}
            onChange={(event) => setForm((prev) => ({...prev, modelNumber: event.target.value}))}
          />
        </label>

        <label>
          名稱（zh-TW）
          <input
            required
            value={form.nameZhTw}
            onChange={(event) => setForm((prev) => ({...prev, nameZhTw: event.target.value}))}
          />
        </label>

        <label>
          名稱（zh-CN）
          <input
            required
            value={form.nameZhCn}
            onChange={(event) => setForm((prev) => ({...prev, nameZhCn: event.target.value}))}
          />
        </label>

        <label>
          名稱（en）
          <input
            required
            value={form.nameEn}
            onChange={(event) => setForm((prev) => ({...prev, nameEn: event.target.value}))}
          />
        </label>

        <label>
          規格（逗號分隔）
          <input
            value={form.specifications}
            onChange={(event) => setForm((prev) => ({...prev, specifications: event.target.value}))}
            placeholder="STD, 47MM, 50MM"
          />
        </label>

        <label>
          庫存
          <input
            type="number"
            value={form.stockQuantity}
            onChange={(event) =>
              setForm((prev) => ({...prev, stockQuantity: Number(event.target.value || 0)}))
            }
          />
        </label>

        <label>
          圖片路徑 / URL
          <input
            value={form.imagePath}
            onChange={(event) => setForm((prev) => ({...prev, imagePath: event.target.value}))}
            placeholder="https://... 或 images/products/..."
          />
        </label>

        <label style={{flexDirection: 'row', alignItems: 'center', gap: '0.5rem'}}>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((prev) => ({...prev, isActive: event.target.checked}))}
            style={{width: 'auto'}}
          />
          上架
        </label>

        <label>
          上傳主圖
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              setSelectedFile(file);
              if (file) {
                void uploadImage(file);
              }
            }}          />
        </label>

        <div style={{display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center'}}>
          <span className="muted">{isUploading ? '圖片上傳中，請稍候...' : selectedFile ? `已選檔案：${selectedFile.name}` : '尚未選擇檔案'}</span>
        </div>

        <div style={{display: 'flex', gap: '0.6rem', flexWrap: 'wrap'}}>
          <button type="submit" disabled={isUploading || isSubmitting}>
            {isSubmitting ? '送出中...' : submitLabel}
          </button>
          <button type="button" style={{background: '#1d4ed8'}} onClick={() => void loadProducts()}>
            重新載入列表
          </button>
        </div>
      </form>

      {statusMessage ? (
        <p
          style={{
            marginTop: '0.75rem',
            padding: '0.7rem 0.9rem',
            borderRadius: '10px',
            border:
              statusType === 'error'
                ? '1px solid rgba(248, 113, 113, 0.4)'
                : statusType === 'success'
                  ? '1px solid rgba(52, 211, 153, 0.45)'
                  : '1px solid rgba(148, 163, 184, 0.25)',
            background:
              statusType === 'error'
                ? 'rgba(127, 29, 29, 0.22)'
                : statusType === 'success'
                  ? 'rgba(6, 78, 59, 0.24)'
                  : 'rgba(15, 23, 42, 0.48)'
          }}
        >
          {statusMessage}
        </p>
      ) : null}
      {loadError ? <p className="muted">產品資料載入失敗：{loadError}</p> : null}
      {isUploading ? <p className="muted">圖片上傳中...</p> : null}

      <div style={{overflowX: 'auto', marginTop: '1rem'}}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th align="left">型號</th>
              <th align="left">大分類</th>
              <th align="left">名稱</th>
              <th align="left">庫存</th>
              <th align="left">上架</th>
              <th align="left">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6}>載入中...</td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={6}>載入失敗，請檢查 Supabase 設定與資料表。</td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.modelNumber}</td>
                  <td>{row.category}</td>
                  <td>{row.nameZhTw}</td>
                  <td>{row.stockQuantity}</td>
                  <td>{row.isActive ? '是' : '否'}</td>
                  <td>
                    <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                      <button type="button" onClick={() => startEdit(row)}>
                        編輯
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteProduct(row.id)}
                        style={{background: '#991b1b'}}
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>目前沒有產品資料。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
