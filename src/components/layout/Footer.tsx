import Link from 'next/link';
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
  const isEn = locale === 'en';
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        {/* Column 1: Brand & Certification */}
        <div className="footer-col footer-col--brand">
          <h3 className="footer-col__title">
            {isEn ? 'Xie Huang Enterprise' : '協皇企業有限公司'}
          </h3>
          <p className="muted footer-col__desc">
            {isEn 
              ? 'Taiwan motorcycle parts manufacturer and B2B inquiry partner since 1990. Committed to premium quality and global export service.'
              : '創立於 1990 年的台灣摩托車零件製造商與 B2B 外銷夥伴。我們三十年來秉持誠實工序，提供全球採購商最穩定、高品質的核心零件供應。'}
          </p>
          <div className="footer-badge-list">
            <span className="footer-trust-badge">
              🇹🇼 {isEn ? 'Made in Taiwan Quality' : '台灣在地工廠製造'}
            </span>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div className="footer-col">
          <h3 className="footer-col__title">{isEn ? 'Navigation' : '網站導覽'}</h3>
          <ul className="footer-links">
            <li><Link href={`/${locale}`}>{isEn ? 'Home' : '首頁'}</Link></li>
            <li><Link href={`/${locale}/products`}>{isEn ? 'Products' : '產品目錄'}</Link></li>
            <li><Link href={`/${locale}/about`}>{isEn ? 'About Us' : '關於我們'}</Link></li>
            <li><Link href={`/${locale}/contact`}>{isEn ? 'Contact' : '聯絡我們'}</Link></li>
          </ul>
        </div>

        {/* Column 3: Contact Info */}
        <div className="footer-col footer-col--contact">
          <h3 className="footer-col__title">{isEn ? 'Contact Info' : '聯絡資訊'}</h3>
          <ul className="footer-contact-list">
            <li>
              <span className="contact-icon-label">📧</span> 
              <a href="mailto:bounerchang@gmail.com" className="contact-link">bounerchang@gmail.com</a>
            </li>
            <li>
              <span className="contact-icon-label">📱</span> 
              <a href="https://wa.me/886930797299" target="_blank" rel="noopener noreferrer" className="contact-link">+886 930 797 299 (WhatsApp)</a>
            </li>
            <li>
              <span className="contact-icon-label">📍</span> 
              <span className="muted">
                {isEn 
                  ? 'No. 533-2, Sec. 1, Liming Rd., Nantun Dist., Taichung City, Taiwan' 
                  : '台中市南屯區黎明路一段533-2號'}
              </span>
            </li>
            <li>
              <span className="contact-icon-label">🕒</span> 
              <span className="muted">
                {isEn ? 'Mon - Fri / 09:00 - 18:00' : '週一至週五 / 09:00 - 18:00'}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <strong>{footerCopy[locale].copyright}</strong>
        <span className="footer-divider">|</span>
        <Link href={`/${locale}/legal/privacy`} className="footer-privacy-link">
          {locale === 'en' ? 'Privacy Policy' : '隱私政策'}
        </Link>
      </div>
    </footer>
  );
}
