import path from 'node:path';
import {type CategoryKey, type Locale, categoryNames} from '@/lib/catalog';
import {toLegacyAssetUrl, toProductImageUrl} from '@/lib/product-image-url';

// 已挑好的分類封面（檔案在 images/covers）；沒有挑封面的分類改用該分類第一個產品的照片
const categoryCoverFileNames: Record<string, string> = {
  cylinder: 'cylinder.jpg',
  chain: 'chain.jpg',
  clutch: 'clutch.jpg',
  'clutch-housing': 'clutch.jpg',
  piston: 'piston.jpg',
  valve: 'valve.jpg',
  sprocket: 'sprocket.jpg',
  brake: 'brake.jpg',
  'oil-seal': 'oil_seal.jpg',
  cable: 'cable.jpg'
};

// 圖片網址轉換移到 product-image-url.ts（不依賴 node:path，後台前端元件也能使用）
export {toLegacyAssetUrl, toProductImageUrl} from '@/lib/product-image-url';

// 封面順序：已挑好的封面 → 該分類第一個產品的照片 → 預設圖
export function getCategoryCoverUrl(category: CategoryKey, productImage?: string) {
  const fileName = categoryCoverFileNames[category];
  if (fileName) return `/legacy-assets/covers/${fileName}`;
  if (productImage) return toProductImageUrl(productImage);
  return toLegacyAssetUrl('images/no-image.jpg');
}

export function getLegacyImagesRoot() {
  return path.join(process.cwd(), 'images');
}

export function getCategoryHeroLabel(locale: Locale, category: CategoryKey) {
  return categoryNames[locale][category] || category;
}
