'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {toProductImageUrl} from '@/lib/product-image-url';
import {resizeProductImage} from '@/lib/image-resize';
import {fallbackToNoImage} from '@/components/ui/SafeImage';
import {
  MAX_PRODUCT_IMAGES,
  PRODUCT_FIELD_ORDER,
  mapServerErrorToFields,
  normalizeModelNumber,
  normalizeOemNumbers,
  splitOemNumbers,
  splitSpecifications,
  validateProductFormFields,
  type ProductFieldErrors,
  type ProductFormField
} from '@/lib/product-form';
import {useAdminStatus, type AdminStatusType} from '@/components/admin/AdminToast';
import {useUnsavedWarning} from '@/components/admin/useUnsavedWarning';
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
  vehicleModelIds: string[];
  oemNumbers: string[];
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
  // 適用車型（車型清單的編號）與 OEM／對照料號（用逗號分隔的文字）
  vehicleModelIds: string[];
  oemNumbers: string;
}

interface VehicleModelOption {
  id: string;
  name: string;
}

interface AdminSubCategoryItem {
  id: string;
  category: string;
  slug: string;
  nameZhTw: string;
}

type StatusType = AdminStatusType;
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
  images: [],
  vehicleModelIds: [],
  oemNumbers: ''
};

// locale 由後台頁面傳入，目前產品表單固定顯示繁中
export function AdminProductManager(_props: {locale: Locale}) {
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [rows, setRows] = useState<AdminProductItem[]>([]);
  const [subCategories, setSubCategories] = useState<AdminSubCategoryItem[]>([]);
  const [form, setForm] = useState<ProductFormState>(emptyFormState);
  // 操作結果以 toast 顯示（UX-15）；表單驗證與伺服器對表單的回應則顯示在欄位旁（UX-24）
  const setStatus: (type: StatusType, message: string) => void = useAdminStatus();
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // 第一次載入完成前才顯示「載入中」；之後重新載入時保留舊列表，資料到了再替換（UX-20）
  const [hasLoaded, setHasLoaded] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
  // 表單頂端的摘要：byFields 代表詳細訊息已經顯示在各欄位旁，摘要只提示「請看標示的欄位」
  const [formIssue, setFormIssue] = useState<{message: string; byFields: boolean} | null>(null);
  const [focusRequest, setFocusRequest] = useState<{field: ProductFormField | 'summary'; n: number} | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // 產品列表的搜尋、篩選與分頁（A7）
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterActive, setFilterActive] = useState<ActiveFilter>('all');
  const [page, setPage] = useState(1);
  // 批量上架／下架（P9）：勾選的產品 id；搜尋或篩選條件改變時清空，避免誤操作看不到的產品
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  // 已上傳但還沒存檔的圖片；換圖或取消時刪除，避免留在儲存空間（A7）
  const [unsavedUploads, setUnsavedUploads] = useState<string[]>([]);
  // 「進階」手動輸入的圖片網址
  const [manualUrl, setManualUrl] = useState('');
  // 車型清單（P8）；vehicleEnabled 為 false 代表資料庫還沒執行更新語法
  const [vehicleModels, setVehicleModels] = useState<VehicleModelOption[]>([]);
  const [vehicleEnabled, setVehicleEnabled] = useState(true);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

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
      setHasLoaded(true);
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

  // 車型清單：載入後，已勾選但已被刪除的車型自動取消勾選
  const loadVehicleModels = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/vehicle-models', {cache: 'no-store'});
      const result = (await parseResponseJson<{items?: VehicleModelOption[]; enabled?: boolean}>(response)) || {};
      if (!response.ok) return;
      const items = result.items || [];
      setVehicleModels(items);
      setVehicleEnabled(result.enabled !== false);
      const ids = new Set(items.map((item) => item.id));
      setForm((prev) => (prev.vehicleModelIds.every((id) => ids.has(id)) ? prev : {...prev, vehicleModelIds: prev.vehicleModelIds.filter((id) => ids.has(id))}));
    } catch {
      // 載入失敗時維持目前畫面
    }
  }, []);

  useEffect(() => {
    void loadVehicleModels();
    window.addEventListener('vehicle-models-updated', loadVehicleModels);
    return () => window.removeEventListener('vehicle-models-updated', loadVehicleModels);
  }, [loadVehicleModels]);

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
      images: form.images,
      vehicleModelIds: form.vehicleModelIds,
      oemNumbers: splitOemNumbers(form.oemNumbers)
    };

    const method = form.id ? 'PUT' : 'POST';

    const validationErrors = validateProductFormFields(payload);

    if (Object.keys(validationErrors).length) {
      showFieldErrors(validationErrors, `有 ${Object.keys(validationErrors).length} 個欄位需要修正，請看下方以紅框標示的欄位`, true);
      setIsSubmitting(false);
      return;
    }
    setFieldErrors({});
    setFormIssue(null);
    setStatus('info', form.id ? '更新產品中...' : '新增產品中...');

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

      const doneMessage = form.id ? '產品更新成功' : '產品新增成功';
      setFieldErrors({});
      setFormIssue(null);
      // 保留剛剛選的分類與子分類，方便連續新增同分類的產品（A3）
      setForm({...emptyFormState, category: form.category, subCategoryId: form.subCategoryId});
      setUnsavedUploads([]);
      // 列表重新載入完成後才顯示成功訊息，這時按「編輯」拿到的一定是最新資料
      await loadProducts();
      setStatus('success', doneMessage);
      window.dispatchEvent(new Event('products-updated'));
    } catch (error) {
      // 伺服器的錯誤（型號重複、OEM 重複、欄位太長…）顯示在對應欄位旁，摘要保留（UX-24）
      setStatus('idle', '');
      const message = error instanceof Error ? error.message : '儲存失敗';
      const {fields, unmapped} = mapServerErrorToFields(message);
      if (Object.keys(fields).length) showFieldErrors(fields, unmapped ? message : '儲存失敗，請看下方以紅框標示的欄位', !unmapped);
      else showFieldErrors({}, message, false);
    } finally {
      setIsSubmitting(false);
    }
  }

  // 顯示欄位錯誤，並把畫面捲到第一個有錯的欄位、把游標放進去
  function showFieldErrors(errors: ProductFieldErrors, summary: string, byFields: boolean) {
    setFieldErrors(errors);
    setFormIssue({message: summary, byFields});
    const first = PRODUCT_FIELD_ORDER.find((field) => errors[field]);
    setFocusRequest((prev) => ({field: first ?? 'summary', n: (prev?.n ?? 0) + 1}));
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
    if (!form.id) return text.some(Boolean) || form.images.length > 0 || unsavedUploads.length > 0 || form.vehicleModelIds.length > 0 || Boolean(form.oemNumbers.trim());
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
      form.images.join('|') !== editingRow.images.join('|') ||
      [...form.vehicleModelIds].sort().join('|') !== [...editingRow.vehicleModelIds].sort().join('|') ||
      splitOemNumbers(form.oemNumbers).join('|') !== editingRow.oemNumbers.join('|')
    );
  }

  function confirmDiscardChanges() {
    return !hasUnsavedChanges() || window.confirm('表單上有還沒儲存的內容，切換後會消失。確定要切換嗎？');
  }

  function clearFormIssues() {
    setFieldErrors({});
    setFormIssue(null);
  }

  function cancelEdit() {
    discardUnsavedUploads();
    setForm((prev) => ({...emptyFormState, category: prev.category, subCategoryId: prev.subCategoryId}));
    setStatus('idle', '');
    clearFormIssues();
  }

  // 複製產品：帶入同一筆的分類、名稱、規格與圖片，型號留空待輸入，預設不上架（A7）
  function duplicateProduct(row: AdminProductItem) {
    if (!confirmDiscardChanges()) return;
    discardUnsavedUploads();
    clearFormIssues();
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
      images: row.images,
      vehicleModelIds: row.vehicleModelIds,
      oemNumbers: row.oemNumbers.join(', ')
    });
    setStatus('info', `已複製 ${row.modelNumber}，請輸入新的型號後按「新增產品」`);
    focusForm();
  }

  function startEdit(row: AdminProductItem) {
    if (row.id !== form.id && !confirmDiscardChanges()) return;
    discardUnsavedUploads();
    setStatus('idle', '');
    clearFormIssues();
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
      images: row.images,
      vehicleModelIds: row.vehicleModelIds,
      oemNumbers: row.oemNumbers.join(', ')
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

      await loadProducts();
      setStatus('success', '產品已刪除');
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
      await loadProducts();
      setStatus('success', `${row.modelNumber} 已${next ? '上架' : '下架'}`);
      window.dispatchEvent(new Event('products-updated'));
    } catch (error) {
      setStatus('error', error instanceof Error ? error.message : '操作失敗');
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 批量上架／下架：先確認（含沒有圖片的提醒），每 100 筆送一次
  async function bulkSetActive(next: boolean) {
    const targets = rows.filter((row) => selectedIds.has(row.id));
    if (!targets.length) return;
    const action = next ? '上架' : '下架';
    const noImage = next ? targets.filter((row) => row.images.length === 0).length : 0;
    const message =
      `確定要將選取的 ${targets.length} 項產品${action}嗎？` +
      (noImage ? `\n\n其中 ${noImage} 項還沒有圖片，上架後前台會顯示預設圖片。` : '');
    if (!window.confirm(message)) return;

    setIsBulkBusy(true);
    setStatus('info', `批量${action}中：${targets.length} 項`);
    let updated = 0;
    let unchanged = 0;
    let missing = 0;
    try {
      for (let i = 0; i < targets.length; i += 100) {
        const response = await fetch('/api/admin/products', {
          method: 'PATCH',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ids: targets.slice(i, i + 100).map((row) => row.id), isActive: next})
        });
        const result = (await parseResponseJson<{error?: string; updated?: number; unchanged?: number; missing?: number}>(response)) || {};
        if (!response.ok) {
          throw new Error(`${result.error || `批量${action}失敗（HTTP ${response.status}）`}${updated ? `（前面已有 ${updated} 項${action}成功）` : ''}`);
        }
        updated += result.updated || 0;
        unchanged += result.unchanged || 0;
        missing += result.missing || 0;
      }
      setSelectedIds(new Set());
      await loadProducts();
      window.dispatchEvent(new Event('products-updated'));
      const extra = [unchanged ? `${unchanged} 項本來就是${action}` : '', missing ? `${missing} 項找不到（可能已被刪除）` : ''].filter(Boolean).join('、');
      setStatus('success', `已${action} ${updated} 項${extra ? `（${extra}）` : ''}`);
    } catch (error) {
      await loadProducts();
      setStatus('error', error instanceof Error ? error.message : '操作失敗');
    } finally {
      setIsBulkBusy(false);
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

  // 表單有未儲存的修改時：重新整理或關閉分頁先警告，切換語言的連結也會先確認（UX-25）
  useUnsavedWarning('product-form', hasUnsavedChanges());

  // 欄位被修改後，該欄位的錯誤訊息隨即消失；全部消失後頂端摘要也收起來（UX-24）
  const previousForm = useRef(form);
  useEffect(() => {
    const before = previousForm.current;
    previousForm.current = form;
    setFieldErrors((current) => {
      const keys = Object.keys(current) as ProductFormField[];
      const stale = keys.filter((key) => JSON.stringify(before[key as keyof ProductFormState]) !== JSON.stringify(form[key as keyof ProductFormState]));
      if (!stale.length) return current;
      const next = {...current};
      stale.forEach((key) => delete next[key]);
      return next;
    });
  }, [form]);
  useEffect(() => {
    if (formIssue?.byFields && Object.keys(fieldErrors).length === 0) setFormIssue(null);
  }, [fieldErrors, formIssue]);

  // 送出失敗：捲到並聚焦第一個有錯的欄位（沒有對應欄位時聚焦頂端摘要）
  useEffect(() => {
    if (!focusRequest) return;
    const target = focusRequest.field === 'summary' ? summaryRef.current : document.getElementById(`product-field-${focusRequest.field}`);
    if (!target) return;
    target.scrollIntoView({block: 'center'});
    target.focus({preventScroll: true});
  }, [focusRequest]);

  const fieldProps = (field: ProductFormField) => ({
    id: `product-field-${field}`,
    'aria-invalid': fieldErrors[field] ? (true as const) : undefined,
    'aria-describedby': fieldErrors[field] ? `product-error-${field}` : undefined
  });
  const fieldError = (field: ProductFormField) =>
    fieldErrors[field] ? (
      <p className="admin-field-error" id={`product-error-${field}`} data-testid={`field-error-${field}`}>
        {fieldErrors[field]}
      </p>
    ) : null;

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
        {/* 表單頂端摘要（UX-24）：詳細訊息在各欄位旁；無法對應欄位的錯誤直接寫在這裡 */}
        {formIssue ? (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="admin-form-summary" data-testid="product-form-summary">
            {formIssue.message}
          </div>
        ) : null}

        <div className="admin-field">
          <label>
            <span className="admin-required">分類</span>
            <select
              {...fieldProps('category')}
              required
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
          {fieldError('category')}
        </div>

        <div className="admin-field">
          <label>
            <span className="admin-required">子分類</span>
            <select
              {...fieldProps('subCategoryId')}
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
          {fieldError('subCategoryId')}
        </div>

        <div className="admin-field">
          <label>
            <span className="admin-required">型號</span>
            <input
              {...fieldProps('modelNumber')}
              ref={modelInputRef}
              required
              value={form.modelNumber}
              onChange={(event) => setForm((prev) => ({...prev, modelNumber: event.target.value}))}
              // 離開欄位時自動轉成大寫（原廠料號慣例）
              onBlur={() => setForm((prev) => ({...prev, modelNumber: normalizeModelNumber(prev.modelNumber)}))}
            />
          </label>
          {fieldError('modelNumber')}
        </div>

        <div className="admin-field">
          <label>
            <span className="admin-required">名稱（en）</span>
            <small className="muted">必填，英文為主要語言</small>
            <input
              {...fieldProps('nameEn')}
              required
              value={form.nameEn}
              onChange={(event) => setForm((prev) => ({...prev, nameEn: event.target.value}))}
            />
          </label>
          {fieldError('nameEn')}
        </div>

        <div className="admin-field">
          <label>
            名稱（zh-TW）
            <small className="muted">選填；沒填時繁中頁顯示英文名稱</small>
            <input
              {...fieldProps('nameZhTw')}
              value={form.nameZhTw}
              onChange={(event) => setForm((prev) => ({...prev, nameZhTw: event.target.value}))}
            />
          </label>
          {fieldError('nameZhTw')}
        </div>

        <div className="admin-field">
          <label>
            名稱（zh-CN）
            <small className="muted">選填；沒填時簡中頁顯示英文名稱</small>
            <input
              {...fieldProps('nameZhCn')}
              value={form.nameZhCn}
              onChange={(event) => setForm((prev) => ({...prev, nameZhCn: event.target.value}))}
            />
          </label>
          {fieldError('nameZhCn')}
        </div>

        <div className="admin-field">
          <label>
            規格（用逗號或頓號分隔）
            <input
              {...fieldProps('specifications')}
              value={form.specifications}
              onChange={(event) => setForm((prev) => ({...prev, specifications: event.target.value}))}
              placeholder="STD, 47MM, 50MM"
            />
          </label>
          {fieldError('specifications')}
        </div>

        <fieldset className="admin-fitment" data-testid="admin-fitment" id="product-field-vehicleModelIds" tabIndex={-1}>
          <legend>適用車型</legend>
          {!vehicleEnabled ? (
            <p className="muted">車型清單尚未啟用（資料庫還沒執行更新語法），請見「分類」分頁最下方的說明。</p>
          ) : vehicleModels.length === 0 ? (
            <p className="muted">還沒有車型。請先到「分類」分頁最下方的「車型清單」新增。</p>
          ) : (
            <>
              {vehicleModels.length > 8 ? (
                <input
                  type="search"
                  aria-label="篩選車型"
                  placeholder="輸入文字篩選車型"
                  value={vehicleFilter}
                  onChange={(event) => setVehicleFilter(event.target.value)}
                />
              ) : null}
              <div className="admin-fitment__list">
                {vehicleModels
                  .filter((model) => model.name.toLowerCase().includes(vehicleFilter.trim().toLowerCase()) || form.vehicleModelIds.includes(model.id))
                  .map((model) => (
                    <label key={model.id} className="admin-fitment__item">
                      <input
                        type="checkbox"
                        checked={form.vehicleModelIds.includes(model.id)}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            vehicleModelIds: event.target.checked ? [...prev.vehicleModelIds, model.id] : prev.vehicleModelIds.filter((id) => id !== model.id)
                          }))
                        }
                      />
                      {model.name}
                    </label>
                  ))}
              </div>
            </>
          )}
        </fieldset>

        {fieldError('vehicleModelIds')}

        <div className="admin-field">
          <label>
            OEM／對照料號
            <small className="muted">用逗號分隔，自動轉成大寫</small>
            <input
              {...fieldProps('oemNumbers')}
              value={form.oemNumbers}
              onChange={(event) => setForm((prev) => ({...prev, oemNumbers: event.target.value}))}
              onBlur={() => setForm((prev) => ({...prev, oemNumbers: normalizeOemNumbers(prev.oemNumbers.split(/[,，、;；\n]/)).join(', ')}))}
              placeholder="2A6-17421-00, 5T5-17421-00"
            />
          </label>
          {fieldError('oemNumbers')}
        </div>

        <div className="admin-field">
          <label>
            庫存
            <input
              {...fieldProps('stockQuantity')}
              type="number"
              min={0}
              step={1}
              value={form.stockQuantity}
              onChange={(event) =>
                setForm((prev) => ({...prev, stockQuantity: Number(event.target.value || 0)}))
              }
            />
          </label>
          {fieldError('stockQuantity')}
        </div>


        <label style={{flexDirection: 'row', alignItems: 'center', gap: '0.5rem'}}>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((prev) => ({...prev, isActive: event.target.checked}))}
            style={{width: 'auto'}}
          />
          上架
        </label>

        <div className="admin-gallery" data-testid="admin-gallery" id="product-field-images" tabIndex={-1}>
          <strong>
            產品圖片（{form.images.length} / {MAX_PRODUCT_IMAGES} 張）
          </strong>
          <p className="muted">第一張是主圖，產品列表與分類封面使用主圖。可一次選多張；用左右箭頭調整順序。</p>
          {fieldError('images')}
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

      {loadError ? <p className="muted" role="alert">產品資料載入失敗：{loadError}</p> : null}
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
            setSelectedIds(new Set());
          }}
          style={{flex: '1 1 220px', minWidth: 0}}
        />
        <select
          aria-label="依大分類篩選"
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
            setSelectedIds(new Set());
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
            setSelectedIds(new Set());
          }}
          style={{width: 'auto'}}
        >
          <option value="all">全部狀態</option>
          <option value="active">已上架</option>
          <option value="inactive">未上架</option>
        </select>
      </div>

      {selectedIds.size > 0 ? (
        <div
          role="region"
          aria-label="批量操作"
          data-testid="bulk-bar"
          style={{display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.75rem', padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'rgba(29, 78, 216, 0.15)'}}
        >
          <strong data-testid="bulk-count">已選取 {selectedIds.size} 項</strong>
          <button type="button" disabled={isBulkBusy} onClick={() => void bulkSetActive(true)}>
            批量上架
          </button>
          <button type="button" disabled={isBulkBusy} onClick={() => void bulkSetActive(false)} style={{background: '#334155'}}>
            批量下架
          </button>
          {filteredRows.length > selectedIds.size ? (
            <button type="button" disabled={isBulkBusy} onClick={() => setSelectedIds(new Set(filteredRows.map((row) => row.id)))} style={{background: '#334155'}}>
              選取符合條件的全部 {filteredRows.length} 項
            </button>
          ) : null}
          <button type="button" disabled={isBulkBusy} onClick={() => setSelectedIds(new Set())} style={{background: 'transparent', border: '1px solid #475569'}}>
            取消選取
          </button>
        </div>
      ) : null}

      <div style={{overflowX: 'auto', marginTop: '0.75rem'}} aria-busy={isLoading}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th align="left" style={{width: '2.5rem'}}>
                <input
                  type="checkbox"
                  aria-label="選取本頁全部產品"
                  checked={pageRows.length > 0 && pageRows.every((row) => selectedIds.has(row.id))}
                  disabled={pageRows.length === 0}
                  onChange={(e) =>
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      for (const row of pageRows) {
                        if (e.target.checked) next.add(row.id);
                        else next.delete(row.id);
                      }
                      return next;
                    })
                  }
                />
              </th>
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
            {isLoading && !hasLoaded ? (
              <tr>
                <td colSpan={8}>載入中...</td>
              </tr>
            ) : loadError && rows.length === 0 ? (
              <tr>
                <td colSpan={8}>載入失敗，請檢查 Supabase 設定與資料表。</td>
              </tr>
            ) : pageRows.length ? (
              pageRows.map((row) => (
                <tr key={row.id} style={row.id === form.id ? {background: 'rgba(29, 78, 216, 0.15)'} : undefined}>
                  <td>
                    <input type="checkbox" aria-label={`選取 ${row.modelNumber}`} checked={selectedIds.has(row.id)} onChange={() => toggleSelected(row.id)} />
                  </td>
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
                <td colSpan={8}>{rows.length ? '沒有符合條件的產品。' : '目前沒有產品資料。'}</td>
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
