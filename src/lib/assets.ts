import path from 'node:path';
import {type CategoryKey, type Locale, categoryNames} from '@/lib/catalog';

const categoryCoverFileNames: Record<CategoryKey, string> = {
  cylinder: 'cylinder.jpg',
  chain: 'chain.jpg',
  clutch: 'clutch.jpg',
  piston: 'piston.jpg',
  valve: 'valve.jpg',
  sprocket: 'sprocket.jpg',
  brake: 'brake.jpg',
  'oil-seal': 'oil_seal.jpg',
  cable: 'cable.jpg'
};

// 圖片網址轉換移到 product-image-url.ts（不依賴 node:path，後台前端元件也能使用）
export {toLegacyAssetUrl, toProductImageUrl} from '@/lib/product-image-url';

export function getCategoryCoverUrl(category: CategoryKey) {
  const fileName = categoryCoverFileNames[category] || 'no-image.jpg';
  return `/legacy-assets/covers/${fileName}`;
}

export function getLegacyImagesRoot() {
  return path.join(process.cwd(), 'images');
}

export function getCategoryHeroLabel(locale: Locale, category: CategoryKey) {
  return categoryNames[locale][category] || category;
}
