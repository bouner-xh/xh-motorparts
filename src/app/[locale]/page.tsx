import Link from 'next/link';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/lib/catalog';
import { getCategoryCoverUrl } from '@/lib/assets';
import { getCategorySummaries } from '@/lib/catalog-service';
import { heroContent, sharedStats } from '@/lib/site-content';
import { notFound } from 'next/navigation';

export default async function LocaleHome({
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
  const t = await getTranslations({ locale: localeValue, namespace: 'home' });
  const categories = await getCategorySummaries(localeValue);
  const hero = heroContent[localeValue];

  return (
    <main>
      <section className="hero">
        <div className="surface hero__panel">
          <span className="hero__eyebrow">{hero.eyebrow}</span>
          <h2 className="hero__title">{hero.title}</h2>
          <p className="muted hero__description">{hero.subtitle}</p>
          <div className="hero__actions">
            <Link href={`/${localeValue}/products`}>
              <button type="button">{hero.primaryCta}</button>
            </Link>
            <Link className="button-secondary" href={`/${localeValue}/about`}>
              {hero.secondaryCta}
            </Link>
          </div>
          <div className="hero__trust">
            {hero.trustPoints.map((item) => (
              <div key={item} className="hero__trust-item">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="surface hero__stats">
          <div className="section-heading">
            <div>
              <h2>{t('title')}</h2>
              <p className="muted">{t('subtitle')}</p>
            </div>
          </div>
          <div className="stats-grid">
            {sharedStats.map((stat) => (
              <article key={stat.value} className="card stats-card">
                <p className="stats-card__value">{stat.value}</p>
                <p className="muted stats-card__label">{stat.label[localeValue]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-heading">
        <div>
          <h2>{t('title')}</h2>
          <p className="muted">{t('subtitle')}</p>
        </div>
      </section>

      <section className="card-grid">
        {categories.map((category) => (
          <Link key={category.key} className="card category-card" href={`/${localeValue}/products/${category.key}`}>
            <div className="category-card__media">
              <Image src={getCategoryCoverUrl(category.key)} alt={category.name} fill sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
              <div className="category-card__overlay" />
            </div>
            <div className="category-card__body">
              <h3>{category.name}</h3>
              <p className="muted">{category.description}</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
