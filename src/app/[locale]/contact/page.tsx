import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {locales, type Locale} from '@/lib/catalog';
import {contactMeta} from '@/lib/site-content';

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
          <h3>{localeValue === 'en' ? 'Address' : '地址'}</h3>
          <p className="muted">{t('address')}</p>
        </article>
        <article className="card info-card">
          <h3>{localeValue === 'en' ? 'Phone' : '電話'}</h3>
          <p className="muted">{t('phone')}</p>
        </article>
        <article className="card info-card">
          <h3>Email</h3>
          <p className="muted">{t('email')}</p>
        </article>
        <article className="card info-card">
          <h3>{localeValue === 'en' ? 'Business Hours' : '營業時間'}</h3>
          <p className="muted">{meta.hours}</p>
        </article>
      </section>
    </main>
  );
}
