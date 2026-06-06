import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {locales, type Locale} from '@/lib/catalog';

export default async function AdminLoginPage({
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
          <h2 className="page-title">{t('loginTitle')}</h2>
          <p className="muted page-lead">{t('loginDescription')}</p>
        </div>
      </div>

      <article className="card info-card">
        <form className="admin-form">
          <label>
            Email
            <input type="email" placeholder="admin@example.com" />
          </label>
          <label>
            Password
            <input type="password" placeholder="••••••••" />
          </label>
          <button type="button">{t('loginButton')}</button>
        </form>
      </article>
    </main>
  );
}
