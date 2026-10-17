import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ProductSearchForm } from '@/components/products/ProductSearchForm';
import type { Locale } from '@/lib/catalog';

// 品牌 404（UX-01／VI-02）：沿用站台頁首、頁尾與深色樣式（由 [locale]/layout 提供），
// 狀態碼仍是 404；提供搜尋、回首頁、瀏覽產品目錄與業務信箱，讓訪客不會卡在死路
export default async function LocaleNotFound() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'notFound' });

  return (
    <main id="main-content" tabIndex={-1} className="status-page">
      <section className="surface status-page__panel">
        <p className="status-page__code" aria-hidden="true">404</p>
        <h1 className="status-page__title">{t('title')}</h1>
        <p className="muted status-page__text">{t('description')}</p>
        <div className="status-page__search">
          <ProductSearchForm locale={locale} />
        </div>
        <div className="status-page__actions">
          <Link className="button-primary button-primary--hero" href={`/${locale}`}>
            {t('home')}
          </Link>
          <Link className="button-outline" href={`/${locale}/products`}>
            {t('products')}
          </Link>
        </div>
        <p className="muted status-page__contact">
          {t('contact')} <a href="mailto:sales@xh-motorparts.com">sales@xh-motorparts.com</a>
        </p>
      </section>
    </main>
  );
}
