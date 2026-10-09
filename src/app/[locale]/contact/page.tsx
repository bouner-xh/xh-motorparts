import type {Metadata} from 'next';
import {localeAlternates} from '@/lib/site';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {locales, type Locale} from '@/lib/catalog';
import {contactMeta, orderingInfo} from '@/lib/site-content';
import { localized } from '@/lib/localized-text';

// canonical 與 hreflang 指向本頁（D14）；標題沿用 layout
export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  return {alternates: localeAlternates(locale, '/contact')};
}

export default async function ContactPage({
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
  const t = await getTranslations({locale: localeValue, namespace: 'contact'});
  const meta = contactMeta[localeValue];
  const ordering = orderingInfo[localeValue];

  return (
    <main>
      <div className="section-heading">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="muted page-lead">{meta.note}</p>
        </div>
      </div>

      <section className="info-grid">
        <article className="card info-card">
          <h3>{localized(localeValue, { 'zh-TW': '地址', 'zh-CN': '地址', en: 'Address' })}</h3>
          <p className="muted">{t('address')}</p>
        </article>
        <article className="card info-card">
          <h3>{localized(localeValue, { 'zh-TW': '電話', 'zh-CN': '电话', en: 'Phone' })}</h3>
          <p className="muted">{t('phone')}</p>
        </article>
        <article className="card info-card">
          <h3>WhatsApp</h3>
          <p className="muted">
            <a href="https://wa.me/886930797299" target="_blank" rel="noopener noreferrer">+886 930 797 299</a>
          </p>
        </article>
        <article className="card info-card">
          <h3>Email</h3>
          <p className="muted">{t('email')}</p>
        </article>
        <article className="card info-card">
          <h3>{localized(localeValue, { 'zh-TW': '營業時間', 'zh-CN': '营业时间', en: 'Business Hours' })}</h3>
          <p className="muted">{meta.hours}</p>
        </article>
      </section>

      <div className="section-heading">
        <div>
          <h2 className="page-title">{ordering.title}</h2>
        </div>
      </div>
      <section className="info-grid">
        {ordering.items.map((item) => (
          <article key={item.title} className="card info-card">
            <h3>{item.title}</h3>
            <p className="muted">{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
