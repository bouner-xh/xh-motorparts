import {getTranslations, setRequestLocale} from 'next-intl/server';
import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';
import {locales, type Locale} from '@/lib/catalog';
import {getSupabaseServerAuthClient} from '@/lib/supabase/server';
import {AdminProductManager} from '@/components/admin/AdminProductManager';
import {AdminSubCategoryManager} from '@/components/admin/AdminSubCategoryManager';
import {AdminCategoryManager} from '@/components/admin/AdminCategoryManager';
import {AdminProductImporter} from '@/components/admin/AdminProductImporter';

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
  const supabase = await getSupabaseServerAuthClient();

  if (!supabase) {
    redirect(`/${localeValue}/admin/login?error=config`);
  }

  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${localeValue}/admin/login`);
  }

  async function logoutAction() {
    'use server';

    const authClient = await getSupabaseServerAuthClient();
    if (authClient) {
      await authClient.auth.signOut();
    }

    redirect(`/${localeValue}/admin/login`);
  }

  setRequestLocale(localeValue);
  const t = await getTranslations({locale: localeValue, namespace: 'admin'});

  return (
    <main>
      <div className="section-heading">
        <div>
          <h2 className="page-title">{t('dashboardTitle')}</h2>
          <p className="muted page-lead">{t('loginDescription')}</p>
        </div>
        <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
          <Link href={`/${localeValue}/admin/login`} className="button-secondary">
            前往登入頁
          </Link>
          <form action={logoutAction}>
            <button type="submit">Logout</button>
          </form>
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

      <section className="card" style={{marginTop: '1rem'}}>
        <AdminCategoryManager locale={localeValue} />
      </section>

      <section className="card" style={{marginTop: '1rem'}}>
        <AdminSubCategoryManager locale={localeValue} />
      </section>

      <section className="card" style={{marginTop: '1rem'}}>
        <AdminProductImporter locale={localeValue} />
      </section>

      <section className="card" style={{marginTop: '1rem'}}>
        <AdminProductManager locale={localeValue} />
      </section>
    </main>
  );
}
