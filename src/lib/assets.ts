import path from 'node:path';
import {type CategoryKey, type Locale, categoryNames} from '@/lib/catalog';
import {NO_IMAGE_URL, toProductImageUrl} from '@/lib/product-image-url';

// 圖片網址轉換移到 product-image-url.ts（不依賴 node:path，後台前端元件也能使用）
export {toLegacyAssetUrl, toProductImageUrl} from '@/lib/product-image-url';

// 分類封面圖：有圖片網址就用，沒有用預設圖（封面由後台上傳，或用該分類第一個產品的照片）
export function getCategoryCoverUrl(_category: CategoryKey, coverImage?: string) {
  return coverImage ? toProductImageUrl(coverImage) : NO_IMAGE_URL;
}

export function getLegacyImagesRoot() {
  return path.join(process.cwd(), 'images');
}

export function getCategoryHeroLabel(locale: Locale, category: CategoryKey) {
  return categoryNames[locale][category] || category;
}
