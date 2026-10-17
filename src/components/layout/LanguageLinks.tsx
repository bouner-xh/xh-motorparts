'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { ADMIN_UNSAVED_LANGUAGE_MESSAGE, hasAdminUnsaved } from '@/lib/admin-unsaved';

const languages = [
  { locale: 'en', label: 'EN' },
  { locale: 'zh-TW', label: '繁中' },
  { locale: 'zh-CN', label: '简中' },
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
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          hrefLang={locale}
          onClick={(event) => {
            // 後台有尚未儲存的表單時，切換語言會讓內容消失，先確認（UX-25）
            if (pathname.startsWith('/admin') && hasAdminUnsaved() && !window.confirm(ADMIN_UNSAVED_LANGUAGE_MESSAGE)) event.preventDefault();
          }}
        >
          {label}
        </Link>
      ))}
    </>
  );
}
