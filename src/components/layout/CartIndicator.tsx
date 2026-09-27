'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { localized } from '@/lib/localized-text';
import { Icon } from '@/components/ui/Icon';

interface CartIndicatorProps {
  locale: string;
}

/**
 * 詢價車指示器元件
 */
export function CartIndicator({ locale }: CartIndicatorProps) {
  const { cartCount } = useCart();
  const [mounted, setMounted] = useState(false);

  // 防止伺服器與客戶端 React 水合不一致 (Hydration Mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div 
        className="cart-indicator-btn" 
        style={{ opacity: 0.5, pointerEvents: 'none' }}
      >
        <span className="cart-icon"><Icon name="clipboard" size={18} /></span>
      </div>
    );
  }

  return (
    <Link 
      href={`/${locale}/inquiry`} 
      className="cart-indicator-btn" 
      title={localized(locale, { 'zh-TW': '檢視詢價清單', 'zh-CN': '查看询价清单', en: 'View Inquiry List' })}
    >
      <span className="cart-icon"><Icon name="clipboard" size={18} /></span>
      {cartCount > 0 && (
        <span className="cart-badge">{cartCount}</span>
      )}
    </Link>
  );
}
