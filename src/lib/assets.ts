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

export function toLegacyAssetUrl(assetPath: string) {
  return `/${assetPath.replace(/^\/?images\//, 'legacy-assets/')}`;
}

export function getCategoryCoverUrl(category: CategoryKey) {
  return `/legacy-assets/covers/${categoryCoverFileNames[category]}`;
}

export function getLegacyImagesRoot() {
  return path.join(process.cwd(), 'images');
}

export function getCategoryHeroLabel(locale: Locale, category: CategoryKey) {
  return categoryNames[locale][category];
}
