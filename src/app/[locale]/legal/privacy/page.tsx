import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {locales, type Locale} from '@/lib/catalog';
import {privacyChecklist} from '@/lib/site-content';

export default async function PrivacyPage({
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
  const t = await getTranslations({locale: localeValue, namespace: 'privacy'});
  const items = privacyChecklist[localeValue];

  return (
    <main>
      <div className="section-heading">
        <div>
          <h2 className="page-title">{t('title')}</h2>
          <p className="muted page-lead">{t('content')}</p>
        </div>
      </div>

      <section className="info-grid">
        {items.map((item) => (
          <article key={item} className="card info-card">
            <p className="muted">{item}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
