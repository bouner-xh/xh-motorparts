import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  categoryDescriptions,
  categoryKeys,
  categoryNames,
  locales,
  type CategoryKey,
  type Locale,
} from '@/lib/catalog';
import { getCategoryProducts, getSubCategoryBySlug } from '@/lib/catalog-service';
import { Breadcrumb } from '@/components/products/Breadcrumb';
import { CategorySidebar } from '@/components/products/CategorySidebar';
import { ProductCard } from '@/components/products/ProductCard';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; subCategory: string }>;
}): Promise<Metadata> {
  const { locale, category, subCategory } = await params;
  if (!locales.includes(locale as Locale) || !categoryKeys.includes(category as CategoryKey)) {
    return {};
  }

  const localeValue = locale as Locale;
  const categoryValue = category as CategoryKey;
  const decoded = decodeURIComponent(subCategory);
  const subCategoryData = await getSubCategoryBySlug(categoryValue, decoded, localeValue);
  if (!subCategoryData) return {};

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xh-motorparts.com';
  const title = `${subCategoryData.name} | ${categoryNames[localeValue][categoryValue]}`;
  const description = `${categoryDescriptions[localeValue][categoryValue]} - ${subCategoryData.name}`;

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${baseUrl}/${locale}/products/${category}/${encodeURIComponent(subCategoryData.slug)}`,
      locale,
      siteName: locale === 'en' ? 'Xie Huang Enterprise Co., Ltd.' : '協皇企業有限公司',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/products/${category}/${encodeURIComponent(subCategoryData.slug)}`,
    },
  };
}

export default async function SubCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string; subCategory: string }>;
}) {
  const { locale, category, subCategory } = await params;
  if (!locales.includes(locale as Locale) || !categoryKeys.includes(category as CategoryKey)) {
    notFound();
  }

  const localeValue = locale as Locale;
  const categoryValue = category as CategoryKey;
  setRequestLocale(localeValue);
  
  const decodedSubCategory = decodeURIComponent(subCategory);
  const subCategoryData = await getSubCategoryBySlug(categoryValue, decodedSubCategory, localeValue);
  if (!subCategoryData) {
    notFound();
  }

  const rows = await getCategoryProducts(categoryValue, subCategoryData.id, localeValue);
  const tProducts = await getTranslations({ locale: localeValue, namespace: 'products' });
  const tNav = await getTranslations({ locale: localeValue, namespace: 'nav' });

  return (
    <main>
      <Breadcrumb
        items={[
          { label: tNav('home'), href: `/${localeValue}` },
          { label: tNav('products'), href: `/${localeValue}/products` },
          { label: categoryNames[localeValue][categoryValue], href: `/${localeValue}/products/${categoryValue}` },
          { label: subCategoryData.name },
        ]}
      />

      <div className="section-heading">
        <div>
          <h2 className="page-title">{subCategoryData.name}</h2>
          <p className="muted page-lead">{categoryDescriptions[localeValue][categoryValue]} - {subCategoryData.name}</p>
        </div>
      </div>

      <div className="page-grid">
        <CategorySidebar locale={localeValue} activeCategory={categoryValue} activeSubCategory={decodedSubCategory} />

        <section className="card-grid">
          {rows.length > 0 ? rows.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              href={`/${localeValue}/products/${categoryValue}/${encodeURIComponent(subCategoryData.slug)}/${encodeURIComponent(product.model)}`}
              specLabel={tProducts('specifications')}
              detailLabel={tProducts('viewDetail')}
            />
          )) : (
            <p className="muted" style={{ gridColumn: '1 / -1', padding: '2rem' }}>此目錄下尚無產品。</p>
          )}
        </section>
      </div>
    </main>
  );
}
