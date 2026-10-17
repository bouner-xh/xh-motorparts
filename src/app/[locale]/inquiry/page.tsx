'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { localized } from '@/lib/localized-text';
import { Icon } from '@/components/ui/Icon';
import { INQUIRY_LIMITS } from '@/lib/inquiry-limits';
import { inquiryErrorMessageKey } from '@/lib/inquiry-errors';

// 買家聯絡欄位（受控欄位：送出失敗時保留內容，切換語言時以 sessionStorage 暫存草稿）
const EMPTY_FIELDS = { name: '', email: '', companyName: '', country: '', phone: '', message: '' };
type FieldName = keyof typeof EMPTY_FIELDS;

// 草稿只存欄位文字，不存 Turnstile token；只放在 sessionStorage（關閉分頁即消失），送出成功後清除
const DRAFT_KEY = 'xh_inquiry_draft';

function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const draft = { ...EMPTY_FIELDS };
    for (const key of Object.keys(EMPTY_FIELDS) as FieldName[]) {
      if (typeof parsed[key] === 'string') draft[key] = (parsed[key] as string).slice(0, INQUIRY_LIMITS[key]);
    }
    return draft;
  } catch {
    return null;
  }
}

function writeDraft(fields: typeof EMPTY_FIELDS) {
  try {
    if (Object.values(fields).every((v) => !v)) sessionStorage.removeItem(DRAFT_KEY);
    else sessionStorage.setItem(DRAFT_KEY, JSON.stringify(fields));
  } catch {
    // 瀏覽器不允許寫入（無痕模式、容量已滿）時不影響填寫
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // 忽略
  }
}

/**
 * B2B RFQ 詢價車詳情與客戶聯絡資料提交頁面
 */
export default function InquiryCartPage() {
  const t = useTranslations('inquiry');
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [summary, setSummary] = useState<{ count: number; email: string; confirmationSent: boolean; inquiryNo: string | null } | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // 掛載後還原草稿（不在初始渲染讀取，避免伺服器與瀏覽器畫面不一致）
  useEffect(() => {
    const draft = readDraft();
    if (draft) setFields(draft);
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (draftLoaded && !isSuccess) writeDraft(fields);
  }, [fields, draftLoaded, isSuccess]);

  // 出現錯誤訊息時捲入視野
  useEffect(() => {
    if (errorMessage) errorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [errorMessage]);

  const handleField = (name: FieldName) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((prev) => ({ ...prev, [name]: e.target.value }));
  };

  // Turnstile token 只能使用一次：送出失敗後必須重置 widget 並清空 token，讓買家重新驗證
  const resetCaptcha = () => {
    setToken('');
    turnstileRef.current?.reset();
  };

  const handleQtyChange = (id: string, value: number) => {
    updateQuantity(id, value);
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    // 不使用 <form action>：React 19 在 action 結束後會重設非受控欄位，失敗時買家填的內容會全部消失
    event.preventDefault();
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage('');

    const payload = {
      ...fields,
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

      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        setSummary({
          count: Number(result.itemCount) || cart.length,
          email: fields.email,
          confirmationSent: result.confirmationSent === true,
          inquiryNo: typeof result.inquiryNo === 'string' ? result.inquiryNo : null,
        });
        clearDraft();
        setIsSuccess(true);
        clearCart();
      } else {
        // 依 API 的錯誤代碼顯示買家語系的訊息（含備用聯絡方式）
        setErrorMessage(t(`errors.${inquiryErrorMessageKey(result.code)}`));
        setIsSubmitting(false);
        resetCaptcha();
      }
    } catch (e) {
      console.error(e);
      setErrorMessage(t('errors.network'));
      setIsSubmitting(false);
      resetCaptcha();
    }
  }

  // 成功送出畫面
  if (isSuccess) {
    return (
      <main className="container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <article className="card" style={{ maxWidth: '550px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', color: '#10b981', marginBottom: '1rem' }}>✓</div>
          <h1 style={{ fontSize: '1.75rem', marginTop: '0.83em', marginBottom: '0.8rem' }}>{t('inquirySuccess')}</h1>
          {summary && (
            <div data-testid="inquiry-success-summary" style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
              {summary.inquiryNo && <p style={{ margin: '0 0 0.4rem', fontWeight: 600 }}>{t('inquiryNumber', { number: summary.inquiryNo })}</p>}
              <p style={{ margin: '0 0 0.4rem' }}>
                {summary.confirmationSent
                  ? t('successSummary', { count: summary.count, email: summary.email })
                  : t('successSummaryNoEmail', { count: summary.count })}
              </p>
              <p className="muted" style={{ margin: 0 }}>{t('replyTime')}</p>
            </div>
          )}
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
                  <th style={{ textAlign: 'center' }}></th>
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
                      <td className="cart-row__remove" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="remove-btn"
                          style={{ whiteSpace: 'nowrap' }}
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
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <label>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                {t('name')} <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <input name="name" value={fields.name} onChange={handleField('name')} type="text" required maxLength={INQUIRY_LIMITS.name} placeholder="e.g. Mr. Chen" />
            </label>

            <label>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                {t('email')} <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <input name="email" value={fields.email} onChange={handleField('email')} type="email" required maxLength={INQUIRY_LIMITS.email} placeholder="e.g. buyer@company.com" />
            </label>

            <label>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                {t('companyName')} <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <input name="companyName" value={fields.companyName} onChange={handleField('companyName')} type="text" required maxLength={INQUIRY_LIMITS.companyName} placeholder="e.g. Motor Parts Trading Co." />
            </label>

            <label>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                {t('country')} <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <input name="country" value={fields.country} onChange={handleField('country')} type="text" required maxLength={INQUIRY_LIMITS.country} placeholder="e.g. Germany / Vietnam" />
            </label>

            <label>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{t('phone')}</span>
              <input name="phone" value={fields.phone} onChange={handleField('phone')} type="text" maxLength={INQUIRY_LIMITS.phone} placeholder="e.g. +886 4 12345678" />
            </label>

            <label>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{t('messageLabel')}</span>
              <textarea
                name="message"
                value={fields.message}
                onChange={handleField('message')}
                rows={4}
                maxLength={INQUIRY_LIMITS.message}
                placeholder={
                  localized(locale, { 'zh-TW': '請詳述您適用的摩托車車型、包裝需求或 OEM 特殊規格...', 'zh-CN': '请详述您适用的摩托车车型、包装需求或 OEM 特殊规格...', en: 'Please specify motorcycle models, OEM numbers, or packing requirements...' })
                }
              />
            </label>

            {siteKey ? (
              <div style={{ marginTop: '0.5rem' }}>
                <Turnstile
                  ref={turnstileRef}
                  siteKey={siteKey}
                  onSuccess={(v) => setToken(v)}
                  // token 過期或驗證出錯時清空，按鈕變灰並提示重新驗證
                  onExpire={() => { setToken(''); setErrorMessage(t('captchaExpired')); }}
                  onError={() => setToken('')}
                />
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

            {siteKey && !token && !isSubmitting && (
              <p className="muted" data-testid="captcha-required" style={{ fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>{t('captchaRequired')}</p>
            )}

            {errorMessage && (
              <p
                ref={errorRef}
                role="alert"
                data-testid="inquiry-error"
                style={{ margin: 0, padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(248, 113, 113, 0.4)', background: 'rgba(127, 29, 29, 0.22)', color: '#fca5a5', fontSize: '0.9rem', lineHeight: 1.5 }}
              >
                {errorMessage}
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
