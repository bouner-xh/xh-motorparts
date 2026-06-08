import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/lib/catalog';
import { getCategoryBySlug, getSubCategories } from '@/lib/catalog-service';
import { Breadcrumb } from '@/components/products/Breadcrumb';
import { CategorySidebar } from '@/components/products/CategorySidebar';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  if (!locales.includes(locale as Locale)) return {};

  const localeValue = locale as Locale;
  const categoryData = await getCategoryBySlug(category, localeValue);
  if (!categoryData) return {};

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xh-motorparts.com';
  const title = `${categoryData.name} | ${locale === 'en' ? 'Products' : '產品系列'}`;
  const description = categoryData.description;

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${baseUrl}/${locale}/products/${category}`,
      locale,
      siteName: locale === 'en' ? 'Xie Huang Enterprise Co., Ltd.' : '協皇企業有限公司',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/products/${category}`,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const localeValue = locale as Locale;
  const categoryData = await getCategoryBySlug(category, localeValue);
  if (!categoryData) {
    notFound();
  }

  const subCategories = await getSubCategories(categoryData.slug, localeValue);
  setRequestLocale(localeValue);
  const tNav = await getTranslations({ locale: localeValue, namespace: 'nav' });

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
          <h2 className="page-title">{categoryData.name}</h2>
          <p className="muted page-lead">{categoryData.description}</p>
        </div>
      </div>

      <div className="page-grid">
        <CategorySidebar locale={localeValue} activeCategory={categoryData.slug} />

        <section className="card-grid">
          {subCategories.length > 0 ? subCategories.map((sub) => (
            <Link key={sub.id} className="card" href={`/${localeValue}/products/${categoryData.slug}/${sub.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ padding: '2rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.4rem' }}>{sub.name}</h3>
                <p className="muted" style={{ margin: 0 }}>查看相關產品 ➔</p>
              </div>
            </Link>
          )) : (
            <p className="muted" style={{ gridColumn: '1 / -1', padding: '2rem' }}>目前尚未建立子目錄。</p>
          )}
        </section>
      </div>
    </main>
  );
}
