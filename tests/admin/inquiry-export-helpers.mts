// 測試輔助：匯出函式與簡易 CSV 讀取（重用匯入工具的 CSV 解析器）
export * from '../../src/lib/inquiry-export.ts';
import { parseCsv } from '../../src/lib/product-import.ts';
export const parseCsvForTest = (text: string) => parseCsv(text);
