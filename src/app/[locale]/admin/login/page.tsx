import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {redirect} from 'next/navigation';
import {locales, type Locale} from '@/lib/catalog';
import {getSupabaseServerAuthClient} from '@/lib/supabase/server';

const loginErrorMessage: Record<string, string> = {
  invalid: '登入失敗，請確認帳號密碼。',
  config: 'Supabase 設定不完整，請先配置環境變數。',
  unknown: '登入時發生錯誤，請稍後再試。'
};

function resolveErrorMessage(errorCode?: string) {
  if (!errorCode) {
    return '';
  }

  return loginErrorMessage[errorCode] || loginErrorMessage.unknown;
}

export default async function AdminLoginPage({
  params,
  searchParams
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{error?: string; next?: string}>;
}) {
  const {locale} = await params;
  const query = await searchParams;
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const localeValue = locale as Locale;
  const nextPath = query.next && query.next.startsWith(`/${localeValue}/`) ? query.next : `/${localeValue}/admin/dashboard`;

  async function loginAction(formData: FormData) {
    'use server';

    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const next = String(formData.get('next') || `/${localeValue}/admin/dashboard`);

    const supabase = await getSupabaseServerAuthClient();

    if (!supabase) {
      redirect(`/${localeValue}/admin/login?error=config`);
    }

    const {error} = await supabase.auth.signInWithPassword({email, password});

    if (error) {
      redirect(`/${localeValue}/admin/login?error=invalid`);
    }

    redirect(next);
  }

  async function testLoginAction() {
    'use server';

    const supabase = await getSupabaseServerAuthClient();

    if (!supabase) {
      redirect(`/${localeValue}/admin/login?error=config`);
    }

    const {error} = await supabase.auth.signInWithPassword({
      email: 'jajanuj@gmail.com',
      password: '@Nlri8523xh'
    });

    if (error) {
      redirect(`/${localeValue}/admin/login?error=invalid`);
    }

    redirect(nextPath);
  }

  setRequestLocale(localeValue);
  const t = await getTranslations({locale: localeValue, namespace: 'admin'});
  const errorMessage = resolveErrorMessage(query.error);

  return (
    <main>
      <div className="section-heading">
        <div>
          <h2 className="page-title">{t('loginTitle')}</h2>
          <p className="muted page-lead">{t('loginDescription')}</p>
        </div>
        <form action={testLoginAction}>
          <button type="submit" style={{background: '#0f766e'}}>測試登入</button>
        </form>
      </div>

      <article className="card info-card">
        <form className="admin-form" action={loginAction}>
          <input type="hidden" name="next" value={nextPath} />
          <label>
            Email
            <input name="email" type="email" placeholder="admin@example.com" required />
          </label>
          <label>
            Password
            <input name="password" type="password" placeholder="••••••••" required />
          </label>
          {errorMessage ? <p className="muted">{errorMessage}</p> : null}
          <button type="submit">{t('loginButton')}</button>
        </form>
      </article>
    </main>
  );
}
