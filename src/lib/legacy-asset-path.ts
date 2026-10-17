import path from 'node:path';

// 舊版靜態圖片（images/ 目錄）的路徑檢查（SX-14）
// 只放行白名單副檔名；路徑必須落在圖片根目錄「之內」（以目錄加分隔符比對，不是單純 startsWith）
export const LEGACY_ASSET_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp'
};

// 回傳可讀取的完整檔案路徑；不安全或副檔名不在白名單時回傳 null
export function resolveLegacyAssetPath(root: string, segments: string[]): string | null {
  if (!segments.length) return null;
  for (const segment of segments) {
    // Next.js 已把 %2e%2e、%2f 解碼，所以這裡要擋掉 ..、含斜線／反斜線／空字元的片段
    if (!segment || segment === '.' || segment === '..') return null;
    if (/[\\/\0]/.test(segment)) return null;
  }
  const resolvedRoot = path.resolve(root);
  const filePath = path.resolve(resolvedRoot, ...segments);
  if (!filePath.startsWith(resolvedRoot + path.sep)) return null;
  if (!(path.extname(filePath).toLowerCase() in LEGACY_ASSET_MIME_TYPES)) return null;
  return filePath;
}
