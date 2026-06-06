import Link from 'next/link';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/lib/catalog';
import { getCategoryCoverUrl } from '@/lib/assets';
import { getCategorySummaries } from '@/lib/catalog-service';
import { CategorySidebar } from '@/components/products/CategorySidebar';
import { notFound } from 'next/navigation';

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const localeValue = locale as Locale;
  setRequestLocale(localeValue);
  const t = await getTranslations({ locale: localeValue, namespace: 'products' });
  const categories = await getCategorySummaries(localeValue);

  return (
    <main>
      <div className="section-heading">
        <div>
          <h2 className="page-title">{t('title')}</h2>
          <p className="muted page-lead">{t('subtitle')}</p>
        </div>
      </div>

      <div className="page-grid">
        <CategorySidebar locale={localeValue} />

        <section className="card-grid">
          {categories.map((category) => (
            <article key={category.key} id={category.key} className="card category-card">
              <div className="category-card__media">
                <Image src={getCategoryCoverUrl(category.key)} alt={category.name} fill sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
                <div className="category-card__overlay" />
              </div>
              <div className="category-card__body">
                <h3>
                  <Link href={`/${localeValue}/products/${category.key}`}>{category.name}</Link>
                </h3>
                <p className="muted">{category.description}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
