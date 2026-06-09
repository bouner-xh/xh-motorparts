'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useParams } from 'next/navigation';

interface InquiryFormProps {
  productId: string;
  productModel: string;
  productName: string;
  categorySlug: string;
  subCategorySlug: string;
}

/**
 * 產品詳細頁之「加入詢價清單」控制面板組件
 */
export function InquiryForm({
  productId,
  productModel,
  productName,
  categorySlug,
  subCategorySlug,
}: InquiryFormProps) {
  const t = useTranslations('inquiry');
  const params = useParams();
  const locale = (params.locale as string) || 'zh-TW';

  const { cart, addToCart, removeFromCart } = useCart();
  const [quantity, setQuantity] = useState<number>(100); // B2B 預設數量 100
  const [added, setAdded] = useState(false);

  // 當購物車載入後，比對此商品是否已存在
  useEffect(() => {
    const existing = cart.find((item) => item.id === productId);
    if (existing) {
      setQuantity(existing.quantity);
      setAdded(true);
    } else {
      setAdded(false);
    }
  }, [cart, productId]);

  const handleIncrement = () => {
    setQuantity((prev) => prev + 50);
  };

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(10, prev - 50));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setQuantity(Math.max(1, val));
    }
  };

  const handleAction = () => {
    if (added) {
      // 從詢價購物車中移除
      removeFromCart(productId);
      setAdded(false);
    } else {
      // 加入詢價購物車
      addToCart({
        id: productId,
        modelNumber: productModel,
        nameZhTw: locale === 'zh-TW' ? productName : '',
        nameZhCn: locale === 'zh-CN' ? productName : '',
        nameEn: locale === 'en' ? productName : '',
        categorySlug,
        subCategorySlug,
        quantity,
      });
      setAdded(true);
    }
  };

  // 即使已加入，使用者調整數量亦會自動更新到 Context 狀態中
  useEffect(() => {
    if (added) {
      addToCart({
        id: productId,
        modelNumber: productModel,
        nameZhTw: locale === 'zh-TW' ? productName : '',
        nameZhCn: locale === 'zh-CN' ? productName : '',
        nameEn: locale === 'en' ? productName : '',
        categorySlug,
        subCategorySlug,
        quantity,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, added]);

  return (
    <div className="card inquiry-form" style={{ marginTop: '1.5rem', border: '1px solid rgba(148, 163, 184, 0.25)', padding: '1.25rem' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem' }}>
        {added ? t('alreadyInCart') : t('title')}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
            {t('quantity')}
          </label>
          <div className="quantity-control">
            <button type="button" className="qty-btn" onClick={handleDecrement}>
              -
            </button>
            <input
              type="number"
              className="qty-input"
              value={quantity}
              onChange={handleQuantityChange}
              min={1}
            />
            <button type="button" className="qty-btn" onClick={handleIncrement}>
              +
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={handleAction}
            style={{
              flex: 1,
              background: added ? 'transparent' : '#dc2626',
              border: added ? '1px solid #dc2626' : 'none',
              color: added ? '#dc2626' : '#fff',
              boxShadow: added ? 'none' : '0 12px 24px rgba(220, 38, 38, 0.2)',
              fontWeight: '600',
              padding: '0.7rem 1rem',
              borderRadius: '10px'
            }}
          >
            {added ? t('removeFromCart') : t('addToCart')}
          </button>

          {added && (
            <Link
              href={`/${locale}/inquiry`}
              className="button-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.7rem 1rem',
                borderRadius: '10px',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: 'rgba(30, 41, 59, 0.6)',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              {t('viewCart')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
