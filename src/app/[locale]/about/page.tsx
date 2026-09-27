import type {Metadata} from 'next';
import {localeAlternates} from '@/lib/site';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {locales, type Locale} from '@/lib/catalog';
import {aboutContent, sharedStats} from '@/lib/site-content';
import { localized } from '@/lib/localized-text';

// canonical 與 hreflang 指向本頁（D14）；標題沿用 layout
export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  return {alternates: localeAlternates(locale, '/about')};
}

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
          <h1 className="hero__title">{t('intro')}</h1>
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
          <h3>{localized(localeValue, { 'zh-TW': '主要市場', 'zh-CN': '主要市场', en: 'Key Markets' })}</h3>
          <p className="muted">{content.markets.join(' · ')}</p>
        </article>
      </section>
    </main>
  );
}
