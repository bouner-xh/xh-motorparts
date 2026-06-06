'use client';

import CookieConsent from 'react-cookie-consent';
import {useTranslations} from 'next-intl';

const STORAGE_KEY = 'site-cookie-consent';

export function CookieBanner() {
  const t = useTranslations('cookie');

  return (
    <CookieConsent
      location="bottom"
      cookieName={STORAGE_KEY}
      buttonText={t('accept')}
      declineButtonText={t('decline')}
      enableDeclineButton
      onAccept={() => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, 'accepted');
          window.gtag?.('consent', 'update', {analytics_storage: 'granted', ad_storage: 'denied'});
          window.dispatchEvent(new CustomEvent('cookie-consent', {detail: {status: 'accepted'}}));
        }
      }}
      onDecline={() => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, 'declined');
          window.gtag?.('consent', 'update', {analytics_storage: 'denied', ad_storage: 'denied'});
          window.dispatchEvent(new CustomEvent('cookie-consent', {detail: {status: 'declined'}}));
        }
      }}
      style={{background: '#111827', fontSize: '13px'}}
      buttonStyle={{background: '#dc2626', color: '#fff', borderRadius: '6px'}}
      declineButtonStyle={{background: '#374151', color: '#fff', borderRadius: '6px'}}
    >
      {t('message')}
    </CookieConsent>
  );
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
