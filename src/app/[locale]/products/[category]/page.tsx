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
import { getSubCategories } from '@/lib/catalog-service';
import { Breadcrumb } from '@/components/products/Breadcrumb';
import { CategorySidebar } from '@/components/products/CategorySidebar';
import Link from 'next/link';

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  if (!locales.includes(locale as Locale) || !categoryKeys.includes(category as CategoryKey)) {
    notFound();
  }

  const localeValue = locale as Locale;
  const categoryValue = category as CategoryKey;
  const subCategories = await getSubCategories(categoryValue, localeValue);
  setRequestLocale(localeValue);
  const tNav = await getTranslations({ locale: localeValue, namespace: 'nav' });

  return (
    <main>
      <Breadcrumb
        items={[
          { label: tNav('home'), href: `/${localeValue}` },
          { label: tNav('products'), href: `/${localeValue}/products` },
          { label: categoryNames[localeValue][categoryValue] },
        ]}
      />

      <div className="section-heading">
        <div>
          <h2 className="page-title">{categoryNames[localeValue][categoryValue]}</h2>
          <p className="muted page-lead">{categoryDescriptions[localeValue][categoryValue]}</p>
        </div>
      </div>

      <div className="page-grid">
        <CategorySidebar locale={localeValue} activeCategory={categoryValue} />

        <section className="card-grid">
          {subCategories.length > 0 ? subCategories.map((sub) => (
            <Link key={sub.id} className="card" href={`/${localeValue}/products/${categoryValue}/${sub.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
