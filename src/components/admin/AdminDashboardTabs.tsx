'use client';

// 後台分頁（A8）：總覽／詢價／產品／分類／批量匯入
// - 目前分頁記在網址 #hash，重新整理或把網址傳給同事都會停在同一頁
// - 各分頁的元件都保持掛載、只是隱藏，切換分頁不會遺失正在填寫的表單
import {useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode} from 'react';
import type {Locale} from '@/lib/catalog';
import {AdminInquiryManager} from '@/components/admin/AdminInquiryManager';
import {AdminCategoryManager} from '@/components/admin/AdminCategoryManager';
import {AdminVehicleModelManager} from '@/components/admin/AdminVehicleModelManager';
import {AdminSubCategoryManager} from '@/components/admin/AdminSubCategoryManager';
import {AdminProductImporter} from '@/components/admin/AdminProductImporter';
import {AdminProductManager} from '@/components/admin/AdminProductManager';
import {AdminOverview, type OverviewData} from '@/components/admin/AdminOverview';
import {AdminCustomerManager} from '@/components/admin/AdminCustomerManager';
import {AdminAuditLog} from '@/components/admin/AdminAuditLog';

export type AdminTab = 'overview' | 'inquiries' | 'customers' | 'products' | 'categories' | 'import' | 'audit';

const TABS: {key: AdminTab; label: string}[] = [
  {key: 'overview', label: '總覽'},
  {key: 'inquiries', label: '詢價'},
  {key: 'customers', label: '客戶'},
  {key: 'products', label: '產品'},
  {key: 'categories', label: '分類'},
  {key: 'import', label: '批量匯入'},
  {key: 'audit', label: '操作紀錄'}
];

function tabFromHash(): AdminTab {
  const hash = window.location.hash.replace('#', '');
  return TABS.some((t) => t.key === hash) ? (hash as AdminTab) : 'overview';
}

// 總覽需要的數字：詢價各狀態筆數與最新 5 筆、產品數、分類數
async function loadOverview(): Promise<OverviewData> {
  const [inqRes, prodRes, catRes] = await Promise.all([
    fetch('/api/admin/inquiries?page=1', {cache: 'no-store'}),
    fetch('/api/admin/products', {cache: 'no-store'}),
    fetch('/api/admin/categories', {cache: 'no-store'})
  ]);
  const [inq, prod, cat] = await Promise.all([inqRes.json(), prodRes.json(), catRes.json()]);
  if (!inqRes.ok || !prodRes.ok || !catRes.ok) {
    throw new Error(inq.error || prod.error || cat.error || '載入失敗');
  }
  const products = (prod.items || []) as {isActive: boolean}[];
  const categories = (cat.items || []) as {subCategoryCount?: number}[];
  return {
    inquiryCounts: inq.counts,
    latestInquiries: (inq.items || []).slice(0, 5),
    productTotal: products.length,
    productActive: products.filter((p) => p.isActive).length,
    categoryTotal: categories.length,
    subCategoryTotal: categories.reduce((sum, c) => sum + (c.subCategoryCount || 0), 0)
  };
}

export function AdminDashboardTabs({locale}: {locale: Locale}) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewError, setOverviewError] = useState('');
  const tabRefs = useRef<Record<AdminTab, HTMLButtonElement | null>>({
    overview: null,
    inquiries: null,
    customers: null,
    products: null,
    categories: null,
    import: null,
    audit: null
  });

  useEffect(() => {
    setTab(tabFromHash());
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const refreshOverview = useCallback(async () => {
    try {
      setOverview(await loadOverview());
      setOverviewError('');
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : '載入失敗');
    }
  }, []);

  // 其他分頁有變動時更新總覽與詢價分頁上的待處理數量
  useEffect(() => {
    void refreshOverview();
    const events = ['inquiries-updated', 'products-updated', 'categories-updated', 'subcategories-updated'];
    const refresh = () => void refreshOverview();
    events.forEach((name) => window.addEventListener(name, refresh));
    return () => events.forEach((name) => window.removeEventListener(name, refresh));
  }, [refreshOverview]);

  const selectTab = useCallback((next: AdminTab, focus = false) => {
    setTab(next);
    // 用 replaceState 更新網址，不會在瀏覽器上一頁堆疊很多筆紀錄
    window.history.replaceState(null, '', next === 'overview' ? window.location.pathname : `#${next}`);
    if (focus) tabRefs.current[next]?.focus();
    // 打開操作紀錄時重新載入最新紀錄
    if (next === 'audit') window.dispatchEvent(new Event('audit-tab-opened'));
    window.scrollTo({top: 0});
  }, []);

  // 其他元件要求切換分頁（例如客戶詳情 →「在詢價分頁查看」）
  useEffect(() => {
    const onNavigate = (event: Event) => {
      const next = (event as CustomEvent).detail?.tab as AdminTab | undefined;
      if (next && TABS.some((t) => t.key === next)) selectTab(next);
    };
    window.addEventListener('admin-navigate', onNavigate);
    return () => window.removeEventListener('admin-navigate', onNavigate);
  }, [selectTab]);

  // 鍵盤：左右鍵切換分頁（WAI-ARIA tabs 慣例）
  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.findIndex((t) => t.key === tab);
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      selectTab(TABS[(index + delta + TABS.length) % TABS.length].key, true);
    }
  }

  const pending = overview?.inquiryCounts?.pending ?? 0;

  const panel = (key: AdminTab, children: ReactNode) => (
    <div role="tabpanel" id={`admin-panel-${key}`} aria-labelledby={`admin-tab-${key}`} hidden={tab !== key} className="admin-tabpanel">
      {children}
    </div>
  );

  return (
    <>
      <nav className="admin-tabs" role="tablist" aria-label="後台功能">
        {TABS.map((t) => (
          <button
            key={t.key}
            ref={(el) => {
              tabRefs.current[t.key] = el;
            }}
            type="button"
            role="tab"
            id={`admin-tab-${t.key}`}
            aria-controls={`admin-panel-${t.key}`}
            aria-selected={tab === t.key}
            tabIndex={tab === t.key ? 0 : -1}
            className={`admin-tab${tab === t.key ? ' is-active' : ''}`}
            onClick={() => selectTab(t.key)}
            onKeyDown={onTabKeyDown}
          >
            {t.label}
            {t.key === 'inquiries' && pending > 0 ? (
              <span className="admin-tab__badge" aria-label={`${pending} 筆待處理`}>
                {pending}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {panel('overview', <AdminOverview data={overview} error={overviewError} onNavigate={selectTab} onRetry={refreshOverview} />)}
      {panel(
        'inquiries',
        <section className="card">
          <AdminInquiryManager />
        </section>
      )}
      {panel(
        'customers',
        <section className="card">
          <AdminCustomerManager />
        </section>
      )}
      {panel(
        'products',
        <section className="card">
          <AdminProductManager locale={locale} />
        </section>
      )}
      {panel(
        'categories',
        <>
          <section className="card">
            <AdminCategoryManager locale={locale} />
          </section>
          <section className="card" style={{marginTop: '1rem'}}>
            <AdminSubCategoryManager locale={locale} />
          </section>
          <section className="card" style={{marginTop: '1rem'}}>
            <AdminVehicleModelManager locale={locale} />
          </section>
        </>
      )}
      {panel(
        'import',
        <section className="card">
          <AdminProductImporter />
        </section>
      )}
      {panel(
        'audit',
        <section className="card">
          <AdminAuditLog />
        </section>
      )}
    </>
  );
}
