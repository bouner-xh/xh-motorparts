'use client';

import { useState, useRef, useCallback } from 'react';
import type { Locale } from '@/lib/catalog';

interface ParsedProductRow {
  categorySlug: string;
  categoryNameZhTw: string;
  categoryNameZhCn: string;
  categoryNameEn: string;
  subCategorySlug: string;
  subCategoryNameZhTw: string;
  subCategoryNameZhCn: string;
  subCategoryNameEn: string;
  modelNumber: string;
  nameZhTw: string;
  nameZhCn: string;
  nameEn: string;
  specifications: string[];
  stockQuantity: number;
  isActive: boolean;
  imageFilename: string;
  // 以下為處理過程中的狀態
  imageFile?: File | Blob;
  uploadedUrl?: string;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  message?: string;
}

type StepType = 'excel' | 'images' | 'match' | 'importing' | 'completed';

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Cannot load script on server side'));
      return;
    }
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

export function AdminProductImporter({ locale }: { locale: Locale }) {
  const [step, setStep] = useState<StepType>('excel');
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [imageMap, setImageMap] = useState<Map<string, File | Blob>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [currentProgress, setCurrentProgress] = useState('');

  const excelInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const multiImagesInputRef = useRef<HTMLInputElement>(null);

  // 1. 解析 Excel / CSV 檔案
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setCurrentProgress('正在載入解析器...');

    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        parseCsv(text);
      } else {
        // 動態載入 SheetJS XLSX 庫
        await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
        const XLSX = (window as any).XLSX;
        if (!XLSX) throw new Error('SheetJS XLSX 載入失敗');

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
        
        parseJsonRows(jsonData);
      }
      setStep('images');
    } catch (err) {
      alert(`解析檔案失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setIsProcessing(false);
      setCurrentProgress('');
    }
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) throw new Error('CSV 檔案行數不足');
    
    // 取得表頭
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      // 簡單的 CSV 分割
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const rowObj: Record<string, any> = {};
      headers.forEach((header, index) => {
        rowObj[header] = values[index] || '';
      });
      rows.push(rowObj);
    }
    parseJsonRows(rows);
  };

  const parseJsonRows = (jsonData: Record<string, any>[]) => {
    const tempRows: ParsedProductRow[] = jsonData.map((r, index) => {
      const modelNumber = String(r.model_number || r['型號'] || '').trim();
      if (!modelNumber) return null;

      // 規格處理 (可能為逗號分隔字串或陣列)
      const specRaw = r.specifications || r['規格'] || '';
      const specs = Array.isArray(specRaw)
        ? specRaw
        : String(specRaw).split(/[,，]/).map(s => s.trim()).filter(Boolean);

      return {
        categorySlug: String(r.category_slug || r['大分類代號'] || '').trim().toLowerCase(),
        categoryNameZhTw: String(r.category_name_zh_tw || r['大分類名稱_繁中'] || '').trim(),
        categoryNameZhCn: String(r.category_name_zh_cn || r['大分類名稱_簡中'] || '').trim(),
        categoryNameEn: String(r.category_name_en || r['大分類名稱_英文'] || '').trim(),
        
        subCategorySlug: String(r.subcategory_slug || r['子分類代號'] || '').trim().toLowerCase(),
        subCategoryNameZhTw: String(r.subcategory_name_zh_tw || r['子分類名稱_繁中'] || '').trim(),
        subCategoryNameZhCn: String(r.subcategory_name_zh_cn || r['子分類名稱_簡中'] || '').trim(),
        subCategoryNameEn: String(r.subcategory_name_en || r['子分類名稱_英文'] || '').trim(),

        modelNumber,
        nameZhTw: String(r.name_zh_tw || r['產品名稱_繁中'] || '').trim(),
        nameZhCn: String(r.name_zh_cn || r['產品名稱_簡中'] || '').trim(),
        nameEn: String(r.name_en || r['產品名稱_英文'] || '').trim(),
        specifications: specs,
        stockQuantity: Number(r.stock_quantity || r['庫存'] || 0),
        isActive: r.is_active !== undefined ? Boolean(r.is_active) : true,
        imageFilename: String(r.image_filename || r['圖片檔名'] || '').trim(),
        status: 'pending'
      };
    }).filter((r): r is ParsedProductRow => r !== null);

    if (tempRows.length === 0) {
      throw new Error('未在檔案中找到任何有效產品行 (請確認包含 model_number 欄位)');
    }
    setParsedRows(tempRows);
  };

  // 2. 雙軌圖片上傳A: 選擇多個圖片檔案
  const handleMultiImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newMap = new Map(imageMap);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newMap.set(file.name.toLowerCase(), file);
    }
    setImageMap(newMap);
    setStep('match');
  };

  // 2. 雙軌圖片上傳B: 解析 ZIP 檔案
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setCurrentProgress('正在解壓縮 ZIP 檔案...');

    try {
      await loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
      const JSZip = (window as any).JSZip;
      if (!JSZip) throw new Error('JSZip 載入失敗');

      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      const newMap = new Map(imageMap);
      const promises: Promise<void>[] = [];

      contents.forEach((relativePath: string, zipEntry: any) => {
        if (zipEntry.dir) return; // 略過資料夾
        
        // 取得檔名 (去除路徑字首)
        const fileName = relativePath.split('/').pop()?.toLowerCase();
        if (!fileName) return;

        if (/\.(jpe?g|png|webp)$/i.test(fileName)) {
          const p = zipEntry.async('blob').then((blob: Blob) => {
            const fileObj = new File([blob], fileName, { type: getMimeType(fileName) });
            newMap.set(fileName, fileObj);
          });
          promises.push(p);
        }
      });

      await Promise.all(promises);
      setImageMap(newMap);
      setStep('match');
    } catch (err) {
      alert(`解壓 ZIP 失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setIsProcessing(false);
      setCurrentProgress('');
    }
  };

  const getMimeType = (fileName: string) => {
    if (/\.png$/i.test(fileName)) return 'image/png';
    if (/\.webp$/i.test(fileName)) return 'image/webp';
    return 'image/jpeg';
  };

  // 3. 執行圖片比對並上傳 & 批量匯入
  const startImportFlow = async () => {
    setIsProcessing(true);
    setStep('importing');

    // 複製一份 parsedRows 以在畫面上更新進度與狀態
    const updatedRows = [...parsedRows];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < updatedRows.length; i++) {
      const row = updatedRows[i];
      const matchName = row.imageFilename.toLowerCase();
      const matchedFile = imageMap.get(matchName);

      if (matchedFile) {
        row.status = 'uploading';
        setParsedRows([...updatedRows]);
        setCurrentProgress(`正在上傳產品 ${row.modelNumber} 的圖片 (${i + 1}/${updatedRows.length})...`);

        try {
          const formData = new FormData();
          formData.append('file', matchedFile);

          const uploadRes = await fetch('/api/admin/upload-image', {
            method: 'POST',
            body: formData
          });

          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadData.error || '圖片上傳失敗');

          row.uploadedUrl = uploadData.imagePath;
        } catch (err) {
          row.message = `圖片失敗: ${err instanceof Error ? err.message : '未知'}`;
        }
      }
    }

    setCurrentProgress('正在寫入資料庫...');
    
    // 分批將產品資料寫入資料庫
    // 我們可以將所有產品整合成一個 batch 請求傳送給 `/api/admin/products/batch`
    const batchPayload = {
      products: updatedRows.map(row => ({
        categorySlug: row.categorySlug,
        categoryNameZhTw: row.categoryNameZhTw,
        categoryNameZhCn: row.categoryNameZhCn,
        categoryNameEn: row.categoryNameEn,
        subCategorySlug: row.subCategorySlug,
        subCategoryNameZhTw: row.subCategoryNameZhTw,
        subCategoryNameZhCn: row.subCategoryNameZhCn,
        subCategoryNameEn: row.subCategoryNameEn,
        modelNumber: row.modelNumber,
        nameZhTw: row.nameZhTw,
        nameZhCn: row.nameZhCn,
        nameEn: row.nameEn,
        specifications: row.specifications,
        stockQuantity: row.stockQuantity,
        isActive: row.isActive,
        imagePath: row.uploadedUrl || ''
      }))
    };

    try {
      const res = await fetch('/api/admin/products/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload)
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || '批次匯入失敗');

      // 更新每行的匯入狀態
      const resultMap = new Map<string, { success: boolean; error?: string }>();
      if (resData.results) {
        resData.results.forEach((r: any) => {
          resultMap.set(r.modelNumber, r);
        });
      }

      updatedRows.forEach(row => {
        const r = resultMap.get(row.modelNumber);
        if (r?.success) {
          row.status = 'success';
          successCount++;
        } else {
          row.status = 'failed';
          row.message = r?.error || '匯入失敗';
          failedCount++;
        }
      });

      setImportSummary({
        total: updatedRows.length,
        success: successCount,
        failed: failedCount
      });
      setParsedRows(updatedRows);
      setStep('completed');
      
      // 通知外部元件更新產品列表
      window.dispatchEvent(new Event('subcategories-updated'));
      window.dispatchEvent(new Event('categories-updated'));
    } catch (err) {
      alert(`批次寫入資料庫失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
      setStep('match');
    } finally {
      setIsProcessing(false);
      setCurrentProgress('');
    }
  };

  const resetImporter = () => {
    setStep('excel');
    setParsedRows([]);
    setImageMap(new Map());
    setImportSummary(null);
    if (excelInputRef.current) excelInputRef.current.value = '';
    if (zipInputRef.current) zipInputRef.current.value = '';
    if (multiImagesInputRef.current) multiImagesInputRef.current.value = '';
  };

  return (
    <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}>
      <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>📦</span> 智能批量產品匯入工具
      </h3>
      <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        透過 Excel/CSV 檔案與產品圖片進行關聯匹配，自動建立缺少的大分類和子目錄，並批量上架產品。
      </p>

      {/* 步驟指南 */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
        <div style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: step === 'excel' ? '#2563eb' : '#1e293b', color: step === 'excel' ? '#fff' : '#94a3b8' }}>
          Step 1: 上傳對照表
        </div>
        <div style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: step === 'images' ? '#2563eb' : '#1e293b', color: step === 'images' ? '#fff' : '#94a3b8' }}>
          Step 2: 上傳圖片檔 (ZIP/多檔)
        </div>
        <div style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: step === 'match' || step === 'importing' ? '#2563eb' : '#1e293b', color: step === 'match' || step === 'importing' ? '#fff' : '#94a3b8' }}>
          Step 3: 匹配與匯入
        </div>
      </div>

      {isProcessing && (
        <div style={{ padding: '1rem', background: '#1e293b', color: '#60a5fa', borderRadius: '6px', marginBottom: '1.5rem', textAlign: 'center' }}>
          <span className="spinner" style={{ marginRight: '0.5rem' }}>⏳</span>
          {currentProgress}
        </div>
      )}

      {/* 步驟 1: 上傳對照表 */}
      {step === 'excel' && (
        <div style={{ border: '2px dashed #334155', borderRadius: '8px', padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ margin: '0 0 1rem 0' }}>請選擇產品對照表 (.xlsx, .xls 或 .csv)</p>
          <input
            type="file"
            ref={excelInputRef}
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelUpload}
            disabled={isProcessing}
            style={{ display: 'none' }}
          />
          <button type="button" onClick={() => excelInputRef.current?.click()} disabled={isProcessing}>
            選擇試算表檔案
          </button>
          
          <div style={{ marginTop: '1.5rem', textAlign: 'left', background: '#1e293b', padding: '1rem', borderRadius: '6px', fontSize: '0.8rem' }}>
            <strong style={{ color: '#fff' }}>欄位名稱參考說明：</strong>
            <ul style={{ paddingLeft: '1.2rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>
              <li><code>model_number</code> (型號 - 必填/唯一鍵)</li>
              <li><code>name_zh_tw</code>, <code>name_zh_cn</code>, <code>name_en</code> (產品語系名稱)</li>
              <li><code>category_slug</code>, <code>category_name_zh_tw</code> (大分類代號及名稱 - 不存在時會自動新增)</li>
              <li><code>subcategory_slug</code>, <code>subcategory_name_zh_tw</code> (子分類代號及名稱 - 不存在時會自動新增)</li>
              <li><code>image_filename</code> (圖片檔名 - 用於與上傳的圖片進行比對匹配，如 <code>cyl-001.jpg</code>)</li>
            </ul>
          </div>
        </div>
      )}

      {/* 步驟 2: 上傳圖片檔 */}
      {step === 'images' && (
        <div>
          <p style={{ color: '#fff', margin: '0 0 1rem 0' }}>已成功解析對照表，共計 <strong style={{ color: '#60a5fa' }}>{parsedRows.length}</strong> 筆產品。請提供對應的圖片檔案：</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* 軌道 A: ZIP 檔案 */}
            <div style={{ border: '2px dashed #334155', borderRadius: '8px', padding: '2rem', textAlign: 'center' }}>
              <h4>📦 方案 A: 上傳 ZIP 壓縮檔</h4>
              <p className="muted" style={{ fontSize: '0.8rem', margin: '0.5rem 0 1.5rem 0' }}>包含所有對應圖片檔名的壓縮檔 (支援 JPG, PNG, WEBP)</p>
              <input
                type="file"
                ref={zipInputRef}
                accept=".zip"
                onChange={handleZipUpload}
                disabled={isProcessing}
                style={{ display: 'none' }}
              />
              <button type="button" onClick={() => zipInputRef.current?.click()} disabled={isProcessing}>
                選擇 ZIP 壓縮檔
              </button>
            </div>

            {/* 軌道 B: 瀏覽器多選 */}
            <div style={{ border: '2px dashed #334155', borderRadius: '8px', padding: '2rem', textAlign: 'center' }}>
              <h4>🖼️ 方案 B: 瀏覽器多選圖片</h4>
              <p className="muted" style={{ fontSize: '0.8rem', margin: '0.5rem 0 1.5rem 0' }}>直接選取電腦資料夾內的多張圖片檔案 (支援多選)</p>
              <input
                type="file"
                ref={multiImagesInputRef}
                accept="image/*"
                multiple
                onChange={handleMultiImagesSelect}
                disabled={isProcessing}
                style={{ display: 'none' }}
              />
              <button type="button" onClick={() => multiImagesInputRef.current?.click()} disabled={isProcessing}>
                選取多張圖片
              </button>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button type="button" onClick={() => setStep('match')} style={{ background: '#334155' }}>
              略過圖片，直接進入匹配步驟
            </button>
          </div>
        </div>
      )}

      {/* 步驟 3: 匹配與預覽列表 */}
      {(step === 'match' || step === 'importing') && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{ margin: 0 }}>
              圖片庫已載入 <strong style={{ color: '#10b981' }}>{imageMap.size}</strong> 張圖片。請確認以下產品對照匹配狀態：
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={startImportFlow} disabled={isProcessing || parsedRows.length === 0}>
                {step === 'importing' ? '匯入中...' : '確認無誤，開始匯入'}
              </button>
              <button type="button" onClick={resetImporter} disabled={isProcessing} style={{ background: '#334155' }}>
                重新開始
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #1e293b', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead style={{ background: '#1e293b', position: 'sticky', top: 0 }}>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>型號</th>
                  <th style={{ padding: '0.5rem' }}>名稱 (繁中)</th>
                  <th style={{ padding: '0.5rem' }}>大分類</th>
                  <th style={{ padding: '0.5rem' }}>子分類</th>
                  <th style={{ padding: '0.5rem' }}>圖片檔名</th>
                  <th style={{ padding: '0.5rem' }}>匹配狀態</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row) => {
                  const hasImage = imageMap.has(row.imageFilename.toLowerCase());
                  return (
                    <tr key={row.modelNumber} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '0.5rem', color: '#fff' }}>{row.modelNumber}</td>
                      <td style={{ padding: '0.5rem' }}>{row.nameZhTw}</td>
                      <td style={{ padding: '0.5rem' }}>{row.categoryNameZhTw || row.categorySlug}</td>
                      <td style={{ padding: '0.5rem' }}>{row.subCategoryNameZhTw || row.subCategorySlug}</td>
                      <td style={{ padding: '0.5rem' }}>{row.imageFilename || <span className="muted">無</span>}</td>
                      <td style={{ padding: '0.5rem' }}>
                        {row.status === 'success' && <span style={{ color: '#10b981' }}>已匯入</span>}
                        {row.status === 'failed' && <span style={{ color: '#ef4444' }}>失敗: {row.message}</span>}
                        {row.status === 'uploading' && <span style={{ color: '#60a5fa' }}>上傳圖片中...</span>}
                        {row.status === 'pending' && (
                          hasImage ? (
                            <span style={{ color: '#34d399' }}>✓ 圖片已匹配</span>
                          ) : row.imageFilename ? (
                            <span style={{ color: '#fbbf24' }}>⚠ 圖片未上傳 (將無圖)</span>
                          ) : (
                            <span className="muted">無指定圖片</span>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 步驟 4: 匯入完成報告 */}
      {step === 'completed' && importSummary && (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <h4 style={{ color: '#10b981', fontSize: '1.4rem', margin: '0 0 0.5rem 0' }}>🎉 批次匯入作業已完成</h4>
          <p style={{ margin: '0 0 1.5rem 0' }}>
            共處理 <strong style={{ color: '#fff' }}>{importSummary.total}</strong> 筆產品，
            其中成功 <strong style={{ color: '#10b981' }}>{importSummary.success}</strong> 筆，
            失敗 <strong style={{ color: '#ef4444' }}>{importSummary.failed}</strong> 筆。
          </p>

          {importSummary.failed > 0 && (
            <div style={{ textAlign: 'left', background: '#1e293b', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', maxHeight: '180px', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#fca5a5', fontWeight: 'bold' }}>錯誤項目列表：</p>
              <ul style={{ paddingLeft: '1.2rem', color: '#94a3b8', margin: 0 }}>
                {parsedRows
                  .filter(r => r.status === 'failed')
                  .map(r => (
                    <li key={r.modelNumber}>
                      <strong>{r.modelNumber}</strong>: {r.message}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <button type="button" onClick={resetImporter}>
            繼續匯入其他檔案
          </button>
        </div>
      )}
    </div>
  );
}
