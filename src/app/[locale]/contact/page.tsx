import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {locales, type Locale} from '@/lib/catalog';
import {contactMeta} from '@/lib/site-content';
import { localized } from '@/lib/localized-text';

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

  return (
    <main>
      <div className="section-heading">
        <div>
          <h2 className="page-title">{t('title')}</h2>
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
          <h3>Email</h3>
          <p className="muted">{t('email')}</p>
        </article>
        <article className="card info-card">
          <h3>{localized(localeValue, { 'zh-TW': '營業時間', 'zh-CN': '营业时间', en: 'Business Hours' })}</h3>
          <p className="muted">{meta.hours}</p>
        </article>
      </section>
    </main>
  );
}
