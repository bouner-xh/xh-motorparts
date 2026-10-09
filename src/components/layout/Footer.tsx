import Link from 'next/link';
import {type Locale} from '@/lib/catalog';
import { localized } from '@/lib/localized-text';
import { Icon } from '@/components/ui/Icon';
import { CookieSettingsButton } from './CookieSettingsButton';

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
      <div className="footer-grid">
        {/* Column 1: Brand & Certification */}
        <div className="footer-col footer-col--brand">
          <h3 className="footer-col__title">
            {localized(locale, { 'zh-TW': '協皇企業有限公司', 'zh-CN': '协皇企业有限公司', en: 'Xie Huang Enterprise' })}
          </h3>
          <p className="muted footer-col__desc">
            {localized(locale, { 'zh-TW': '創立於 1990 年的台灣摩托車零件製造商與 B2B 外銷夥伴。我們三十年來秉持誠實工序，提供全球採購商最穩定、高品質的核心零件供應。', 'zh-CN': '创立于 1990 年的台湾摩托车零件制造商与 B2B 外销伙伴。我们三十年来秉持诚实工序，提供全球采购商最稳定、高质量的核心零件供应。', en: 'Taiwan motorcycle parts manufacturer and B2B inquiry partner since 1990. Committed to premium quality and global export service.' })}
          </p>
          <div className="footer-badge-list">
            <span className="footer-trust-badge">
              <Icon name="shield-check" size={16} className="footer-trust-badge__icon" /> {localized(locale, { 'zh-TW': '台灣在地工廠製造', 'zh-CN': '台湾本地工厂制造', en: 'Made in Taiwan Quality' })}
            </span>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div className="footer-col">
          <h3 className="footer-col__title">{localized(locale, { 'zh-TW': '網站導覽', 'zh-CN': '网站导览', en: 'Navigation' })}</h3>
          <ul className="footer-links">
            <li><Link href={`/${locale}`}>{localized(locale, { 'zh-TW': '首頁', 'zh-CN': '首页', en: 'Home' })}</Link></li>
            <li><Link href={`/${locale}/products`}>{localized(locale, { 'zh-TW': '產品目錄', 'zh-CN': '产品目录', en: 'Products' })}</Link></li>
            <li><Link href={`/${locale}/about`}>{localized(locale, { 'zh-TW': '關於我們', 'zh-CN': '关于我们', en: 'About Us' })}</Link></li>
            <li><Link href={`/${locale}/contact`}>{localized(locale, { 'zh-TW': '聯絡我們', 'zh-CN': '联系我们', en: 'Contact' })}</Link></li>
          </ul>
        </div>

        {/* Column 3: Contact Info */}
        <div className="footer-col footer-col--contact">
          <h3 className="footer-col__title">{localized(locale, { 'zh-TW': '聯絡資訊', 'zh-CN': '联系信息', en: 'Contact Info' })}</h3>
          <ul className="footer-contact-list">
            <li>
              <span className="contact-icon-label"><Icon name="mail" size={18} /></span> 
              <a href="mailto:sales@xh-motorparts.com" className="contact-link">sales@xh-motorparts.com</a>
            </li>
            <li>
              <span className="contact-icon-label"><Icon name="chat" size={18} /></span> 
              <a href="https://wa.me/886930797299" target="_blank" rel="noopener noreferrer" className="contact-link">+886 930 797 299 (WhatsApp)</a>
            </li>
            <li>
              <span className="contact-icon-label"><Icon name="map-pin" size={18} /></span> 
              <span className="muted">
                {localized(locale, { 'zh-TW': '台中市南屯區黎明路一段533-2號', 'zh-CN': '台中市南屯区黎明路一段533-2号', en: 'No. 533-2, Sec. 1, Liming Rd., Nantun Dist., Taichung City, Taiwan' })}
              </span>
            </li>
            <li>
              <span className="contact-icon-label"><Icon name="clock" size={18} /></span> 
              <span className="muted">
                {localized(locale, { 'zh-TW': '週一至週五 / 09:00 - 18:00（GMT+8）', 'zh-CN': '周一至周五 / 09:00 - 18:00（GMT+8）', en: 'Mon - Fri / 09:00 - 18:00 (GMT+8)' })}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <strong>{footerCopy[locale].copyright}</strong>
        <span className="footer-divider footer-divider--lead">|</span>
        <span className="footer-legal">
          <Link href={`/${locale}/legal/privacy`} className="footer-privacy-link">
            {localized(locale, { 'zh-TW': '隱私政策', 'zh-CN': '隐私政策', en: 'Privacy Policy' })}
          </Link>
          <span className="footer-divider">|</span>
          <CookieSettingsButton locale={locale} />
        </span>
      </div>
    </footer>
  );
}
