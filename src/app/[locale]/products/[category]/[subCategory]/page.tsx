import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale, type CategoryKey } from '@/lib/catalog';
import { getBaseUrl, localeAlternates } from '@/lib/site';
import { getCategoryBySlug, getCategoryProducts, getSubCategoryBySlug, getCategorySummaries, getSubCategories } from '@/lib/catalog-service';
import { Breadcrumb } from '@/components/products/Breadcrumb';
import { CategorySidebar } from '@/components/products/CategorySidebar';
import { ProductCard } from '@/components/products/ProductCard';
import { localized } from '@/lib/localized-text';
import { decodeSegment, encodeSegment } from '@/lib/url-segment';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; subCategory: string }>;
}): Promise<Metadata> {
  const { locale, category: rawCategory, subCategory } = await params;
  const category = decodeSegment(rawCategory);
  if (!locales.includes(locale as Locale)) {
    return {};
  }

  const localeValue = locale as Locale;
  const categoryData = await getCategoryBySlug(category, localeValue);
  if (!categoryData) return {};

  const decoded = decodeURIComponent(subCategory);
  const subCategoryData = await getSubCategoryBySlug(categoryData.slug, decoded, localeValue);
  if (!subCategoryData) return {};

  const baseUrl = getBaseUrl();
  const title = `${subCategoryData.name} | ${categoryData.name}`;
  const description = `${categoryData.description} - ${subCategoryData.name}`;

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${baseUrl}/${locale}/products/${encodeSegment(category)}/${encodeURIComponent(subCategoryData.slug)}`,
      locale,
      siteName: localized(locale, { 'zh-TW': '協皇企業有限公司', 'zh-CN': '协皇企业有限公司', en: 'Xie Huang Enterprise Co., Ltd.' }),
    },
    alternates: localeAlternates(locale, `/products/${encodeSegment(category)}/${encodeURIComponent(subCategoryData.slug)}`),
  };
}

export default async function SubCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string; subCategory: string }>;
}) {
  const { locale, category: rawCategory, subCategory } = await params;
  const category = decodeSegment(rawCategory);
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const localeValue = locale as Locale;
  setRequestLocale(localeValue);
  
  const decodedSubCategory = decodeURIComponent(subCategory);
  
  // Parallel fetch category and subcategory info
  const [categoryData, subCategoryData] = await Promise.all([
    getCategoryBySlug(category, localeValue),
    getSubCategoryBySlug(category as CategoryKey, decodedSubCategory, localeValue)
  ]);

  if (!categoryData || !subCategoryData) {
    notFound();
  }

  // Parallel fetch products and translation bundles
  const [rows, tProducts, tNav] = await Promise.all([
    getCategoryProducts(categoryData.slug as CategoryKey, subCategoryData.id, localeValue),
    getTranslations({ locale: localeValue, namespace: 'products' }),
    getTranslations({ locale: localeValue, namespace: 'nav' })
  ]);

  return (
    <main>
      <Breadcrumb
        items={[
          { label: tNav('home'), href: `/${localeValue}` },
          { label: tNav('products'), href: `/${localeValue}/products` },
          { label: categoryData.name, href: `/${localeValue}/products/${encodeSegment(categoryData.slug)}` },
          { label: subCategoryData.name },
        ]}
      />

      <div className="section-heading">
        <div>
          <h1 className="page-title">{subCategoryData.name}</h1>
          <p className="muted page-lead">{categoryData.description} - {subCategoryData.name}</p>
        </div>
      </div>

      <div className="page-grid">
        <CategorySidebar locale={localeValue} activeCategory={categoryData.slug} activeSubCategory={decodedSubCategory} />

        <section className="card-grid">
          {rows.length > 0 ? rows.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              href={`/${localeValue}/products/${encodeSegment(categoryData.slug)}/${encodeURIComponent(subCategoryData.slug)}/${encodeURIComponent(product.model)}`}
              specLabel={tProducts('specifications')}
              detailLabel={tProducts('viewDetail')}
              locale={localeValue}
              categorySlug={categoryData.slug}
              subCategorySlug={subCategoryData.slug}
            />
          )) : (
            <p className="muted" style={{ gridColumn: '1 / -1', padding: '2rem' }}>{localized(localeValue, { 'zh-TW': '此目錄下尚無產品。', 'zh-CN': '此目录下暂无产品。', en: 'No products in this category yet.' })}</p>
          )}
        </section>
      </div>
    </main>
  );
}

export const revalidate = 300;

export async function generateStaticParams() {
  const paramsList: Array<{ locale: string; category: string; subCategory: string }> = [];
  for (const locale of locales) {
    const categories = await getCategorySummaries(locale);
    for (const cat of categories) {
      const subCategories = await getSubCategories(cat.key, locale);
      for (const sub of subCategories) {
        paramsList.push({ locale, category: cat.key, subCategory: sub.slug });
      }
    }
  }
  return paramsList;
}
