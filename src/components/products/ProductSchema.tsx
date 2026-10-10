import {getBaseUrl} from '@/lib/site';
import type {Product} from '@/data/products';
import {toProductImageUrl} from '@/lib/assets';
import {categoryNames, type CategoryKey, type Locale} from '@/lib/catalog';
import { localized } from '@/lib/localized-text';
import { encodeSegment } from '@/lib/url-segment';

function absoluteUrl(baseUrl: string, url: string) {
  return /^https?:\/\//.test(url) ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function ProductSchema({
  product,
  category,
  subCategory,
  locale
}: {
  product: Product;
  category: CategoryKey;
  // 產品網址包含子分類：/products/大分類/子分類/型號（P10）
  subCategory: string;
  locale: Locale;
}) {
  const baseUrl = getBaseUrl();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${product.model} ${product.name}`,
    sku: product.id,
    mpn: product.model,
    category: categoryNames[locale][category],
    description: `${product.name} ${product.specifications.join(', ')}`,
    // 所有圖片，主圖在最前面；網址一律用完整網址（搜尋引擎要求）
    image: (product.images?.length ? product.images : [product.image]).map((path) => absoluteUrl(baseUrl, toProductImageUrl(path))),
    // 適用車型與 OEM 對照料號（P8）：給搜尋引擎的產品資訊
    ...(product.vehicleModels?.length ? {isAccessoryOrSparePartFor: product.vehicleModels.map((name) => ({'@type': 'Product', name}))} : {}),
    ...(product.oemNumbers?.length ? {additionalProperty: product.oemNumbers.map((value) => ({'@type': 'PropertyValue', name: 'OEM number', value}))} : {}),
    brand: {
      '@type': 'Brand',
      name: localized(locale, { 'zh-TW': '協皇企業有限公司', 'zh-CN': '协皇企业有限公司', en: 'Xie Huang Enterprise Co., Ltd.' })
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'TWD',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/MadeToOrder',
      url: `${baseUrl}/${locale}/products/${encodeSegment(category)}/${encodeURIComponent(subCategory)}/${encodeURIComponent(product.model)}`
    }
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}} />;
}
