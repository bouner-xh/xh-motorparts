'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

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
        <span className="cart-icon">📋</span>
      </div>
    );
  }

  return (
    <Link 
      href={`/${locale}/inquiry`} 
      className="cart-indicator-btn" 
      title={locale === 'en' ? 'View Inquiry List' : '檢視詢價清單'}
    >
      <span className="cart-icon">📋</span>
      {cartCount > 0 && (
        <span className="cart-badge">{cartCount}</span>
      )}
    </Link>
  );
}
