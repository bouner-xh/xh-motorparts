import {getTranslations, setRequestLocale} from 'next-intl/server';
import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';
import {locales, type Locale} from '@/lib/catalog';
import {getSupabaseServerAuthClient} from '@/lib/supabase/server';
import {isAdminEmail} from '@/lib/admin-auth';
import {AdminDashboardTabs} from '@/components/admin/AdminDashboardTabs';

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

  if (!isAdminEmail(user.email)) {
    redirect(`/${localeValue}/admin/login?error=forbidden`);
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
    <main className="admin-dashboard">
      <div className="admin-dashboard__header">
        <h1 className="page-title">{t('dashboardTitle')}</h1>
        <div className="admin-dashboard__account">
          <span className="admin-hide-mobile">{user.email}</span>
          <Link href={`/${localeValue}`} className="button-secondary">
            前往網站
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="button-secondary">
              登出
            </button>
          </form>
        </div>
      </div>

      {/* 後台分頁：總覽／詢價／產品／分類／批量匯入（A8） */}
      <AdminDashboardTabs locale={localeValue} />
    </main>
  );
}
