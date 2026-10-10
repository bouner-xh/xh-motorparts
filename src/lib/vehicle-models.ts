// 車型清單（P8）：資料庫還沒執行更新語法時，程式要能照常運作

export const VEHICLE_NAME_MAX = 100;

export const VEHICLE_SETUP_MESSAGE =
  '資料庫還沒有「車型清單」與「OEM 對照料號」欄位。請先在 Supabase 的 SQL Editor 執行 supabase/migrations/20261010_vehicle_models_oem.sql，再重新儲存。';

// 車型名稱：頭尾空白去掉、連續空白合成一個
export function normalizeVehicleName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

// 判斷是不是「資料表或欄位還沒建立」的資料庫錯誤（缺少 vehicle_models、product_vehicle_models 或 products.oem_numbers）
export function isMissingVehicleSchema(error: {code?: string; message?: string} | null | undefined): boolean {
  if (!error) return false;
  const message = error.message || '';
  if (['42P01', 'PGRST205', 'PGRST200'].includes(error.code || '')) return /vehicle_models|product_vehicle_models/.test(message) || error.code === 'PGRST205';
  if (['42703', 'PGRST204'].includes(error.code || '')) return /oem_numbers/.test(message);
  return /vehicle_models|product_vehicle_models|oem_numbers/.test(message) && /(does not exist|schema cache)/i.test(message);
}
