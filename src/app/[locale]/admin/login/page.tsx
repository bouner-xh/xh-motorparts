import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {redirect} from 'next/navigation';
import {locales, type Locale} from '@/lib/catalog';
import {getSupabaseServerAuthClient} from '@/lib/supabase/server';
import {isAdminEmail} from '@/lib/admin-auth';

const loginErrorMessage: Record<string, string> = {
  invalid: '登入失敗，請確認帳號密碼。',
  config: 'Supabase 設定不完整，請先配置環境變數。',
  forbidden: '此帳號沒有後台權限，請聯絡網站管理員。',
  unknown: '登入時發生錯誤，請稍後再試。'
};

// 登入後只允許跳轉到本站同語系路徑，避免被導向外部網站（Open Redirect）
function resolveNextPath(locale: Locale, next?: string | null) {
  const fallback = `/${locale}/admin/dashboard`;
  if (!next || !next.startsWith(`/${locale}/`) || next.includes('\\')) {
    return fallback;
  }

  return next;
}

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
  const nextPath = resolveNextPath(localeValue, query.next);

  async function loginAction(formData: FormData) {
    'use server';

    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const next = resolveNextPath(localeValue, String(formData.get('next') || ''));

    const supabase = await getSupabaseServerAuthClient();

    if (!supabase) {
      redirect(`/${localeValue}/admin/login?error=config`);
    }

    const {data, error} = await supabase.auth.signInWithPassword({email, password});

    if (error) {
      redirect(`/${localeValue}/admin/login?error=invalid`);
    }

    // 帳密正確但不在管理員名單內：立即登出，不保留登入狀態
    if (!isAdminEmail(data.user?.email)) {
      await supabase.auth.signOut();
      redirect(`/${localeValue}/admin/login?error=forbidden`);
    }

    redirect(next);
  }

  setRequestLocale(localeValue);
  const t = await getTranslations({locale: localeValue, namespace: 'admin'});
  const errorMessage = resolveErrorMessage(query.error);

  return (
    <main>
      <div className="section-heading">
        <div>
          <h1 className="page-title">{t('loginTitle')}</h1>
          <p className="muted page-lead">{t('loginDescription')}</p>
        </div>
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
