import Link from 'next/link';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/lib/catalog';
import { getCategoryCoverUrl } from '@/lib/assets';
import { getCategorySummaries } from '@/lib/catalog-service';
import { homeContent } from '@/lib/site-content';
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
  const categories = await getCategorySummaries(localeValue);
  const content = homeContent[localeValue];

  return (
    <main>
      <section className="hero">
        <div className="surface hero__panel" style={{ gridColumn: '1 / -1', padding: '3.5rem 2.5rem' }}>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="hero__eyebrow">{content.hero.eyebrow}</span>
            <div className="hero__badges">
              <span className="hero__badge">{localeValue === 'en' ? 'Taichung, Taiwan' : '台灣・台中'}</span>
              <span className="hero__badge">{localeValue === 'en' ? 'Est. 1990' : '創立於 1990 年'}</span>
              <span className="hero__badge">{localeValue === 'en' ? 'Exported to 20+ Countries' : '出口全球 20+ 國家'}</span>
            </div>
          </div>
          <h2 className="hero__title" style={{ whiteSpace: 'pre-line', marginTop: '1.5rem' }}>{content.hero.title}</h2>
          <p className="muted hero__description" style={{ marginTop: '1rem' }}>{content.hero.subtitle}</p>
          
          <div className="hero__contact-quick">
            <span>📧 Email: <a href="mailto:bounerchang@gmail.com">bounerchang@gmail.com</a></span>
            <span>📱 WhatsApp: <a href="https://wa.me/886930797299" target="_blank" rel="noopener noreferrer">+886 930 797 299</a></span>
          </div>

          <div className="hero__actions" style={{ marginTop: '2rem' }}>
            <Link href={`/${localeValue}/products`}>
              <button type="button">{content.hero.primaryCta}</button>
            </Link>
            <Link className="button-secondary" href={`/${localeValue}/about`}>
              {content.hero.secondaryCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="brand-belief-quote">
        <div className="quote-container">
          <span className="quote-icon">“</span>
          <blockquote>
            <p className="quote-text">
              {localeValue === 'en' 
                ? 'Our name won\'t appear on your motorcycle, but our quality will ride with it every mile of the way.'
                : '我們的名字不會出現在你的摩托車上，但我們的品質，會陪著它跑過每一段路。'}
            </p>
            <cite className="quote-author">
              {localeValue === 'en'
                ? '— Xie Huang Enterprise, Taiwan, Est. 1990'
                : '— 協皇企業，台灣，1990 至今'}
            </cite>
          </blockquote>
        </div>
      </section>

      <section className="brand-belief">
        <h2>{content.brandBelief.title}</h2>
        {content.brandBelief.body.map((line, idx) => (
          <p key={idx}>{line}</p>
        ))}
      </section>

      <section className="section-heading">
        <div>
          <h2>{content.categoryIntro.title}</h2>
          <p className="muted">{content.categoryIntro.subtitle}</p>
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

      <section style={{ marginTop: '4rem' }}>
        <div className="section-heading">
          <h2>{content.whyChooseUs.title}</h2>
        </div>
        <div className="why-grid">
          {content.whyChooseUs.items.map((item, idx) => (
            <div key={idx} className="why-card">
              <span className="why-card__icon">{item.icon}</span>
              <div className="why-card__title">{item.title}</div>
              <div className="why-card__desc">{item.description}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="flow-container">
        <div className="section-heading" style={{ justifyContent: 'center', marginTop: 0 }}>
          <h2 style={{ textAlign: 'center' }}>{content.inquiryFlow.title}</h2>
        </div>
        <div className="flow-steps">
          {content.inquiryFlow.steps.map((step, idx) => (
            <div key={idx} className="flow-step">
              <div className="flow-step__number">{idx + 1}</div>
              <div className="flow-step__title">{step.title}</div>
              <div className="flow-step__desc">{step.desc}</div>
            </div>
          ))}
        </div>
        <div className="flow-conclusion">
          {content.inquiryFlow.conclusion}
        </div>
      </section>
    </main>
  );
}
