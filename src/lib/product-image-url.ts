// 產品圖片路徑 → 網址（前台與後台共用，不可引入 Node 專用模組）

// 沒有圖片或圖片載入失敗時顯示的「No Image」圖（public/no-image.svg）
export const NO_IMAGE_URL = '/no-image.svg';

export function toLegacyAssetUrl(assetPath: string) {
  return `/${assetPath.replace(/^\/?images\//, 'legacy-assets/')}`;
}

export function toProductImageUrl(assetPath: string) {
  // 空白，或舊資料裡指向舊版預設圖 no-image.jpg 的路徑，一律改用 No Image 圖
  if (!assetPath || /(^|\/)no-image\.jpg$/.test(assetPath)) {
    return NO_IMAGE_URL;
  }

  if (/^https?:\/\//.test(assetPath)) {
    return assetPath;
  }

  if (assetPath.startsWith('/legacy-assets/')) {
    return assetPath;
  }

  if (assetPath.startsWith('/images/')) {
    return toLegacyAssetUrl(assetPath.slice(1));
  }

  if (assetPath.startsWith('images/')) {
    return toLegacyAssetUrl(assetPath);
  }

  return assetPath;
}
