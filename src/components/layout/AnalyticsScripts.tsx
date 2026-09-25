import Script from 'next/script';

// 與 CookieBanner 使用相同的 cookie 名稱；react-cookie-consent 同意時寫入 "true"
const CONSENT_COOKIE = 'site-cookie-consent';
const hasConsentScript = `document.cookie.split('; ').indexOf('${CONSENT_COOKIE}=true') !== -1`;

export function AnalyticsScripts() {
  const gaId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  return (
    <>
      {gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-consent-default" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              // 回訪時沿用先前的同意狀態，否則預設拒絕
              gtag('consent', 'default', {
                analytics_storage: ${hasConsentScript} ? 'granted' : 'denied',
                ad_storage: 'denied'
              });
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      ) : null}

      {clarityId ? (
        <Script id="clarity-script" strategy="afterInteractive">
          {`
            (function(){
              // Clarity 會錄製使用者操作，僅在使用者同意 Cookie 後才載入（GDPR）
              function loadClarity(){
                if (window.clarity) return;
                (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${clarityId}");
              }
              if (${hasConsentScript}) {
                loadClarity();
              } else {
                window.addEventListener('cookie-consent', function(e){
                  if (e.detail && e.detail.status === 'accepted') loadClarity();
                });
              }
            })();
          `}
        </Script>
      ) : null}
    </>
  );
}
