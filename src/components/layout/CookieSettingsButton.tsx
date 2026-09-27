'use client';

// 頁尾「Cookie 設定」：撤回先前的同意（S6，GDPR 要求撤回要和同意一樣容易）
// 清除同意紀錄與分析服務的 Cookie 後重新載入，Cookie 橫幅會再次出現讓使用者重新選擇
import type {Locale} from '@/lib/catalog';
import {localized} from '@/lib/localized-text';

const CONSENT_COOKIE = 'site-cookie-consent';
// GA4（_ga、_ga_XXXX）與 Clarity（_clck、_clsk）寫在本網域的 Cookie
const ANALYTICS_COOKIE_PATTERN = /^(_ga|_ga_.*|_gid|_clck|_clsk)$/;

function expireCookie(name: string) {
  const expired = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  document.cookie = expired;
  // 分析服務可能寫在上層網域（例如 .xh-motorparts.com），逐層清除
  const parts = window.location.hostname.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    document.cookie = `${expired}; domain=.${parts.slice(i).join('.')}`;
  }
}

export function CookieSettingsButton({locale}: {locale: Locale}) {
  function revokeConsent() {
    window.gtag?.('consent', 'update', {analytics_storage: 'denied', ad_storage: 'denied'});
    document.cookie.split('; ').forEach((entry) => {
      const name = entry.split('=')[0];
      if (name === CONSENT_COOKIE || name === `${CONSENT_COOKIE}-legacy` || ANALYTICS_COOKIE_PATTERN.test(name)) {
        expireCookie(name);
      }
    });
    try {
      window.localStorage.removeItem(CONSENT_COOKIE);
    } catch {
      // 瀏覽器停用 localStorage 時略過
    }
    // 已載入的 Clarity 無法卸載，重新載入頁面讓它停止
    window.location.reload();
  }

  return (
    <button type="button" className="footer-privacy-link footer-cookie-settings" onClick={revokeConsent}>
      {localized(locale, {'zh-TW': 'Cookie 設定', 'zh-CN': 'Cookie 设置', en: 'Cookie Settings'})}
    </button>
  );
}
