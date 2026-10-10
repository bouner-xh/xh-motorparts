'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {toProductImageUrl} from '@/lib/product-image-url';
import {resizeProductImage} from '@/lib/image-resize';
import {fallbackToNoImage} from '@/components/ui/SafeImage';
import {MAX_PRODUCT_IMAGES, normalizeModelNumber, splitSpecifications, validateProductForm} from '@/lib/product-form';
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
  images: string[];
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
  // 圖片清單，第一張是主圖（最多 8 張）
  images: string[];
}

interface AdminSubCategoryItem {
  id: string;
  category: string;
  slug: string;
  nameZhTw: string;
}

type StatusType = 'idle' | 'info' | 'success' | 'error';
type ActiveFilter = 'all' | 'active' | 'inactive';

const PAGE_SIZE = 20;

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
  images: []
};

// locale 由後台頁面傳入，目前產品表單固定顯示繁中
export function AdminProductManager(_props: {locale: Locale}) {
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [rows, setRows] = useState<AdminProductItem[]>([]);
  const [subCategories, setSubCategories] = useState<AdminSubCategoryItem[]>([]);
  const [form, setForm] = useState<ProductFormState>(emptyFormState);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('idle');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // 產品列表的搜尋、篩選與分頁（A7）
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterActive, setFilterActive] = useState<ActiveFilter>('all');
  const [page, setPage] = useState(1);
  // 已上傳但還沒存檔的圖片；換圖或取消時刪除，避免留在儲存空間（A7）
  const [unsavedUploads, setUnsavedUploads] = useState<string[]>([]);
  // 「進階」手動輸入的圖片網址
  const [manualUrl, setManualUrl] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

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
    // 改型號會讓舊的產品網址失效（別人收藏或客戶保存的連結會打不開），先請使用者確認（U3）
    // 只有大小寫不同不算改型號（型號一律存成大寫，舊網址也會自動轉址）
    const newModel = normalizeModelNumber(form.modelNumber);
    if (form.id && editingRow && newModel && editingRow.modelNumber.toUpperCase() !== newModel) {
      const ok = window.confirm(
        `型號將從「${editingRow.modelNumber}」改為「${newModel}」。\n產品網址會跟著改變，舊網址將無法開啟。確定要儲存嗎？`
      );
      if (!ok) return;
    }
    // 上架時沒有圖片，前台會顯示預設圖；提醒一次讓使用者決定（U8，已經上架的產品重複編輯不再提醒）
    if (form.isActive && form.images.length === 0 && !editingRow?.isActive) {
      if (!window.confirm('這個產品還沒有圖片，上架後前台會顯示預設圖片。\n仍要上架嗎？（按取消可回去上傳圖片）')) return;
    }
    setIsSubmitting(true);
    setStatus('info', form.id ? '更新產品中...' : '新增產品中...');

    const payload = {
      id: form.id,
      category: form.category,
      modelNumber: normalizeModelNumber(form.modelNumber),
      nameZhTw: form.nameZhTw.trim(),
      nameZhCn: form.nameZhCn.trim(),
      nameEn: form.nameEn.trim(),
      // 半形逗號、全形逗號、頓號都可以分隔（P4）
      specifications: splitSpecifications(form.specifications),
      stockQuantity: Number(form.stockQuantity),
      isActive: form.isActive,
      subCategoryId: form.subCategoryId,
      images: form.images
    };

    const method = form.id ? 'PUT' : 'POST';

    const validationErrors = validateProductForm(payload);

    if (validationErrors.length) {
      const message = `請修正：${validationErrors.join('、')}`;
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
      setUnsavedUploads([]);
      await loadProducts();
      window.dispatchEvent(new Event('products-updated'));
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

  // 刪除已上傳但沒有存檔的圖片（伺服器只會刪除沒有產品使用的檔案）；urls 沒指定時刪除全部沒存檔的
  function discardUnsavedUploads(urls: string[] = unsavedUploads) {
    const targets = unsavedUploads.filter((url) => urls.includes(url));
    targets.forEach((url) => {
      void fetch(`/api/admin/upload-image?url=${encodeURIComponent(url)}`, {method: 'DELETE'});
    });
    setUnsavedUploads((prev) => prev.filter((url) => !targets.includes(url)));
  }

  // 把表單捲到畫面上並把游標放在型號欄（表單在列表上方，編輯時原本不會自動捲動）
  function focusForm() {
    formRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
    modelInputRef.current?.focus({preventScroll: true});
  }

  // 表單有尚未儲存的內容時，切換到其他產品前先確認，避免辛苦輸入的資料消失（U5）
  function hasUnsavedChanges() {
    const text = [form.modelNumber, form.nameZhTw, form.nameZhCn, form.nameEn, form.specifications].map((v) => v.trim());
    if (!form.id) return text.some(Boolean) || form.images.length > 0 || unsavedUploads.length > 0;
    if (!editingRow) return false;
    return (
      text[0] !== editingRow.modelNumber ||
      text[1] !== editingRow.nameZhTw ||
      text[2] !== editingRow.nameZhCn ||
      text[3] !== editingRow.nameEn ||
      splitSpecifications(form.specifications).join('|') !== editingRow.specifications.join('|') ||
      form.stockQuantity !== editingRow.stockQuantity ||
      form.isActive !== editingRow.isActive ||
      form.category !== editingRow.category ||
      form.subCategoryId !== editingRow.subCategoryId ||
      form.images.join('|') !== editingRow.images.join('|')
    );
  }

  function confirmDiscardChanges() {
    return !hasUnsavedChanges() || window.confirm('表單上有還沒儲存的內容，切換後會消失。確定要切換嗎？');
  }

  function cancelEdit() {
    discardUnsavedUploads();
    setForm((prev) => ({...emptyFormState, category: prev.category, subCategoryId: prev.subCategoryId}));
    setStatus('idle', '');
  }

  // 複製產品：帶入同一筆的分類、名稱、規格與圖片，型號留空待輸入，預設不上架（A7）
  function duplicateProduct(row: AdminProductItem) {
    if (!confirmDiscardChanges()) return;
    discardUnsavedUploads();
    setForm({
      category: row.category,
      modelNumber: '',
      nameZhTw: row.nameZhTw,
      nameZhCn: row.nameZhCn,
      nameEn: row.nameEn,
      specifications: row.specifications.join(', '),
      stockQuantity: row.stockQuantity,
      isActive: false,
      subCategoryId: row.subCategoryId,
      images: row.images
    });
    setStatus('info', `已複製 ${row.modelNumber}，請輸入新的型號後按「新增產品」`);
    focusForm();
  }

  function startEdit(row: AdminProductItem) {
    if (row.id !== form.id && !confirmDiscardChanges()) return;
    discardUnsavedUploads();
    setStatus('idle', '');
    focusForm();
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
      images: row.images
    });
  }

  async function deleteProduct(row: AdminProductItem) {
    const id = row.id;
    const confirmed = window.confirm(
      `確定要刪除產品「${row.modelNumber}」嗎？刪除後無法復原，連結也會失效。\n只是暫時不賣的話，建議改用「下架」。`
    );
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
      window.dispatchEvent(new Event('products-updated'));
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '刪除失敗');
    }
  }

  // 列表上直接上架／下架，不用開編輯表單（U6）
  async function toggleActive(row: AdminProductItem) {
    const next = !row.isActive;
    if (next && row.images.length === 0 && !window.confirm(`「${row.modelNumber}」還沒有圖片，上架後前台會顯示預設圖片。\n仍要上架嗎？`)) return;
    setStatus('info', `${next ? '上架' : '下架'}中：${row.modelNumber}`);
    try {
      const response = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          id: row.id,
          category: row.category,
          modelNumber: row.modelNumber,
          nameZhTw: row.nameZhTw,
          nameZhCn: row.nameZhCn,
          nameEn: row.nameEn,
          specifications: row.specifications,
          stockQuantity: row.stockQuantity,
          isActive: next,
          subCategoryId: row.subCategoryId,
          images: row.images
        })
      });
      const result = (await parseResponseJson<{error?: string}>(response)) || {};
      if (!response.ok) throw new Error(result.error || `${next ? '上架' : '下架'}失敗（HTTP ${response.status}）`);
      setStatus('success', `${row.modelNumber} 已${next ? '上架' : '下架'}`);
      await loadProducts();
      window.dispatchEvent(new Event('products-updated'));
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '操作失敗');
    }
  }

  // 一次上傳一張或多張（最多 8 張）；每張上傳前先縮小，買家瀏覽時不用下載數 MB 的原檔（P1）
  async function uploadImages(files: File[]) {
    const room = MAX_PRODUCT_IMAGES - form.images.length;
    if (room <= 0) {
      setStatus('error', `每個產品最多 ${MAX_PRODUCT_IMAGES} 張圖片，請先移除不要的圖片`);
      return;
    }
    const accepted = files.slice(0, room);
    setIsUploading(true);
    const added: string[] = [];
    let failure = '';

    for (const [index, file] of accepted.entries()) {
      setStatus('info', `圖片上傳中（${index + 1}/${accepted.length}）：${file.name}`);
      try {
        const prepared = await resizeProductImage(file);
        const body = new FormData();
        body.append('file', prepared);
        const response = await fetch('/api/admin/upload-image', {method: 'POST', body});
        const result = (await parseResponseJson<{imagePath?: string; error?: string}>(response)) || {};
        if (!response.ok || !result.imagePath) {
          throw new Error(result.error || `圖片上傳失敗（HTTP ${response.status}）`);
        }
        added.push(result.imagePath);
        const uploaded = result.imagePath;
        setUnsavedUploads((prev) => [...prev, uploaded]);
        setForm((prev) => ({...prev, images: [...prev.images, uploaded]}));
      } catch (error) {
        failure = error instanceof Error ? error.message : '圖片上傳失敗';
        break;
      }
    }

    setIsUploading(false);
    const skipped = files.length - accepted.length;
    if (failure) {
      setStatus('error', added.length ? `已上傳 ${added.length} 張，其餘失敗：${failure}` : failure);
    } else {
      setStatus('success', `圖片上傳成功（${added.length} 張）${skipped > 0 ? `，超過 ${MAX_PRODUCT_IMAGES} 張的 ${skipped} 張已略過` : ''}，按下「${submitLabel}」後才會儲存`);
    }
  }

  // 圖片清單操作：設為主圖、左右移動、移除
  function moveImage(index: number, to: number) {
    setForm((prev) => {
      if (to < 0 || to >= prev.images.length) return prev;
      const next = [...prev.images];
      const [item] = next.splice(index, 1);
      next.splice(to, 0, item);
      return {...prev, images: next};
    });
  }

  function removeImage(index: number) {
    const url = form.images[index];
    if (!url) return;
    discardUnsavedUploads([url]);
    setForm((prev) => ({...prev, images: prev.images.filter((_, i) => i !== index)}));
    setStatus('info', form.id ? '已移除圖片，按下「更新產品」後才會儲存' : '已移除圖片');
  }

  function addManualUrl() {
    const url = manualUrl.trim();
    if (!url) return;
    if (form.images.includes(url)) {
      setStatus('error', '這個圖片網址已經在清單裡');
      return;
    }
    if (form.images.length >= MAX_PRODUCT_IMAGES) {
      setStatus('error', `每個產品最多 ${MAX_PRODUCT_IMAGES} 張圖片`);
      return;
    }
    setForm((prev) => ({...prev, images: [...prev.images, url]}));
    setManualUrl('');
  }

  const categoryNames = useMemo(() => new Map(categories.map((c) => [c.slug, c.nameZhTw])), [categories]);
  const subCategoryNames = useMemo(() => new Map(subCategories.map((sc) => [sc.id, sc.nameZhTw])), [subCategories]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filterCategory !== 'all' && row.category !== filterCategory) return false;
      if (filterActive === 'active' && !row.isActive) return false;
      if (filterActive === 'inactive' && row.isActive) return false;
      if (!keyword) return true;
      return [row.modelNumber, row.nameZhTw, row.nameZhCn, row.nameEn].some((v) => v.toLowerCase().includes(keyword));
    });
  }, [rows, search, filterCategory, filterActive]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const editingRow = form.id ? rows.find((r) => r.id === form.id) : undefined;

  return (
    <div>
      <h3>產品管理</h3>
      <p className="muted">新增或編輯產品；確認內容無誤後勾選「上架」，前台才看得到。照片會自動縮小後再上傳。</p>

      <form ref={formRef} className="admin-form" data-testid="admin-product-form" onSubmit={handleSubmit} noValidate>
        {form.id ? (
          <div
            data-testid="editing-banner"
            style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'rgba(29, 78, 216, 0.2)', border: '1px solid rgba(96, 165, 250, 0.4)'}}
          >
            <strong>正在編輯：{editingRow?.modelNumber || form.modelNumber}</strong>
            <button type="button" onClick={cancelEdit} style={{background: '#334155'}}>
              取消編輯
            </button>
          </div>
        ) : null}
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
            ref={modelInputRef}
            required
            value={form.modelNumber}
            onChange={(event) => setForm((prev) => ({...prev, modelNumber: event.target.value}))}
            // 離開欄位時自動轉成大寫（原廠料號慣例）
            onBlur={() => setForm((prev) => ({...prev, modelNumber: normalizeModelNumber(prev.modelNumber)}))}
          />
        </label>

        <label>
          名稱（en）
          <small className="muted">必填，英文為主要語言</small>
          <input
            required
            value={form.nameEn}
            onChange={(event) => setForm((prev) => ({...prev, nameEn: event.target.value}))}
          />
        </label>

        <label>
          名稱（zh-TW）
          <small className="muted">選填；沒填時繁中頁顯示英文名稱</small>
          <input
            value={form.nameZhTw}
            onChange={(event) => setForm((prev) => ({...prev, nameZhTw: event.target.value}))}
          />
        </label>

        <label>
          名稱（zh-CN）
          <small className="muted">選填；沒填時簡中頁顯示英文名稱</small>
          <input
            value={form.nameZhCn}
            onChange={(event) => setForm((prev) => ({...prev, nameZhCn: event.target.value}))}
          />
        </label>

        <label>
          規格（用逗號或頓號分隔）
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
            min={0}
            step={1}
            value={form.stockQuantity}
            onChange={(event) =>
              setForm((prev) => ({...prev, stockQuantity: Number(event.target.value || 0)}))
            }
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

        <div className="admin-gallery" data-testid="admin-gallery">
          <strong>
            產品圖片（{form.images.length} / {MAX_PRODUCT_IMAGES} 張）
          </strong>
          <p className="muted">第一張是主圖，產品列表與分類封面使用主圖。可一次選多張；用左右箭頭調整順序。</p>
          {form.images.length ? (
            <ul className="admin-gallery__list">
              {form.images.map((url, index) => (
                <li key={`${url}-${index}`} className="admin-gallery__item" data-image-url={url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={toProductImageUrl(url)} alt={index === 0 ? '目前的主圖' : `圖片 ${index + 1}`} onError={fallbackToNoImage} width={96} height={96} />
                  {index === 0 ? <span className="admin-gallery__badge">主圖</span> : null}
                  <div className="admin-gallery__actions">
                    {index > 0 ? (
                      <button type="button" onClick={() => moveImage(index, 0)} aria-label={`把第 ${index + 1} 張設為主圖`}>
                        設為主圖
                      </button>
                    ) : null}
                    <button type="button" disabled={index === 0} onClick={() => moveImage(index, index - 1)} aria-label={`第 ${index + 1} 張往前移`}>
                      ←
                    </button>
                    <button type="button" disabled={index === form.images.length - 1} onClick={() => moveImage(index, index + 1)} aria-label={`第 ${index + 1} 張往後移`}>
                      →
                    </button>
                    <button type="button" onClick={() => removeImage(index)} aria-label={`移除第 ${index + 1} 張`} disabled={isUploading || isSubmitting}>
                      移除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">尚未上傳圖片</p>
          )}
          <label>
            上傳圖片
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              disabled={isUploading || form.images.length >= MAX_PRODUCT_IMAGES}
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                event.target.value = '';
                if (files.length) void uploadImages(files);
              }}
            />
          </label>
        </div>

        {/* 一般用「上傳圖片」即可；手動網址只給特殊情況，收在進階裡避免誤填（P7） */}
        <details className="admin-advanced">
          <summary>進階：手動指定圖片網址</summary>
          <label>
            圖片網址
            <input
              value={manualUrl}
              onChange={(event) => setManualUrl(event.target.value)}
              placeholder="貼上網址後按「加入圖片」"
            />
          </label>
          <button type="button" onClick={addManualUrl} disabled={!manualUrl.trim()}>
            加入圖片
          </button>
          <p className="muted">一般不需要填寫。只能使用本網站儲存空間的圖片；其他網站的圖片網址在前台會被安全設定擋住、無法顯示。</p>
        </details>

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

      <div style={{display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '1.25rem'}}>
        <input
          type="search"
          aria-label="搜尋產品"
          placeholder="搜尋型號或名稱"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{flex: '1 1 220px', minWidth: 0}}
        />
        <select
          aria-label="依大分類篩選"
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
          style={{width: 'auto'}}
        >
          <option value="all">全部分類</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.nameZhTw}
            </option>
          ))}
        </select>
        <select
          aria-label="依上架狀態篩選"
          value={filterActive}
          onChange={(e) => {
            setFilterActive(e.target.value as ActiveFilter);
            setPage(1);
          }}
          style={{width: 'auto'}}
        >
          <option value="all">全部狀態</option>
          <option value="active">已上架</option>
          <option value="inactive">未上架</option>
        </select>
      </div>

      <div style={{overflowX: 'auto', marginTop: '0.75rem'}}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th align="left">圖片</th>
              <th align="left">型號</th>
              <th align="left">分類</th>
              <th align="left">名稱</th>
              <th align="left">庫存</th>
              <th align="left">上架</th>
              <th align="left">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7}>載入中...</td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={7}>載入失敗，請檢查 Supabase 設定與資料表。</td>
              </tr>
            ) : pageRows.length ? (
              pageRows.map((row) => (
                <tr key={row.id} style={row.id === form.id ? {background: 'rgba(29, 78, 216, 0.15)'} : undefined}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={toProductImageUrl(row.imagePath)} alt="" onError={fallbackToNoImage} width={48} height={48} loading="lazy" style={{objectFit: 'cover', borderRadius: '6px', display: 'block'}} />
                  </td>
                  <td>{row.modelNumber}</td>
                  <td>
                    {categoryNames.get(row.category) || row.category}
                    <div className="muted" style={{fontSize: '0.85em'}}>{subCategoryNames.get(row.subCategoryId) || '—'}</div>
                  </td>
                  <td>{row.nameZhTw || row.nameEn}</td>
                  <td>{row.stockQuantity}</td>
                  <td>{row.isActive ? '是' : '否'}</td>
                  <td>
                    <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                      <button type="button" onClick={() => startEdit(row)}>
                        編輯
                      </button>
                      <button type="button" onClick={() => duplicateProduct(row)} style={{background: '#334155'}}>
                        複製
                      </button>
                      <button type="button" onClick={() => void toggleActive(row)} style={{background: '#334155'}}>
                        {row.isActive ? '下架' : '上架'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteProduct(row)}
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
                <td colSpan={7}>{rows.length ? '沒有符合條件的產品。' : '目前沒有產品資料。'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredRows.length > 0 ? (
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.75rem'}}>
          <span className="muted">
            共 {filteredRows.length} 筆，第 {currentPage} / {totalPages} 頁
          </span>
          <div style={{display: 'flex', gap: '0.5rem'}}>
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              上一頁
            </button>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
              下一頁
            </button>
          </div>
        </div>
      ) : null}

    </div>
  );
}
