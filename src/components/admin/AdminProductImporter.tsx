'use client';

import { useState, useRef } from 'react';
import {
  IMPORT_CHUNK_SIZE,
  buildTemplateCsv,
  chunk,
  parseCsv,
  parseProductRows,
  rowsToObjects,
  type CellValue,
  type ParsedProductRow
} from '@/lib/product-import';

interface ImportRow extends ParsedProductRow {
  imageFile?: File | Blob;
  uploadedUrl?: string;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  message?: string;
}

type StepType = 'excel' | 'images' | 'match' | 'importing' | 'completed';

interface BatchResult {
  modelNumber: string;
  success: boolean;
  error?: string;
}

// 下載範例檔（CSV，Excel 可直接開啟）
function downloadTemplate() {
  const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'product-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminProductImporter() {
  const [step, setStep] = useState<StepType>('excel');
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [imageMap, setImageMap] = useState<Map<string, File | Blob>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [currentProgress, setCurrentProgress] = useState('');
  // 解析或匯入時的錯誤，顯示在畫面上（取代瀏覽器彈窗）
  const [errors, setErrors] = useState<string[]>([]);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const multiImagesInputRef = useRef<HTMLInputElement>(null);

  // 1. 解析 Excel / CSV 檔案（解析套件隨網站打包，不從外部網站載入，A1）
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrors([]);
    setCurrentProgress('正在讀取檔案...');

    try {
      const name = file.name.toLowerCase();
      let cells: CellValue[][];
      if (name.endsWith('.csv')) {
        cells = parseCsv(await file.text());
      } else if (name.endsWith('.xlsx')) {
        const { readSheet } = await import('read-excel-file/universal');
        cells = (await readSheet(await file.arrayBuffer())) as CellValue[][];
      } else {
        throw new Error('只支援 .xlsx 或 .csv；舊版 .xls 請在 Excel 選「另存新檔」存成 .xlsx');
      }

      const result = parseProductRows(rowsToObjects(cells));
      if (result.errors.length) {
        setErrors(result.errors);
        return;
      }
      setParsedRows(result.rows.map((row) => ({ ...row, status: 'pending' })));
      setStep('images');
    } catch (err) {
      setErrors([`解析檔案失敗：${err instanceof Error ? err.message : '未知錯誤'}`]);
    } finally {
      setIsProcessing(false);
      setCurrentProgress('');
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };


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
    setErrors([]);
    setCurrentProgress('正在解壓縮 ZIP 檔案...');

    try {
      const { default: JSZip } = await import('jszip');
      const contents = await JSZip.loadAsync(file);
      
      const newMap = new Map(imageMap);
      const promises: Promise<void>[] = [];

      contents.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return; // 略過資料夾
        
        // 取得檔名 (去除路徑字首)
        const fileName = relativePath.split('/').pop()?.toLowerCase();
        if (!fileName) return;

        if (/\.(jpe?g|png|webp)$/i.test(fileName)) {
          const p = zipEntry.async('blob').then((blob) => {
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
      setErrors([`解壓 ZIP 失敗：${err instanceof Error ? err.message : '未知錯誤'}`]);
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

    // 分批寫入資料庫：每批 IMPORT_CHUNK_SIZE 筆，避免一次太多筆超過伺服器執行時間（A4）
    // 某一批失敗時只標記該批，其他批次繼續
    const resultMap = new Map<string, BatchResult>();
    const batches = chunk(updatedRows, IMPORT_CHUNK_SIZE);
    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      const done = b * IMPORT_CHUNK_SIZE;
      setCurrentProgress(`正在寫入資料庫（${done + 1}–${done + batch.length} / ${updatedRows.length}）...`);
      try {
        const res = await fetch('/api/admin/products/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            products: batch.map((row) => ({
              categorySlug: row.categorySlug,
              categoryNameI18n: row.categoryNameI18n,
              subCategorySlug: row.subCategorySlug,
              subCategoryNameI18n: row.subCategoryNameI18n,
              modelNumber: row.modelNumber,
              nameI18n: row.nameI18n,
              specifications: row.specifications,
              stockQuantity: row.stockQuantity,
              isActive: row.isActive,
              imagePath: row.uploadedUrl || ''
            }))
          })
        });
        const resData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(resData.error || `HTTP ${res.status}`);
        (resData.results as BatchResult[] | undefined)?.forEach((r) => resultMap.set(r.modelNumber, r));
      } catch (err) {
        const message = `這一批寫入失敗：${err instanceof Error ? err.message : '未知錯誤'}`;
        batch.forEach((row) => resultMap.set(row.modelNumber, { modelNumber: row.modelNumber, success: false, error: message }));
      }
    }

    updatedRows.forEach((row) => {
      const r = resultMap.get(row.modelNumber);
      if (r?.success) {
        row.status = 'success';
        successCount++;
      } else {
        row.status = 'failed';
        row.message = [row.message, r?.error || '匯入失敗'].filter(Boolean).join('；');
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
    setIsProcessing(false);
    setCurrentProgress('');

    // 通知外部元件更新產品列表
    window.dispatchEvent(new Event('subcategories-updated'));
    window.dispatchEvent(new Event('categories-updated'));
  };

  const resetImporter = () => {
    setStep('excel');
    setParsedRows([]);
    setImageMap(new Map());
    setImportSummary(null);
    setErrors([]);
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

      {errors.length > 0 && (
        <div role="alert" data-testid="import-errors" style={{ padding: '1rem', background: 'rgba(127, 29, 29, 0.25)', border: '1px solid rgba(248, 113, 113, 0.4)', borderRadius: '6px', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 0.5rem 0', color: '#fca5a5', fontWeight: 'bold' }}>請修正以下問題後重新上傳：</p>
          <ul style={{ paddingLeft: '1.2rem', margin: 0, maxHeight: '180px', overflowY: 'auto' }}>
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 步驟 1: 上傳對照表 */}
      {step === 'excel' && (
        <div style={{ border: '2px dashed #334155', borderRadius: '8px', padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ margin: '0 0 1rem 0' }}>請選擇產品對照表（.xlsx 或 .csv）</p>
          <input
            type="file"
            ref={excelInputRef}
            accept=".xlsx,.csv"
            onChange={handleExcelUpload}
            disabled={isProcessing}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => excelInputRef.current?.click()} disabled={isProcessing}>
              選擇試算表檔案
            </button>
            <button type="button" onClick={downloadTemplate} style={{ background: '#334155' }}>
              下載範例檔
            </button>
          </div>
          
          <div style={{ marginTop: '1.5rem', textAlign: 'left', background: '#1e293b', padding: '1rem', borderRadius: '6px', fontSize: '0.8rem' }}>
            <strong style={{ color: '#fff' }}>欄位名稱參考說明：</strong>
            <ul style={{ paddingLeft: '1.2rem', color: '#94a3b8', margin: '0.5rem 0 0 0' }}>
              <li><code>model_number</code> (型號 - 必填/唯一鍵)</li>
              <li><code>name_zh_tw</code>, <code>name_zh_cn</code>, <code>name_en</code> (產品語系名稱)</li>
              <li><code>category_slug</code>, <code>category_name_zh_tw</code> (大分類代號及名稱 - 不存在時會自動新增)</li>
              <li><code>subcategory_slug</code>, <code>subcategory_name_zh_tw</code> (子分類代號及名稱 - 不存在時會自動新增)</li>
              <li><code>specifications</code> (規格，以逗號分隔，如 <code>STD, 47MM</code>)、<code>stock_quantity</code> (庫存，0 以上整數)</li>
              <li><code>is_active</code> (上架：TRUE／FALSE，空白視為上架)</li>
              <li><code>image_filename</code> (圖片檔名 - 用於與上傳的圖片進行比對匹配，如 <code>cyl-001.jpg</code>)</li>
              <li>已存在的型號會更新資料；名稱只更新有填寫的語言，沒填的語言保留原本內容</li>
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
