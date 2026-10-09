'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Turnstile } from '@marsidev/react-turnstile';
import { localized } from '@/lib/localized-text';
import { Icon } from '@/components/ui/Icon';
import { INQUIRY_LIMITS } from '@/lib/inquiry-limits';

/**
 * B2B RFQ 詢價車詳情與客戶聯絡資料提交頁面
 */
export default function InquiryCartPage() {
  const t = useTranslations('inquiry');
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();
  const [status, setStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleQtyChange = (id: string, value: number) => {
    updateQuantity(id, value);
  };

  async function onSubmit(formData: FormData) {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setStatus(t('sending'));

    const payload = {
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      companyName: String(formData.get('companyName') || ''),
      country: String(formData.get('country') || ''),
      phone: String(formData.get('phone') || ''),
      message: String(formData.get('message') || ''),
      items: cart.map((item) => ({
        productId: item.id,
        modelNumber: item.modelNumber,
        nameZhTw: item.nameZhTw,
        nameZhCn: item.nameZhCn,
        nameEn: item.nameEn,
        quantity: item.quantity,
      })),
      turnstileToken: token,
    };

    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok) {
        setStatus(t('success'));
        setIsSuccess(true);
        clearCart();
      } else {
        setStatus(result.error || t('error'));
        setIsSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      setStatus(t('error'));
      setIsSubmitting(false);
    }
  }

  // 成功送出畫面
  if (isSuccess) {
    return (
      <main className="container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <article className="card" style={{ maxWidth: '550px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', color: '#10b981', marginBottom: '1rem' }}>✓</div>
          <h1 style={{ fontSize: '1.75rem', marginTop: '0.83em', marginBottom: '0.8rem' }}>{t('inquirySuccess')}</h1>
          <p className="muted" style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
            {localized(locale, { 'zh-TW': '感謝您的洽詢，我們已收到您的詢價單，系統已自動發送確認信至您的信箱，協皇業務團隊將儘速與您聯繫。', 'zh-CN': '感谢您的洽询，我们已收到您的询价单，系统已自动发送确认信至您的邮箱，协皇业务团队将尽快与您联系。', en: 'Thank you for your interest. A confirmation email has been sent to your mailbox. Our sales team will get back to you shortly.' })}
          </p>
          <Link href={`/${locale}/products`} className="button" style={{ display: 'inline-block', textDecoration: 'none' }}>
            {t('browseProducts')}
          </Link>
        </article>
      </main>
    );
  }

  // 空購物車畫面
  if (cart.length === 0) {
    return (
      <main className="container" style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <article className="card" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ color: '#94a3b8', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><Icon name="clipboard" size={48} /></div>
          <h1 style={{ fontSize: '1.5rem', marginTop: '0.83em', marginBottom: '0.8rem' }}>{t('cartEmpty')}</h1>
          <p className="muted" style={{ marginBottom: '2rem' }}>
            {localized(locale, { 'zh-TW': '送出詢價前，請先至產品目錄將感興趣的零件型號加入清單。', 'zh-CN': '提交询价前，请先至产品目录将感兴趣的零件型号加入清单。', en: 'Please add motorcycle parts to your inquiry list before submitting.' })}
          </p>
          <Link href={`/${locale}/products`} className="button" style={{ display: 'inline-block', textDecoration: 'none' }}>
            {t('browseProducts')}
          </Link>
        </article>
      </main>
    );
  }

  return (
    <main className="container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>{t('inquiryListTitle')}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {localized(locale, { 'zh-TW': '調整零件詢價數量並填寫買家聯絡資訊，一鍵送出以取得專業報價。', 'zh-CN': '调整零件询价数量并填写买家联系信息，一键提交以获取专业报价。', en: 'Adjust quantities and fill out contact details to request a professional quote.' })}
        </p>
      </div>

      <div className="inquiry-grid">
        {/* 詢價零件清單 */}
        <section className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="inquiry-cart-table">
              <thead>
                <tr>
                  <th>{t('productModel')}</th>
                  <th>{t('productName')}</th>
                  <th style={{ width: '150px' }}>{t('quantity')}</th>
                  <th style={{ width: '80px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => {
                  const displayName =
                    locale === 'zh-TW'
                      ? item.nameZhTw
                      : locale === 'zh-CN'
                      ? item.nameZhCn
                      : item.nameEn;

                  return (
                    <tr key={item.id} className="cart-row">
                      <td className="cart-row__model" style={{ fontWeight: 'bold' }}>{item.modelNumber}</td>
                      <td className="cart-row__name">{displayName || item.nameZhTw || item.nameEn}</td>
                      <td className="cart-row__qty">
                        <div className="quantity-control">
                          <button
                            type="button"
                            className="qty-btn"
                            aria-label="-50"
                            onClick={() => handleQtyChange(item.id, item.quantity - 50)}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            className="qty-input"
                            value={item.quantity}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!isNaN(v)) handleQtyChange(item.id, v);
                            }}
                          />
                          <button
                            type="button"
                            className="qty-btn"
                            aria-label="+50"
                            onClick={() => handleQtyChange(item.id, item.quantity + 50)}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="cart-row__remove" style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeFromCart(item.id)}
                        >
                          {t('removeFromCart')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 買家資訊表單 */}
        <section className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem' }}>{t('contactInfoTitle')}</h3>
          <form action={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <label>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                {t('name')} <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <input name="name" type="text" required maxLength={INQUIRY_LIMITS.name} placeholder="e.g. Mr. Chen" />
            </label>

            <label>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                {t('email')} <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <input name="email" type="email" required maxLength={INQUIRY_LIMITS.email} placeholder="e.g. buyer@company.com" />
            </label>

            <label>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                {t('companyName')} <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <input name="companyName" type="text" required maxLength={INQUIRY_LIMITS.companyName} placeholder="e.g. Motor Parts Trading Co." />
            </label>

            <label>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                {t('country')} <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <input name="country" type="text" required maxLength={INQUIRY_LIMITS.country} placeholder="e.g. Germany / Vietnam" />
            </label>

            <label>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{t('phone')}</span>
              <input name="phone" type="text" maxLength={INQUIRY_LIMITS.phone} placeholder="e.g. +886 4 12345678" />
            </label>

            <label>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{t('messageLabel')}</span>
              <textarea
                name="message"
                rows={4}
                maxLength={INQUIRY_LIMITS.message}
                placeholder={
                  localized(locale, { 'zh-TW': '請詳述您適用的摩托車車型、包裝需求或 OEM 特殊規格...', 'zh-CN': '请详述您适用的摩托车车型、包装需求或 OEM 特殊规格...', en: 'Please specify motorcycle models, OEM numbers, or packing requirements...' })
                }
              />
            </label>

            {siteKey ? (
              <div style={{ marginTop: '0.5rem' }}>
                <Turnstile siteKey={siteKey} onSuccess={(v) => setToken(v)} />
              </div>
            ) : (
              <p className="muted" style={{ fontSize: '0.85rem' }}>{t('captchaPending')}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || (siteKey ? !token : false)}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                opacity: isSubmitting || (siteKey ? !token : false) ? 0.6 : 1,
                cursor: isSubmitting || (siteKey ? !token : false) ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? t('sending') : t('submitInquiry')}
            </button>

            {status && <p className="muted" style={{ fontSize: '0.9rem', textAlign: 'center', marginTop: '0.5rem' }}>{status}</p>}
          </form>
        </section>
      </div>
    </main>
  );
}
