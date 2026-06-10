import {NextResponse, type NextRequest} from 'next/server';
import createMiddleware from 'next-intl/middleware';
import {routing} from '@/i18n/routing';
import {getSupabaseMiddlewareAuthClient} from '@/lib/supabase/server';
import {locales} from '@/lib/catalog';

const intlMiddleware = createMiddleware(routing);

// 動態建立語系匹配正則表達式，避免新增或移除語系時遺漏修改此處的硬編碼
const localesPattern = locales.join('|');
const adminMatchRegex = new RegExp(`^\\/(${localesPattern})\\/admin(?:\\/.*)?$`);
const loginPageRegex = new RegExp(`^\\/(${localesPattern})\\/admin\\/login\\/?$`);
const dashboardPageRegex = new RegExp(`^\\/(${localesPattern})\\/admin\\/dashboard\\/?$`);

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const {pathname} = request.nextUrl;
  const adminMatch = pathname.match(adminMatchRegex);

  if (!adminMatch) {
    return response;
  }

  const locale = adminMatch[1];
  const isLoginPage = loginPageRegex.test(pathname);
  const isDashboardPage = dashboardPageRegex.test(pathname);

  if (isDashboardPage && request.url.endsWith('?')) {
    return NextResponse.redirect(new URL(`/${locale}/admin/login`, request.url));
  }

  const supabase = getSupabaseMiddlewareAuthClient(request, response);

  if (!supabase) {
    if (isLoginPage) {
      return response;
    }

    return NextResponse.redirect(new URL(`/${locale}/admin/login?error=config`, request.url));
  }

  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (!user && !isLoginPage) {
    const loginUrl = new URL(`/${locale}/admin/login`, request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL(`/${locale}/admin/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
