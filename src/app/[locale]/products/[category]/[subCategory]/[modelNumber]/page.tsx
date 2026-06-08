import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/products/Breadcrumb';
import { getAllProducts } from '@/data/products';
import { InquiryForm } from '@/components/products/InquiryForm';
import { ProductSchema } from '@/components/products/ProductSchema';
import { toProductImageUrl } from '@/lib/assets';
import { getCatalogProduct, getSubCategoryBySlug } from '@/lib/catalog-service';
import { categoryKeys, categoryNames, locales, type CategoryKey, type Locale } from '@/lib/catalog';
import { getBaseUrl } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; subCategory: string; modelNumber: string }>;
}): Promise<Metadata> {
  const { locale, category, subCategory, modelNumber } = await params;

  if (!locales.includes(locale as Locale) || !categoryKeys.includes(category as CategoryKey)) {
    return {};
  }

  const categoryValue = category as CategoryKey;
  const decodedSubCategory = decodeURIComponent(subCategory);
  
  const subCategoryData = await getSubCategoryBySlug(categoryValue, decodedSubCategory, locale as Locale);
  if (!subCategoryData) return {};

  const product = await getCatalogProduct(categoryValue, decodeURIComponent(modelNumber), locale as Locale);
  if (!product) {
    return {};
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xh-motorparts.com';
  const encodedModel = encodeURIComponent(product.model);

  return {
    title: `${product.model} | ${product.name}`,
    description: `${product.model} ${product.name}，${product.specifications.join(', ')}`,
    openGraph: {
      type: 'website',
      title: `${product.model} | ${product.name}`,
      description: `${product.model} ${product.name}，${product.specifications.join(', ')}`,
      url: `${baseUrl}/${locale}/products/${categoryValue}/${encodeURIComponent(subCategoryData.slug)}/${encodedModel}`,
      images: [toProductImageUrl(product.image)],
      locale,
      siteName: locale === 'en' ? 'Xie Huang Enterprise Co., Ltd.' : '協皇企業有限公司'
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/products/${categoryValue}/${encodeURIComponent(subCategoryData.slug)}/${encodedModel}`,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; category: string; subCategory: string; modelNumber: string }>;
}) {
  const { locale, category, subCategory, modelNumber } = await params;
  if (!locales.includes(locale as Locale) || !categoryKeys.includes(category as CategoryKey)) {
    notFound();
  }

  const localeValue = locale as Locale;
  const categoryValue = category as CategoryKey;
  const decodedModel = decodeURIComponent(modelNumber);
  const product = await getCatalogProduct(categoryValue, decodedModel, localeValue);
  setRequestLocale(localeValue);
  const tProducts = await getTranslations({ locale: localeValue, namespace: 'products' });
  const tNav = await getTranslations({ locale: localeValue, namespace: 'nav' });

  const decodedSubCategory = decodeURIComponent(subCategory);
  const subCategoryData = await getSubCategoryBySlug(categoryValue, decodedSubCategory, localeValue);

  if (!product || !subCategoryData) {
    notFound();
  }

  const baseUrl = getBaseUrl();
  const shareUrl = `${baseUrl}/${localeValue}/products/${categoryValue}/${encodeURIComponent(subCategoryData.slug)}/${encodeURIComponent(product.model)}`;

  return (
    <main>
      <ProductSchema product={product} category={categoryValue} locale={localeValue} />
      <Breadcrumb
        items={[
          { label: tNav('home'), href: `/${localeValue}` },
          { label: tNav('products'), href: `/${localeValue}/products` },
          { label: categoryNames[localeValue][categoryValue], href: `/${localeValue}/products/${categoryValue}` },
          { label: subCategoryData.name, href: `/${localeValue}/products/${categoryValue}/${encodeURIComponent(subCategoryData.slug)}` },
          { label: product.model },
        ]}
      />

      <section className="detail-grid">
        <article className="card detail-media">
          <Image
            src={toProductImageUrl(product.image)}
            alt={`${product.model} ${product.name}`}
            width={900}
            height={900}
            unoptimized
          />
        </article>

        <div className="detail-info card">
          <h2>{product.model}</h2>
          <p>{product.name}</p>
          <p className="muted">
            {tProducts('category')}：{categoryNames[localeValue][categoryValue]}
          </p>
          <div className="spec-list">
            {product.specifications.map((spec: string) => (
              <span key={spec} className="spec-chip">
                {spec}
              </span>
            ))}
          </div>
          <p className="muted">
            {tProducts('stock')}：{product.stock}
          </p>

          <div style={{ marginTop: 'auto' }}>
            <p style={{ margin: 0 }}>
              <Link className="text-link" href={`/${localeValue}/products/${categoryValue}/${encodeURIComponent(subCategoryData.slug)}`}>
                ← 返回 {subCategoryData.name}
              </Link>
            </p>
            <div style={{ marginTop: '-0.4rem' }}>
              <InquiryForm productModel={product.model} productName={product.name} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
