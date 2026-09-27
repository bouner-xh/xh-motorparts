'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 網站標頭：桌機顯示完整導覽列；768px 以下收合成 ☰ 選單（D4）
 * brand／links／cart 由伺服器端傳入，這裡只負責選單開關
 */
export function SiteHeader({
  brand,
  links,
  cart,
  menuLabel,
}: {
  brand: ReactNode;
  links: ReactNode;
  cart: ReactNode;
  menuLabel: { open: string; close: string };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 換頁後自動收合選單
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className={`site-header${open ? ' is-menu-open' : ''}`}>
      <div className="brand-row">
        {brand}
        <div className="header-actions">
          {cart}
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="site-nav"
            aria-label={open ? menuLabel.close : menuLabel.open}
            onClick={() => setOpen((value) => !value)}
          >
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      <nav id="site-nav" className="nav" style={{ alignItems: 'center' }}>
        {links}
        <div className="nav-cart" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          {cart}
        </div>
      </nav>
    </header>
  );
}
