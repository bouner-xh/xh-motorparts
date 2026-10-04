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
import { getBaseUrl, localeAlternates } from '@/lib/site';
import { localized } from '@/lib/localized-text';

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

  const baseUrl = getBaseUrl();
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
      siteName: localized(locale, { 'zh-TW': '協皇企業有限公司', 'zh-CN': '协皇企业有限公司', en: 'Xie Huang Enterprise Co., Ltd.' })
    },
    alternates: localeAlternates(locale, `/products/${categoryData.slug}/${encodeURIComponent(subCategoryData.slug)}/${encodedModel}`),
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
      <ProductSchema product={product} category={categoryData.slug} subCategory={subCategoryData.slug} locale={localeValue} />
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
          <h1 className="product-detail-title">{product.model}</h1>
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
            {/* 不公開精確庫存數字，只顯示供貨狀態（P3） */}
            {tProducts('availability')}：{product.stock > 0 ? tProducts('inStock') : tProducts('madeToOrder')}
          </p>

          {/* D15：數量與「加入詢價清單」放在規格、庫存下方，不用捲動就看得到 */}
          <InquiryForm
            productId={product.id}
            productModel={product.model}
            productName={product.name}
            categorySlug={categoryData.slug}
            subCategorySlug={subCategoryData.slug}
          />

          <p style={{ margin: 'auto 0 0' }}>
            <Link className="text-link" href={`/${localeValue}/products/${categoryData.slug}/${encodeURIComponent(subCategoryData.slug)}`}>
              ← {localized(localeValue, { 'zh-TW': '返回', 'zh-CN': '返回', en: 'Back to' })} {subCategoryData.name}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export const revalidate = 300;
