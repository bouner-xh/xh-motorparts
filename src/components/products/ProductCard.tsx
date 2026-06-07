import Image from 'next/image';
import Link from 'next/link';
import type {Product} from '@/data/products';
import {toProductImageUrl} from '@/lib/assets';

export function ProductCard({
  product,
  href,
  specLabel,
  detailLabel
}: {
  product: Product;
  href: string;
  specLabel: string;
  detailLabel: string;
}) {
  return (
    <article className="product-card">
      <div className="product-card__image-wrap">
        <Image
          className="product-card__image"
          src={toProductImageUrl(product.image)}
          alt={`${product.model} ${product.name}`}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          unoptimized
        />
      </div>
      <div className="product-card__body">
        <p className="product-card__eyebrow">{product.name}</p>
        <h3 className="product-card__title">{product.model}</h3>
        <p className="muted product-card__specs">
          {specLabel}：{product.specifications.join(' / ')}
        </p>
        <Link className="text-link" href={href}>
          {detailLabel}
        </Link>
      </div>
    </article>
  );
}
