import {type Locale} from '@/lib/catalog';

const footerCopy: Record<Locale, {copyright: string; slogan: string; author: string}> = {
  'zh-TW': {
    copyright: '© 2026 協皇企業有限公司',
    slogan: '「我們的名字不會出現在你的摩托車上，但我們的品質，會陪著它跑過每一段路。」',
    author: '— 協皇企業，台灣，1990 至今'
  },
  'zh-CN': {
    copyright: '© 2026 协皇企业有限公司',
    slogan: '「我们的名字不会出现在你的摩托车上，但我们的质量，会陪着它跑过每一段路。」',
    author: '— 协皇企业，台湾，1990 至今'
  },
  en: {
    copyright: '© 2026 Xie Huang Enterprise Co., Ltd.',
    slogan: '"Our name won\'t appear on your motorcycle, but our quality will ride with it every mile of the way."',
    author: '— Xie Huang Enterprise, Taiwan, Est. 1990'
  }
};

export function Footer({locale}: {locale: Locale}) {
  return (
    <footer className="site-footer">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ fontSize: '1.2rem', color: '#f8fafc', fontStyle: 'italic', marginBottom: '0.5rem' }}>{footerCopy[locale].slogan}</p>
        <p className="muted">{footerCopy[locale].author}</p>
      </div>
      <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.16)', paddingTop: '1.2rem', textAlign: 'center' }}>
        <strong>{footerCopy[locale].copyright}</strong>
      </div>
    </footer>
  );
}
