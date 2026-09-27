import Link from 'next/link';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/lib/catalog';
import { getCategoryCoverUrl } from '@/lib/assets';
import { getCategorySummaries } from '@/lib/catalog-service';
import { homeContent } from '@/lib/site-content';
import { notFound } from 'next/navigation';
import { localized } from '@/lib/localized-text';
import { Icon } from '@/components/ui/Icon';

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
        <div className="surface hero__panel hero__panel--home" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="hero__eyebrow">{content.hero.eyebrow}</span>
            <div className="hero__badges">
              <span className="hero__badge">{localized(localeValue, { 'zh-TW': '台灣・台中', 'zh-CN': '台湾・台中', en: 'Taichung, Taiwan' })}</span>
              <span className="hero__badge">{localized(localeValue, { 'zh-TW': '創立於 1990 年', 'zh-CN': '创立于 1990 年', en: 'Est. 1990' })}</span>
              <span className="hero__badge">{localized(localeValue, { 'zh-TW': '出口全球 20+ 國家', 'zh-CN': '出口全球 20+ 国家', en: 'Exported to 20+ Countries' })}</span>
            </div>
          </div>
          <h1 className="hero__title" style={{ whiteSpace: 'pre-line', marginTop: '1.5rem' }}>{content.hero.title}</h1>
          <p className="muted hero__description" style={{ marginTop: '1rem' }}>{content.hero.subtitle}</p>
          
          <div className="hero__actions" style={{ marginTop: '2rem' }}>
            <Link className="button-primary button-primary--hero" href={`/${localeValue}/products`}>
              {content.hero.primaryCta}
            </Link>
            <Link className="button-outline" href={`/${localeValue}/about`}>
              {content.hero.secondaryCta}
            </Link>
          </div>

          <p className="hero__contact-line">
            <span>{localized(localeValue, { 'zh-TW': '或直接聯絡業務', 'zh-CN': '或直接联系业务', en: 'Or contact our sales team' })}</span>
            <a href="mailto:sales@xh-motorparts.com"><Icon name="mail" size={16} />sales@xh-motorparts.com</a>
            <a href="https://wa.me/886930797299" target="_blank" rel="noopener noreferrer"><Icon name="chat" size={16} />WhatsApp +886 930 797 299</a>
          </p>
        </div>
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

      <section style={{ marginTop: '4rem' }}>
        <div className="section-heading">
          <h2>{content.whyChooseUs.title}</h2>
        </div>
        <div className="why-grid">
          {content.whyChooseUs.items.map((item, idx) => (
            <div key={idx} className="why-card">
              <span className="why-card__icon"><Icon name={item.icon} size={36} /></span>
              <div className="why-card__title">{item.title}</div>
              <div className="why-card__desc">{item.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 品牌故事：名言與品牌理念（D3：移到頁面最後，讓產品分類提前出現） */}
      <section className="brand-story">
        <div className="brand-belief-quote">
          <div className="quote-container">
            <span className="quote-icon">“</span>
            <blockquote>
              <p className="quote-text">
                {localized(localeValue, { 'zh-TW': '我們的名字不會出現在你的摩托車上，但我們的品質，會陪著它跑過每一段路。', 'zh-CN': '我们的名字不会出现在你的摩托车上，但我们的质量，会陪着它跑过每一段路。', en: 'Our name won\'t appear on your motorcycle, but our quality will ride with it every mile of the way.' })}
              </p>
              <cite className="quote-author">
                {localized(localeValue, { 'zh-TW': '— 協皇企業，台灣，1990 至今', 'zh-CN': '— 协皇企业，台湾，1990 至今', en: '— Xie Huang Enterprise, Taiwan, Est. 1990' })}
              </cite>
            </blockquote>
          </div>
        </div>
        <div className="brand-belief">
          <h2>{content.brandBelief.title}</h2>
          {content.brandBelief.body.map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>
      </section>
    </main>
  );
}
