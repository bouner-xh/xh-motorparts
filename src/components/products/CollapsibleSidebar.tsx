'use client';

import {useState, type ReactNode} from 'react';

/**
 * 手機與平板的分類側欄收合（VI-23）：預設收合，按下才展開；桌機（>960px）由 CSS 一律攤開、不顯示按鈕
 */
export function CollapsibleSidebar({label, children}: {label: string; children: ReactNode}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`category-sidebar__collapsible${open ? ' is-open' : ''}`}>
      <button type="button" className="category-sidebar__toggle" aria-expanded={open} aria-controls="category-sidebar-list" onClick={() => setOpen((value) => !value)}>
        {label}
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {children}
    </div>
  );
}
