import type { Metadata } from 'next';
import Link from 'next/link';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { AnalyticsScripts } from '@/components/layout/AnalyticsScripts';
import { CookieBanner } from '@/components/layout/CookieBanner';
import { Footer } from '@/components/layout/Footer';
import { locales, type Locale } from '@/lib/catalog';

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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xh-motorparts.com';
  return {
    title: `${companyByLocale[locale as Locale]} - Motorcycle Parts`,
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        'zh-TW': `${baseUrl}/zh-TW`,
        'zh-CN': `${baseUrl}/zh-CN`,
        en: `${baseUrl}/en`,
        'x-default': `${baseUrl}/en`,
      },
    },
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

  return (
    <NextIntlClientProvider locale={localeValue} messages={messages}>
      <>
        <AnalyticsScripts />
        <div className="container page-shell">
          <header className="site-header">
            <div className="brand-row">
              <div className="brand-copy">
                <h1>{companyByLocale[localeValue]}</h1>
                <p>
                  {localeValue === 'en'
                    ? 'Motorcycle parts catalog and B2B inquiry platform'
                    : '摩托車零件產品目錄與商務詢價平台'}
                </p>
              </div>
            </div>
            <nav className="nav">
              <Link href={`/${localeValue}`}>{t('home')}</Link>
              <Link href={`/${localeValue}/products`}>{t('products')}</Link>
              <Link href={`/${localeValue}/about`}>{t('about')}</Link>
              <Link href={`/${localeValue}/contact`}>{t('contact')}</Link>
              <Link href={`/${localeValue}/legal/privacy`}>{t('privacy')}</Link>
              <Link href="/zh-TW">繁中</Link>
              <Link href="/zh-CN">简中</Link>
              <Link href="/en">EN</Link>
            </nav>
          </header>
          {children}
          <Footer locale={localeValue} />
          <CookieBanner />
        </div>
      </>
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
