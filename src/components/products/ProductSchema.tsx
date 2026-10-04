import {getBaseUrl} from '@/lib/site';
import type {Product} from '@/data/products';
import {toProductImageUrl} from '@/lib/assets';
import {categoryNames, type CategoryKey, type Locale} from '@/lib/catalog';
import { localized } from '@/lib/localized-text';

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
    image: [toProductImageUrl(product.image)],
    brand: {
      '@type': 'Brand',
      name: localized(locale, { 'zh-TW': '協皇企業有限公司', 'zh-CN': '协皇企业有限公司', en: 'Xie Huang Enterprise Co., Ltd.' })
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'TWD',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/MadeToOrder',
      url: `${baseUrl}/${locale}/products/${category}/${encodeURIComponent(subCategory)}/${encodeURIComponent(product.model)}`
    }
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}} />;
}
