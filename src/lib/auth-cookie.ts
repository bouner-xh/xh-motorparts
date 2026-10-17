// 後台登入 cookie 加固（SX-3）：
// @supabase/ssr 預設 httpOnly:false、效期 400 天；網站瀏覽器端沒有任何程式讀取這個 cookie
// （登入、登出、驗證都在伺服器端），所以改成 HttpOnly、正式環境 Secure、SameSite=Lax、效期 7 天

export const AUTH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

type CookieOptions = {
  path?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  domain?: string;
};

export function hardenAuthCookieOptions<T extends CookieOptions>(options: T | undefined, isProduction: boolean): T {
  const base = (options ?? {}) as T;
  // 登出時 Supabase 會用 maxAge: 0 清除 cookie，必須保留，不能被改成 7 天
  const isRemoval = base.maxAge !== undefined && base.maxAge <= 0;
  return {
    ...base,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: isRemoval ? base.maxAge : AUTH_COOKIE_MAX_AGE_SECONDS
  } as T;
}
