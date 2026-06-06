import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {locales, type Locale} from '@/lib/catalog';
import {aboutContent, sharedStats} from '@/lib/site-content';

export default async function AboutPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const localeValue = locale as Locale;
  setRequestLocale(localeValue);
  const t = await getTranslations({locale: localeValue, namespace: 'about'});
  const content = aboutContent[localeValue];

  return (
    <main>
      <section className="hero">
        <article className="surface hero__panel">
          <span className="hero__eyebrow">{t('title')}</span>
          <h2 className="hero__title">{t('intro')}</h2>
          <p className="muted hero__description">{t('content')}</p>
        </article>

        <article className="surface hero__stats">
          <div className="stats-grid">
            {sharedStats.map((stat) => (
              <article key={stat.value} className="card stats-card">
                <p className="stats-card__value">{stat.value}</p>
                <p className="muted stats-card__label">{stat.label[localeValue]}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="info-grid">
        {content.sections.map((section) => (
          <article key={section.title} className="card info-card">
            <h3>{section.title}</h3>
            <p className="muted">{section.body}</p>
          </article>
        ))}
        <article className="card info-card">
          <h3>{localeValue === 'en' ? 'Key Markets' : '主要市場'}</h3>
          <p className="muted">{content.markets.join(' · ')}</p>
        </article>
      </section>
    </main>
  );
}
