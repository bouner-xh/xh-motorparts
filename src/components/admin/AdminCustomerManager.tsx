'use client';

// 後台客戶列表（A6 ②）：詢價次數、最近詢價、所有詢價紀錄
import {useCallback, useEffect, useRef, useState} from 'react';
import {Icon} from '@/components/ui/Icon';
import type {CustomerSummary} from '@/lib/customer-summary';

type InquiryStatus = 'pending' | 'processing' | 'replied' | 'archived';
type Sort = 'recent' | 'count' | 'name';

interface CustomerInquiry {
  id: string;
  status: InquiryStatus;
  created_at: string;
  items?: {modelNumber?: string; quantity?: number}[] | null;
}

const STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: '新詢價',
  processing: '報價中',
  replied: '已回覆',
  archived: '已封存'
};

// 後台元件之間切換分頁用的事件（AdminDashboardTabs 會處理）
export function navigateAdmin(detail: {tab: 'inquiries'; q?: string} | {tab: 'customers'; email?: string}) {
  window.dispatchEvent(new CustomEvent('admin-navigate', {detail}));
}

function formatDate(value?: string, withTime = false) {
  if (!value) return '—';
  return new Date(value).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime ? {hour: '2-digit', minute: '2-digit'} : {})
  });
}

export function AdminCustomerManager() {
  const [rows, setRows] = useState<CustomerSummary[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<{customer: CustomerSummary; inquiries: CustomerInquiry[]} | null>(null);
  const [detailError, setDetailError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const params = new URLSearchParams({
    ...(keyword ? {q: keyword} : {}),
    ...(country ? {country} : {}),
    sort
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({
        ...(keyword ? {q: keyword} : {}),
        ...(country ? {country} : {}),
        sort,
        page: String(page)
      });
      const res = await fetch(`/api/admin/customers?${query}`, {cache: 'no-store'});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '無法載入客戶資料');
      setRows(data.items || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setCountries(data.countries || []);
      if (data.page && data.page !== page) setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法載入客戶資料');
    } finally {
      setLoading(false);
    }
  }, [keyword, country, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  // 有新詢價或詢價更新時，重新整理次數
  useEffect(() => {
    const reload = () => void load();
    window.addEventListener('inquiries-updated', reload);
    return () => window.removeEventListener('inquiries-updated', reload);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(keywordInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keywordInput]);

  const openDetail = useCallback(async (id: string, opener?: HTMLElement | null) => {
    openerRef.current = opener || null;
    setDetailError('');
    try {
      const res = await fetch(`/api/admin/customers?id=${encodeURIComponent(id)}`, {cache: 'no-store'});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '無法載入客戶資料');
      setSelected({customer: data.customer, inquiries: data.inquiries || []});
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : '無法載入客戶資料');
    }
  }, []);

  // 從詢價詳情點「查看客戶」時，依 Email 找到客戶並開啟
  useEffect(() => {
    const onNavigate = async (event: Event) => {
      const detail = (event as CustomEvent).detail as {tab: string; email?: string};
      if (detail?.tab !== 'customers' || !detail.email) return;
      const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(detail.email)}`, {cache: 'no-store'});
      const data = await res.json().catch(() => ({}));
      const match = (data.items as CustomerSummary[] | undefined)?.find((c) => c.email.toLowerCase() === detail.email!.toLowerCase());
      if (match) void openDetail(match.id);
      else setDetailError(`找不到 ${detail.email} 的客戶資料`);
    };
    window.addEventListener('admin-navigate', onNavigate);
    return () => window.removeEventListener('admin-navigate', onNavigate);
  }, [openDetail]);

  const closeDetail = useCallback(() => {
    setSelected(null);
    openerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!selected) return;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDetail();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected, closeDetail]);

  return (
    <div className="admin-customers">
      <div className="admin-customers__header">
        <h3>客戶列表</h3>
        <a
          href={`/api/admin/customers/export?${params}`}
          download
          className="admin-export-link"
          title="匯出的檔案含客戶個資，請妥善保管，不要轉寄給外部人員"
          aria-disabled={total === 0}
          onClick={(e) => {
            if (total === 0) e.preventDefault();
          }}
        >
          匯出 CSV（{total} 筆）
        </a>
      </div>
      <p className="muted admin-customers__hint">每次詢價會依 Email 自動建立或更新客戶資料；同一家公司用不同 Email 會列為不同客戶。</p>

      <div className="admin-customers__toolbar">
        <input
          type="search"
          aria-label="搜尋客戶"
          placeholder="搜尋公司、聯絡人、Email、電話或詢價過的型號"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
        />
        <select
          aria-label="依國家篩選"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setPage(1);
          }}
        >
          <option value="">全部國家</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          aria-label="排序"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as Sort);
            setPage(1);
          }}
        >
          <option value="recent">最近詢價</option>
          <option value="count">詢價次數</option>
          <option value="name">公司名稱</option>
        </select>
      </div>

      {error || detailError ? (
        <div role="alert" className="admin-customers__error">
          {error || detailError}
        </div>
      ) : null}

      {loading ? (
        <p className="muted">載入客戶中...</p>
      ) : rows.length === 0 ? (
        <div className="card admin-customers__empty">
          <Icon name="clipboard" size={36} />
          <p className="muted">{keyword || country ? '沒有符合條件的客戶。' : '目前還沒有客戶資料，買家送出詢價後會自動建立。'}</p>
        </div>
      ) : (
        <div className="admin-customers__table">
          <table>
            <thead>
              <tr>
                <th>公司／聯絡人</th>
                <th>國家</th>
                <th className="num">詢價次數</th>
                <th>最近詢價</th>
                <th>常詢價型號</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.companyName || c.name}</strong>
                    <div className="muted small">
                      {c.name} · {c.email}
                    </div>
                  </td>
                  <td>{c.country || '—'}</td>
                  <td className="num">
                    {c.inquiryCount}
                    {c.pendingCount > 0 ? <span className="admin-status admin-status--pending admin-customers__pending">{c.pendingCount} 待處理</span> : null}
                  </td>
                  <td>{formatDate(c.lastInquiryAt)}</td>
                  <td className="small">{c.topModels.slice(0, 3).join('、') || '—'}</td>
                  <td>
                    <button type="button" className="admin-customers__view" onClick={(e) => void openDetail(c.id, e.currentTarget)}>
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 0 ? (
        <div className="admin-customers__pager">
          <span className="muted">
            共 {total} 位客戶，第 {page} / {totalPages} 頁
          </span>
          <div>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              上一頁
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              下一頁
            </button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="admin-modal" onClick={(e) => e.target === e.currentTarget && closeDetail()}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="customer-detail-title" tabIndex={-1} className="card admin-modal__panel">
            <h3 id="customer-detail-title">{selected.customer.companyName || selected.customer.name}</h3>
            <dl className="admin-customers__info">
              <dt>聯絡人</dt>
              <dd>{selected.customer.name || '—'}</dd>
              <dt>Email</dt>
              <dd>{selected.customer.email}</dd>
              <dt>國家</dt>
              <dd>{selected.customer.country || '—'}</dd>
              <dt>電話</dt>
              <dd>{selected.customer.phone || '—'}</dd>
              <dt>詢價</dt>
              <dd>
                共 {selected.customer.inquiryCount} 次，首次 {formatDate(selected.customer.firstInquiryAt)}，最近 {formatDate(selected.customer.lastInquiryAt)}
              </dd>
            </dl>

            <h4>詢價紀錄</h4>
            {selected.inquiries.length ? (
              <ul className="admin-customers__history">
                {selected.inquiries.map((inq) => (
                  <li key={inq.id}>
                    <span className="small">{formatDate(inq.created_at, true)}</span>
                    <span className={`admin-status admin-status--${inq.status}`}>{STATUS_LABELS[inq.status]}</span>
                    <span className="small">{(inq.items || []).map((i) => `${i.modelNumber} × ${i.quantity}`).join('、') || '—'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">沒有詢價紀錄。</p>
            )}

            <div className="admin-modal__actions">
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  const email = selected.customer.email;
                  closeDetail();
                  navigateAdmin({tab: 'inquiries', q: email});
                }}
              >
                在詢價分頁查看
              </button>
              <button type="button" onClick={closeDetail}>
                關閉
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
