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

interface DebugLogEntry {
  at: string;
  action: 'load' | 'create' | 'update' | 'delete' | 'upload';
  ok: boolean;
  status: number;
  message: string;
  payload?: Record<string, unknown>;
  response?: Record<string, unknown>;
}

const DEBUG_STORAGE_KEY = 'admin-debug-logs';
const DEBUG_MAX_ENTRIES = 120;
const ADMIN_MANAGER_BUILD_MARKER = 'admin-manager-20260607-1';

const emptyFormState: ProductFormState = {
  category: '',
  modelNumber: '',
  nameZhTw: '',
  nameZhCn: '',
  nameEn: '',
  specifications: '',
  stockQuantity: 0,
  isActive: true,
  subCategoryId: '',
  imagePath: ''
};

function buildPrefilledFormState(defaultCategory: string = ''): ProductFormState {
  const stamp = Date.now().toString().slice(-6);
  return {
    category: defaultCategory,
    modelNumber: `TEST-${stamp}`,
    nameZhTw: `測試產品-${stamp}`,
    nameZhCn: `测试产品-${stamp}`,
    nameEn: `Test Product ${stamp}`,
    specifications: 'STD, 47MM',
    stockQuantity: 10,
    isActive: true,
    subCategoryId: '',
    imagePath: ''
  };
}

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
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const [isClientReady, setIsClientReady] = useState(false);

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

  const pushDebugLog = useCallback((entry: DebugLogEntry) => {
    setDebugLogs((prev) => [entry, ...prev].slice(0, DEBUG_MAX_ENTRIES));
  }, []);

  function toDebugResponse(response: Response, body: Record<string, unknown> | null) {
    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
      body: body || {}
    };
  }

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    // Avoid hydration mismatch by pre-filling test data only on client after mount.
    setForm(buildPrefilledFormState());
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DEBUG_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as DebugLogEntry[];
      if (Array.isArray(parsed)) {
        setDebugLogs(parsed.slice(0, DEBUG_MAX_ENTRIES));
      }
    } catch {
      // ignore broken localStorage data
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(debugLogs));
    } catch {
      // ignore localStorage write failure
    }
  }, [debugLogs]);

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
          setForm(p => p.category ? p : buildPrefilledFormState(firstSlug));
        }
      }

      if (subCatData.items) {
        setSubCategories(subCatData.items);
      }

      if (!productsRes.ok) {
        pushDebugLog({
          at: new Date().toISOString(),
          action: 'load',
          ok: false,
          status: productsRes.status,
          message: data.error || '載入產品失敗',
          response: toDebugResponse(productsRes, data)
        });
        throw new Error(data.error || `載入產品失敗（HTTP ${productsRes.status}）`);
      }

      setRows(data.items || []);
      pushDebugLog({
        at: new Date().toISOString(),
        action: 'load',
        ok: true,
        status: productsRes.status,
        message: `載入成功，筆數 ${(data.items || []).length}`,
        response: toDebugResponse(productsRes, data)
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '載入產品失敗');
      pushDebugLog({
        at: new Date().toISOString(),
        action: 'load',
        ok: false,
        status: 0,
        message: error instanceof Error ? error.message : '載入產品失敗（前端例外）'
      });
    } finally {
      setIsLoading(false);
    }
  }, [pushDebugLog]);

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

  async function submitProduct(source: 'form' | 'button') {
    pushDebugLog({
      at: new Date().toISOString(),
      action: form.id ? 'update' : 'create',
      ok: true,
      status: 0,
      message: `Submit flow entered from ${source}`
    });

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
    const action = form.id ? 'update' : 'create';

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
      pushDebugLog({
        at: new Date().toISOString(),
        action,
        ok: false,
        status: 400,
        message,
        payload
      });
      setIsSubmitting(false);
      return;
    }

    pushDebugLog({
      at: new Date().toISOString(),
      action,
      ok: true,
      status: 0,
      message: `${method} /api/admin/products request started`,
      payload
    });

    try {
      const response = await fetch('/api/admin/products', {
        method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });

      const result = (await parseResponseJson<{error?: string}>(response)) || {};
      if (!response.ok) {
        pushDebugLog({
          at: new Date().toISOString(),
          action,
          ok: false,
          status: response.status,
          message: result.error || '儲存失敗',
          payload,
          response: toDebugResponse(response, result)
        });
        throw new Error(result.error || `儲存失敗（HTTP ${response.status}）`);
      }

      pushDebugLog({
        at: new Date().toISOString(),
        action,
        ok: true,
        status: response.status,
        message: form.id ? '更新成功' : '新增成功',
        payload,
        response: toDebugResponse(response, result)
      });

      setStatus('success', form.id ? '產品更新成功' : '產品新增成功');
      setForm(form.id ? emptyFormState : emptyFormState);
      await loadProducts();
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '儲存失敗');
      pushDebugLog({
        at: new Date().toISOString(),
        action,
        ok: false,
        status: 0,
        message: error instanceof Error ? error.message : '儲存失敗（前端例外）',
        payload
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitProduct('form');
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
        pushDebugLog({
          at: new Date().toISOString(),
          action: 'delete',
          ok: false,
          status: response.status,
          message: result.error || '刪除失敗',
          payload: {id},
          response: toDebugResponse(response, result)
        });
        throw new Error(result.error || `刪除失敗（HTTP ${response.status}）`);
      }

      pushDebugLog({
        at: new Date().toISOString(),
        action: 'delete',
        ok: true,
        status: response.status,
        message: '刪除成功',
        payload: {id},
        response: toDebugResponse(response, result)
      });
      setStatus('success', '產品已刪除');
      await loadProducts();
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '刪除失敗');
      pushDebugLog({
        at: new Date().toISOString(),
        action: 'delete',
        ok: false,
        status: 0,
        message: error instanceof Error ? error.message : '刪除失敗（前端例外）',
        payload: {id}
      });
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
        pushDebugLog({
          at: new Date().toISOString(),
          action: 'upload',
          ok: false,
          status: response.status,
          message: result.error || '圖片上傳失敗',
          payload: {fileName: file.name, fileType: file.type, fileSize: file.size},
          response: toDebugResponse(response, result)
        });
        throw new Error(result.error || `圖片上傳失敗（HTTP ${response.status}）`);
      }

      pushDebugLog({
        at: new Date().toISOString(),
        action: 'upload',
        ok: true,
        status: response.status,
        message: '圖片上傳成功',
        payload: {fileName: file.name, fileType: file.type, fileSize: file.size},
        response: toDebugResponse(response, result)
      });
      setForm((prev) => ({...prev, imagePath: result.imagePath || ''}));
      setSelectedFile(null);
      setStatus('success', '圖片上傳成功，已填入圖片路徑');
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '圖片上傳失敗');
      pushDebugLog({
        at: new Date().toISOString(),
        action: 'upload',
        ok: false,
        status: 0,
        message: error instanceof Error ? error.message : '圖片上傳失敗（前端例外）',
        payload: {fileName: file.name, fileType: file.type, fileSize: file.size}
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <h3>產品 CRUD 與圖片管理（{locale}）</h3>
      <p className="muted">可新增、編輯、刪除產品，並上傳產品主圖（會綁定為第一張圖片）。</p>
      <div
        role="status"
        aria-live="polite"
        style={{
          marginTop: '0.5rem',
          marginBottom: '0.75rem',
          padding: '0.6rem 0.8rem',
          borderRadius: '10px',
          border: '1px solid rgba(125, 211, 252, 0.45)',
          background: 'rgba(8, 47, 73, 0.45)',
          color: '#e0f2fe',
          fontSize: '0.95rem'
        }}
      >
        <strong>前端狀態:</strong> {isClientReady ? 'Client hydrated' : 'Hydrating...'}
        <span style={{marginLeft: '0.7rem'}}>Build: {ADMIN_MANAGER_BUILD_MARKER}</span>
      </div>

      <form
        className="admin-form"
        onSubmit={handleSubmit}
        onSubmitCapture={() => {
          pushDebugLog({
            at: new Date().toISOString(),
            action: form.id ? 'update' : 'create',
            ok: true,
            status: 0,
            message: 'Form submit event captured'
          });
        }}
        noValidate
      >
        <label>
          分類
          <select
            value={form.category}
            onChange={(event) => setForm((prev) => ({...prev, category: event.target.value}))}
          >
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
          <button
            type="button"
            disabled={isUploading || isSubmitting}
            onClick={() => {
              pushDebugLog({
                at: new Date().toISOString(),
                action: form.id ? 'update' : 'create',
                ok: true,
                status: 0,
                message: 'Submit button clicked'
              });
              void submitProduct('button');
            }}
          >
            {isSubmitting ? '送出中...' : submitLabel}
          </button>
          <button
            type="button"
            style={{background: '#0e7490'}}
            onClick={() => {
              pushDebugLog({
                at: new Date().toISOString(),
                action: form.id ? 'update' : 'create',
                ok: true,
                status: 0,
                message: 'Manual debug log button clicked',
                payload: {
                  modelNumber: form.modelNumber,
                  category: form.category,
                  hasNames: Boolean(form.nameZhTw && form.nameZhCn && form.nameEn)
                }
              });
            }}
          >
            測試寫入日志
          </button>
          <button
            type="button"
            onClick={() => setForm(buildPrefilledFormState())}
            style={{background: '#334155'}}
          >
            填入測試資料
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

      <section className="card" style={{marginTop: '1rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', gap: '0.7rem', flexWrap: 'wrap'}}>
          <h4 style={{margin: 0}}>偵錯面板（前端請求日志）</h4>
          <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
            <button type="button" onClick={() => setShowDebugPanel((prev) => !prev)}>
              {showDebugPanel ? '收合面板' : '展開面板'}
            </button>
            <button
              type="button"
              style={{background: '#475569'}}
              onClick={() => {
                setDebugLogs([]);
                window.localStorage.removeItem(DEBUG_STORAGE_KEY);
              }}
            >
              清除日志
            </button>
          </div>
        </div>

        {showDebugPanel ? (
          <div style={{marginTop: '0.8rem', display: 'grid', gap: '0.6rem'}}>
            {debugLogs.length ? (
              debugLogs.map((entry, index) => (
                <details key={`${entry.at}-${index}`} style={{border: '1px solid rgba(148,163,184,0.25)', borderRadius: '10px', padding: '0.55rem 0.7rem'}}>
                  <summary style={{cursor: 'pointer'}}>
                    [{entry.at}] {entry.action.toUpperCase()} | HTTP {entry.status || 'N/A'} | {entry.ok ? 'OK' : 'FAIL'} | {entry.message}
                  </summary>
                  <pre style={{whiteSpace: 'pre-wrap', marginTop: '0.6rem'}}>{JSON.stringify(entry, null, 2)}</pre>
                </details>
              ))
            ) : (
              <p className="muted">尚無日志。請先執行新增/上傳/重新載入等操作。</p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
