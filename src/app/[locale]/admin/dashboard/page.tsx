import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {locales, type Locale} from '@/lib/catalog';

export default async function AdminDashboardPage({
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
  const t = await getTranslations({locale: localeValue, namespace: 'admin'});

  return (
    <main>
      <div className="section-heading">
        <div>
          <h2 className="page-title">{t('dashboardTitle')}</h2>
          <p className="muted page-lead">{t('loginDescription')}</p>
        </div>
      </div>

      <section className="card-grid">
        <article className="card info-card">
          <h3>{t('productsCardTitle')}</h3>
          <p className="muted">{t('productsCardDescription')}</p>
        </article>
        <article className="card info-card">
          <h3>{t('inquiriesCardTitle')}</h3>
          <p className="muted">{t('inquiriesCardDescription')}</p>
        </article>
      </section>
    </main>
  );
}
