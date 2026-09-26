'use client';

import { useTranslations } from 'next-intl';
import { useCart } from '@/context/CartContext';
import type { Locale } from '@/lib/catalog';

// 與產品詳細頁相同的 B2B 預設數量，加入後可在詢價頁調整
const DEFAULT_QUANTITY = 100;

/**
 * 產品列表卡片上的「加入詢價清單」按鈕：不用進入產品頁即可加入或移除
 */
export function ProductCardInquiryButton({
  productId,
  productModel,
  productName,
  locale,
  categorySlug,
  subCategorySlug,
}: {
  productId: string;
  productModel: string;
  productName: string;
  locale: Locale;
  categorySlug: string;
  subCategorySlug: string;
}) {
  const t = useTranslations('inquiry');
  const { addToCart, removeFromCart, isInCart } = useCart();
  const added = isInCart(productId);

  const handleClick = () => {
    if (added) {
      removeFromCart(productId);
      return;
    }

    addToCart({
      id: productId,
      modelNumber: productModel,
      nameZhTw: locale === 'zh-TW' ? productName : '',
      nameZhCn: locale === 'zh-CN' ? productName : '',
      nameEn: locale === 'en' ? productName : '',
      categorySlug,
      subCategorySlug,
      quantity: DEFAULT_QUANTITY,
    });
  };

  return (
    <button
      type="button"
      className={`product-card__inquiry${added ? ' is-added' : ''}`}
      aria-pressed={added}
      onClick={handleClick}
    >
      {added ? t('addedToCart') : t('addToCart')}
    </button>
  );
}
