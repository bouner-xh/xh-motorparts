/* eslint-disable @next/next/no-html-link-for-pages -- 沒有語系的 404：此處沒有 next-intl 與 Link 的語系環境，直接用一般連結帶訪客到各語系首頁 */
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Page not found | Xie Huang Enterprise',
  robots: { index: false, follow: true },
};

// 沒有語系的網址（例如 /zzz、/fr/products）的 404。
// 專案沒有根 layout（<html> 在 [locale]/layout），所以這裡自帶最小的 html／body，
// 並連到各語系首頁；狀態碼仍是 404
export default function RootNotFound() {
  return (
    <html lang="en">
      <body>
        <main id="main-content" tabIndex={-1} className="container status-page">
          <section className="surface status-page__panel">
            <p className="brand-name">Xie Huang Enterprise Co., Ltd.</p>
            <p className="status-page__code" aria-hidden="true">404</p>
            <h1 className="status-page__title">Page not found</h1>
            <p className="muted status-page__text">
              The page you are looking for may have moved or no longer exists. Choose a language to continue.
            </p>
            <div className="status-page__actions">
              <a className="button-primary button-primary--hero" href="/en">Back to homepage</a>
              <a className="button-outline" href="/zh-TW">繁體中文</a>
              <a className="button-outline" href="/zh-CN">简体中文</a>
            </div>
            <p className="muted status-page__contact">
              Email us at <a href="mailto:sales@xh-motorparts.com">sales@xh-motorparts.com</a>
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}
