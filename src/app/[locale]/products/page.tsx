import type {Metadata} from 'next';
import {localeAlternates} from '@/lib/site';
import Link from 'next/link';
import {SafeImage} from '@/components/ui/SafeImage';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/lib/catalog';
import { getCategoryCoverUrl } from '@/lib/assets';
import { getCategorySummaries } from '@/lib/catalog-service';
import { CategorySidebar } from '@/components/products/CategorySidebar';
import { notFound } from 'next/navigation';
import { encodeSegment } from '@/lib/url-segment';

// canonical 與 hreflang 指向本頁（D14）；標題沿用 layout
export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  return {alternates: localeAlternates(locale, '/products')};
}

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
          <h1 className="page-title">{t('title')}</h1>
          <p className="muted page-lead">{t('subtitle')}</p>
        </div>
      </div>

      <div className="page-grid">
        <CategorySidebar locale={localeValue} />

        <section className="card-grid">
          {categories.map((category) => (
            <article key={category.key} id={category.key} className="card category-card">
              <div className="category-card__media">
                <SafeImage src={getCategoryCoverUrl(category.key, category.coverImage)} alt={category.name} fill sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
                <div className="category-card__overlay" />
              </div>
              <div className="category-card__body">
                <h3>
                  <Link href={`/${localeValue}/products/${encodeSegment(category.key)}`}>{category.name}</Link>
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

export const revalidate = 300;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
