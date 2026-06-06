import {type Locale} from '@/lib/catalog';

const footerCopy: Record<Locale, {summary: string; copyright: string}> = {
  'zh-TW': {
    summary: '提供多語產品目錄、產品詳細頁與商務詢價服務。',
    copyright: '© 2026 協皇企業有限公司'
  },
  'zh-CN': {
    summary: '提供多语产品目录、产品详情页与商务询价服务。',
    copyright: '© 2026 协皇企业有限公司'
  },
  en: {
    summary: 'Multilingual product catalog, product detail pages and B2B inquiry service.',
    copyright: '© 2026 Xie Huang Enterprise Co., Ltd.'
  }
};

export function Footer({locale}: {locale: Locale}) {
  return (
    <footer className="site-footer">
      <div>
        <strong>{footerCopy[locale].copyright}</strong>
        <p className="muted">{footerCopy[locale].summary}</p>
      </div>
    </footer>
  );
}
