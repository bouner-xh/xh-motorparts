import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale, type CategoryKey } from '@/lib/catalog';
import { getBaseUrl, localeAlternates } from '@/lib/site';
import { getCategoryBySlug, getSubCategories, getCategorySummaries } from '@/lib/catalog-service';
import { Breadcrumb } from '@/components/products/Breadcrumb';
import { CategorySidebar } from '@/components/products/CategorySidebar';
import Link from 'next/link';
import { localized } from '@/lib/localized-text';
import { decodeSegment, encodeSegment } from '@/lib/url-segment';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category: rawCategory } = await params;
  // 分類代號可能含空白，網址參數需要解碼（例如 CLUTCH%20HOUSING）
  const category = decodeSegment(rawCategory);
  if (!locales.includes(locale as Locale)) return {};

  const localeValue = locale as Locale;
  const categoryData = await getCategoryBySlug(category, localeValue);
  if (!categoryData) return {};

  const baseUrl = getBaseUrl();
  const title = `${categoryData.name} | ${localized(locale, { 'zh-TW': '產品系列', 'zh-CN': '产品系列', en: 'Products' })}`;
  const description = categoryData.description;

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${baseUrl}/${locale}/products/${encodeSegment(category)}`,
      locale,
      siteName: localized(locale, { 'zh-TW': '協皇企業有限公司', 'zh-CN': '协皇企业有限公司', en: 'Xie Huang Enterprise Co., Ltd.' }),
    },
    alternates: localeAlternates(locale, `/products/${encodeSegment(category)}`),
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category: rawCategory } = await params;
  // 分類代號可能含空白，網址參數需要解碼（例如 CLUTCH%20HOUSING）
  const category = decodeSegment(rawCategory);
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const localeValue = locale as Locale;
  setRequestLocale(localeValue);

  const [categoryData, subCategories, tNav] = await Promise.all([
    getCategoryBySlug(category, localeValue),
    getSubCategories(category as CategoryKey, localeValue),
    getTranslations({ locale: localeValue, namespace: 'nav' })
  ]);

  if (!categoryData) {
    notFound();
  }

  return (
    <main>
      <Breadcrumb
        items={[
          { label: tNav('home'), href: `/${localeValue}` },
          { label: tNav('products'), href: `/${localeValue}/products` },
          { label: categoryData.name },
        ]}
      />

      <div className="section-heading">
        <div>
          <h1 className="page-title">{categoryData.name}</h1>
          <p className="muted page-lead">{categoryData.description}</p>
        </div>
      </div>

      <div className="page-grid">
        <CategorySidebar locale={localeValue} activeCategory={categoryData.slug} />

        <section className="card-grid">
          {subCategories.length > 0 ? subCategories.map((sub) => (
            <Link key={sub.id} className="card" href={`/${localeValue}/products/${encodeSegment(categoryData.slug)}/${encodeSegment(sub.slug)}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ padding: '2rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.4rem' }}>{sub.name}</h3>
                <p className="muted" style={{ margin: 0 }}>{localized(localeValue, { 'zh-TW': '查看相關產品', 'zh-CN': '查看相关产品', en: 'View products' })} ➔</p>
              </div>
            </Link>
          )) : (
            <p className="muted" style={{ gridColumn: '1 / -1', padding: '2rem' }}>{localized(localeValue, { 'zh-TW': '目前尚未建立子目錄。', 'zh-CN': '目前尚未建立子目录。', en: 'No sub-categories yet.' })}</p>
          )}
        </section>
      </div>
    </main>
  );
}

export const revalidate = 300;

export async function generateStaticParams() {
  const paramsList: Array<{ locale: string; category: string }> = [];
  for (const locale of locales) {
    const categories = await getCategorySummaries(locale);
    for (const cat of categories) {
      paramsList.push({ locale, category: cat.key });
    }
  }
  return paramsList;
}
