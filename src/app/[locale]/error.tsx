'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

// 品牌錯誤頁（UX-01／VI-02）：頁面執行時出錯時顯示，保留站台頁首與頁尾；
// 「重新載入」會重新嘗試渲染這個區段，不需要整頁重整
export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('error');
  const locale = useLocale();

  return (
    <main className="status-page">
      <section className="surface status-page__panel">
        <h1 className="status-page__title">{t('title')}</h1>
        <p className="muted status-page__text">{t('description')}</p>
        <div className="status-page__actions">
          <button type="button" className="button-primary--hero" onClick={() => reset()}>
            {t('retry')}
          </button>
          <Link className="button-outline" href={`/${locale}`}>
            {t('home')}
          </Link>
        </div>
        <p className="muted status-page__contact">
          {t('contact')} <a href="mailto:sales@xh-motorparts.com">sales@xh-motorparts.com</a>
        </p>
      </section>
    </main>
  );
}
