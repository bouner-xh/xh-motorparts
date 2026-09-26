'use client';

import { Link, usePathname } from '@/i18n/navigation';

const languages = [
  { locale: 'zh-TW', label: '繁中' },
  { locale: 'zh-CN', label: '简中' },
  { locale: 'en', label: 'EN' },
] as const;

/**
 * 語系切換連結：保留目前所在頁面，只替換語系（例如產品頁切換後仍停留在同一個產品）
 */
export function LanguageLinks() {
  // next-intl 的 usePathname 回傳不含語系前綴的路徑，例如 /products/cylinder
  const pathname = usePathname();

  return (
    <>
      {languages.map(({ locale, label }) => (
        <Link key={locale} href={pathname} locale={locale} hrefLang={locale}>
          {label}
        </Link>
      ))}
    </>
  );
}
