import {SafeImage} from '@/components/ui/SafeImage';
import Link from 'next/link';
import type {Product} from '@/data/products';
import {toProductImageUrl} from '@/lib/assets';
import type {Locale} from '@/lib/catalog';
import {ProductCardInquiryButton} from './ProductCardInquiryButton';

export function ProductCard({
  product,
  href,
  specLabel,
  detailLabel,
  locale,
  categorySlug,
  subCategorySlug,
  priority = false
}: {
  product: Product;
  href: string;
  specLabel: string;
  detailLabel: string;
  locale: Locale;
  categorySlug: string;
  subCategorySlug: string;
  // 列表最前面幾張圖片是畫面最大的內容（LCP），不能延遲載入
  priority?: boolean;
}) {
  return (
    <article className="product-card">
      <div className="product-card__image-wrap">
        <SafeImage
          className="product-card__image"
          src={toProductImageUrl(product.image)}
          alt={`${product.model} ${product.name}`}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          unoptimized
          priority={priority}
        />
      </div>
      <div className="product-card__body">
        <p className="product-card__eyebrow">{product.name}</p>
        <h3 className="product-card__title">{product.model}</h3>
        <p className="muted product-card__specs">
          {specLabel}：{product.specifications.join(' / ')}
        </p>
        <Link className="text-link product-card__detail" href={href}>
          {detailLabel}
        </Link>
        <ProductCardInquiryButton
          productId={product.id}
          productModel={product.model}
          productSlug={product.slug}
          productName={product.name}
          locale={locale}
          categorySlug={categorySlug}
          subCategorySlug={subCategorySlug}
        />
      </div>
    </article>
  );
}
