'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * 詢價購物車項目介面
 */
export interface CartItem {
  id: string;
  modelNumber: string;
  nameZhTw: string;
  nameZhCn: string;
  nameEn: string;
  categorySlug?: string;
  subCategorySlug?: string;
  quantity: number;
}

/**
 * 詢價購物車 Context 型別定義
 */
interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  isInCart: (id: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * 詢價購物車 Provider 元件
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 元件掛載時，從 localStorage 讀取購物車狀態
  useEffect(() => {
    try {
      const saved = localStorage.getItem('xh_rfq_cart');
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage', e);
    }
    setIsInitialized(true);
  }, []);

  // 當購物車內容變更時，將其存回 localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('xh_rfq_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart, isInitialized]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: item.quantity } : i
        );
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // 回傳購物車內所有零件項目的總品項數量 (items count) 而非總數量，或者品項總類數
  // 在 B2B 中，使用品項總類數（有多少個不同產品型號）做為 Badge 數量更為合理
  const cartCount = cart.length;

  const isInCart = (id: string) => {
    return cart.some((item) => item.id === id);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        isInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

/**
 * 取得詢價購物車狀態與操作方法的 Hook
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
