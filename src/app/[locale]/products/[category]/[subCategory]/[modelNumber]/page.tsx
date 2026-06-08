import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/products/Breadcrumb';
import { InquiryForm } from '@/components/products/InquiryForm';
import { ProductSchema } from '@/components/products/ProductSchema';
import { toProductImageUrl } from '@/lib/assets';
import { getCatalogProduct, getCategoryBySlug, getSubCategoryBySlug } from '@/lib/catalog-service';
import { locales, type Locale, type CategoryKey } from '@/lib/catalog';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; subCategory: string; modelNumber: string }>;
}): Promise<Metadata> {
  const { locale, category, subCategory, modelNumber } = await params;

  if (!locales.includes(locale as Locale)) {
    return {};
  }

  const localeValue = locale as Locale;
  const categoryData = await getCategoryBySlug(category, localeValue);
  if (!categoryData) return {};

  const decodedSubCategory = decodeURIComponent(subCategory);
  
  const subCategoryData = await getSubCategoryBySlug(categoryData.slug, decodedSubCategory, localeValue);
  if (!subCategoryData) return {};

  const product = await getCatalogProduct(categoryData.slug, decodeURIComponent(modelNumber), localeValue);
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
      url: `${baseUrl}/${locale}/products/${categoryData.slug}/${encodeURIComponent(subCategoryData.slug)}/${encodedModel}`,
      images: [toProductImageUrl(product.image)],
      locale,
      siteName: locale === 'en' ? 'Xie Huang Enterprise Co., Ltd.' : '協皇企業有限公司'
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/products/${categoryData.slug}/${encodeURIComponent(subCategoryData.slug)}/${encodedModel}`,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; category: string; subCategory: string; modelNumber: string }>;
}) {
  const { locale, category, subCategory, modelNumber } = await params;
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const localeValue = locale as Locale;
  setRequestLocale(localeValue);

  const decodedModel = decodeURIComponent(modelNumber);
  const decodedSubCategory = decodeURIComponent(subCategory);

  const [categoryData, product, subCategoryData, tProducts, tNav] = await Promise.all([
    getCategoryBySlug(category, localeValue),
    getCatalogProduct(category as CategoryKey, decodedModel, localeValue),
    getSubCategoryBySlug(category as CategoryKey, decodedSubCategory, localeValue),
    getTranslations({ locale: localeValue, namespace: 'products' }),
    getTranslations({ locale: localeValue, namespace: 'nav' })
  ]);

  if (!categoryData || !product || !subCategoryData) {
    notFound();
  }

  return (
    <main>
      <ProductSchema product={product} category={categoryData.slug} locale={localeValue} />
      <Breadcrumb
        items={[
          { label: tNav('home'), href: `/${localeValue}` },
          { label: tNav('products'), href: `/${localeValue}/products` },
          { label: categoryData.name, href: `/${localeValue}/products/${categoryData.slug}` },
          { label: subCategoryData.name, href: `/${localeValue}/products/${categoryData.slug}/${encodeURIComponent(subCategoryData.slug)}` },
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
            {tProducts('category')}：{categoryData.name}
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
              <Link className="text-link" href={`/${localeValue}/products/${categoryData.slug}/${encodeURIComponent(subCategoryData.slug)}`}>
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
