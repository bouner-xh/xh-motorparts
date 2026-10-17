import type { Metadata } from 'next';
import Link from 'next/link';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import '../globals.css';
import { AnalyticsScripts } from '@/components/layout/AnalyticsScripts';
import { CookieBanner } from '@/components/layout/CookieBanner';
import { Footer } from '@/components/layout/Footer';
import { locales, type Locale } from '@/lib/catalog';
import { getBaseUrl, localeAlternates } from '@/lib/site';
import { companyNameByLocale, defaultShareImage, defaultTwitterImage, getPageSeo, ogLocale } from '@/lib/page-seo';
import { CartProvider } from '@/context/CartContext';
import { CartIndicator } from '@/components/layout/CartIndicator';
import { LanguageLinks } from '@/components/layout/LanguageLinks';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { localized } from '@/lib/localized-text';

const companyByLocale: Record<Locale, string> = {
  'zh-TW': '協皇企業有限公司',
  'zh-CN': '协皇企业有限公司',
  en: 'Xie Huang Enterprise Co., Ltd.',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) {
    return {};
  }

  const localeValue = locale as Locale;
  const title = `${companyByLocale[localeValue]} - ${localized(locale, { 'zh-TW': '摩托車零件', 'zh-CN': '摩托车零件', en: 'Motorcycle Parts' })}`;
  const description = getPageSeo(locale, 'products').description;

  // metadataBase：讓分享圖等相對網址變成完整網址（og:image 必須是絕對網址）。
  // 各頁自己的標題、描述見 src/lib/page-seo.ts；這裡是沒有自訂 metadata 的頁面的預設值。
  // 預設分享圖（src/app/opengraph-image.jpg、twitter-image.jpg）明確列在這裡，頁面自己設了 openGraph 時也不會遺失
  return {
    metadataBase: new URL(getBaseUrl()),
    title,
    description,
    alternates: localeAlternates(locale),
    openGraph: {
      type: 'website',
      title,
      description,
      siteName: companyNameByLocale[localeValue],
      locale: ogLocale(locale),
      images: [defaultShareImage],
    },
    twitter: { card: 'summary_large_image', title, description, images: [defaultTwitterImage] },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const localeValue = locale as Locale;
  setRequestLocale(localeValue);
  const messages = await getMessages({ locale: localeValue });
  const t = await getTranslations({ locale: localeValue, namespace: 'nav' });

  // 這個版面同時是整個網站的最外層（<html> 在這裡），讓每頁的 lang 與網址語系一致
  return (
    <html lang={localeValue}>
      <body>
        <NextIntlClientProvider locale={localeValue} messages={messages}>
          <CartProvider>
            <AnalyticsScripts />
            <div className="container page-shell">
              <SiteHeader
                brand={
                  <div className="brand-copy">
                    <div className="brand-name">{companyByLocale[localeValue]}</div>
                    <p>
                      {localized(localeValue, { 'zh-TW': '摩托車零件產品目錄與商務詢價平台', 'zh-CN': '摩托车零件产品目录与商务询价平台', en: 'Motorcycle parts catalog and B2B inquiry platform' })}
                    </p>
                  </div>
                }
                links={
                  <>
                    <Link href={`/${localeValue}`}>{t('home')}</Link>
                    <Link href={`/${localeValue}/products`}>{t('products')}</Link>
                    <Link href={`/${localeValue}/about`}>{t('about')}</Link>
                    <Link href={`/${localeValue}/contact`}>{t('contact')}</Link>
                    <LanguageLinks />
                  </>
                }
                cart={<CartIndicator locale={localeValue} />}
                menuLabel={{
                  open: localized(localeValue, { 'zh-TW': '開啟選單', 'zh-CN': '打开菜单', en: 'Open menu' }),
                  close: localized(localeValue, { 'zh-TW': '關閉選單', 'zh-CN': '关闭菜单', en: 'Close menu' }),
                }}
              />
              {children}
              <Footer locale={localeValue} />
              <CookieBanner />
            </div>
          </CartProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
