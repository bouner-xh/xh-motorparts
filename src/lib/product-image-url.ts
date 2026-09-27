// 產品圖片路徑 → 網址（前台與後台共用，不可引入 Node 專用模組）

export function toLegacyAssetUrl(assetPath: string) {
  return `/${assetPath.replace(/^\/?images\//, 'legacy-assets/')}`;
}

export function toProductImageUrl(assetPath: string) {
  if (!assetPath) {
    return toLegacyAssetUrl('images/no-image.jpg');
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
