import {NextResponse, type NextRequest} from 'next/server';
import createMiddleware from 'next-intl/middleware';
import {routing} from '@/i18n/routing';
import {getSupabaseMiddlewareAuthClient} from '@/lib/supabase/server';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const {pathname} = request.nextUrl;
  const adminMatch = pathname.match(/^\/(zh-TW|zh-CN|en)\/admin(?:\/.*)?$/);

  if (!adminMatch) {
    return response;
  }

  const locale = adminMatch[1];
  const isLoginPage = /^\/(zh-TW|zh-CN|en)\/admin\/login\/?$/.test(pathname);
  const isDashboardPage = /^\/(zh-TW|zh-CN|en)\/admin\/dashboard\/?$/.test(pathname);

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
