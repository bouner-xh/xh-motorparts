'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface InquiryItem {
  productId: string;
  modelNumber: string;
  nameZhTw?: string;
  nameZhCn?: string;
  nameEn?: string;
  quantity: number;
}

interface Inquiry {
  id: string;
  customer_name: string;
  customer_email: string;
  company_name: string;
  country: string;
  phone?: string;
  message?: string;
  items: InquiryItem[];
  status: 'pending' | 'processing' | 'replied' | 'archived';
  reply_notes?: string;
  created_at: string;
  updated_at?: string;
}

type StatusFilter = 'all' | Inquiry['status'];
type Counts = Record<StatusFilter, number>;

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '新詢價' },
  { key: 'processing', label: '報價中' },
  { key: 'replied', label: '已回覆' },
  { key: 'archived', label: '已封存' },
];

const EMPTY_COUNTS: Counts = { all: 0, pending: 0, processing: 0, replied: 0, archived: 0 };

function formatDateTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/**
 * 後台 RFQ / CRM 詢價管理中心
 */
export function AdminInquiryManager() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  // 錯誤與操作結果顯示在面板內，不取代整個面板、不用瀏覽器彈窗（A6）
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [editStatus, setEditStatus] = useState<Inquiry['status']>('pending');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  // 篩選、搜尋與分頁（A6）
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const dialogRef = useRef<HTMLDivElement>(null);
  const exportParams = new URLSearchParams({
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(keyword ? { q: keyword } : {}),
  }).toString();
  const openerRef = useRef<HTMLElement | null>(null);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (keyword) params.set('q', keyword);
      const res = await fetch(`/api/admin/inquiries?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setInquiries(data.items || []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setCounts({ ...EMPTY_COUNTS, ...data.counts });
        if (data.page && data.page !== page) setPage(data.page);
      } else {
        setError(data.error || '無法載入詢價單');
      }
    } catch {
      setError('載入時發生網路錯誤');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, keyword]);

  useEffect(() => {
    void fetchInquiries();
  }, [fetchInquiries]);

  // 輸入關鍵字 0.3 秒後才搜尋，避免每打一個字就查詢一次
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(keywordInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keywordInput]);

  const handleOpenDetail = (inq: Inquiry, opener: HTMLElement) => {
    openerRef.current = opener;
    setSelectedInquiry(inq);
    setEditStatus(inq.status);
    setEditNotes(inq.reply_notes || '');
    setModalError('');
  };

  const handleCloseDetail = useCallback(() => {
    setSelectedInquiry(null);
    // 關閉後把焦點還給原本的「檢視」按鈕，鍵盤操作不會跳回頁首
    openerRef.current?.focus();
  }, []);

  // 詳情視窗：開啟時移入焦點，按 Esc 關閉（A6）
  useEffect(() => {
    if (!selectedInquiry) return;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleCloseDetail();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedInquiry, handleCloseDetail]);

  const handleSave = async () => {
    if (!selectedInquiry) return;
    setSaving(true);
    setModalError('');
    try {
      const res = await fetch('/api/admin/inquiries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInquiry.id,
          status: editStatus,
          replyNotes: editNotes,
        }),
      });

      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        handleCloseDetail();
        setNotice(`已更新 ${selectedInquiry.company_name || selectedInquiry.customer_name} 的詢價單`);
        // 狀態改變會影響篩選結果與各狀態筆數，重新載入
        await fetchInquiries();
        window.dispatchEvent(new Event('inquiries-updated'));
      } else {
        setModalError(d.error || '儲存失敗');
      }
    } catch {
      setModalError('連線失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inq: Inquiry) => {
    if (!confirm(`確定要刪除 ${inq.company_name || inq.customer_name} 的詢價紀錄嗎？此動作無法復原。`)) return;
    setError('');
    try {
      const res = await fetch(`/api/admin/inquiries?id=${encodeURIComponent(inq.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotice('詢價紀錄已刪除');
        await fetchInquiries();
        window.dispatchEvent(new Event('inquiries-updated'));
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || '刪除失敗');
      }
    } catch {
      setError('刪除時連線失敗');
    }
  };

  const getStatusLabel = (status: Inquiry['status']) => {
    switch (status) {
      case 'pending':
        return { text: '新詢價 (Pending)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'processing':
        return { text: '報價中 (Processing)', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'replied':
        return { text: '已回覆 (Replied)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'archived':
        return { text: '已封存 (Archived)', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' };
    }
  };

  return (
    <div className="admin-crm-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
          詢價管理中心 (CRM)
          {counts.pending > 0 ? (
            <span data-testid="pending-count" style={{ marginLeft: '0.6rem', padding: '0.15rem 0.55rem', borderRadius: '999px', background: '#f59e0b', color: '#111827', fontSize: '0.85rem', verticalAlign: 'middle' }}>
              {counts.pending} 筆待處理
            </span>
          ) : null}
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* 匯出目前篩選的結果（A6 ①）；檔案含客戶個資 */}
          <a
            href={`/api/admin/inquiries/export?${exportParams}`}
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
          <button
            type="button"
            onClick={() => void fetchInquiries()}
            style={{
              padding: '0.4rem 0.8rem',
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              fontSize: '0.85rem',
              borderRadius: '6px',
              boxShadow: 'none',
            }}
          >
            重新整理
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <div role="tablist" aria-label="依狀態篩選" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const active = statusFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStatusFilter(f.key);
                  setPage(1);
                }}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.85rem',
                  borderRadius: '999px',
                  boxShadow: 'none',
                  background: active ? '#dc2626' : 'rgba(30, 41, 59, 0.6)',
                  border: `1px solid ${active ? '#dc2626' : 'rgba(148, 163, 184, 0.2)'}`,
                  color: '#f8fafc',
                }}
              >
                {f.label} {counts[f.key]}
              </button>
            );
          })}
        </div>
        <input
          type="search"
          aria-label="搜尋詢價單"
          placeholder="搜尋公司、聯絡人、Email、國家或型號"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          style={{ flex: '1 1 240px', minWidth: 0, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.25)', background: 'rgba(15, 23, 42, 0.75)', color: '#f8fafc' }}
        />
      </div>

      {error ? (
        <div role="alert" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid rgba(248, 113, 113, 0.4)', background: 'rgba(127, 29, 29, 0.22)', color: '#fca5a5' }}>
          {error}
        </div>
      ) : null}
      {notice && !error ? (
        <div role="status" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.45)', background: 'rgba(6, 78, 59, 0.24)' }}>
          {notice}
        </div>
      ) : null}

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>載入詢價單中...</div>
      ) : inquiries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Icon name="clipboard" size={40} />
          <p className="muted" style={{ margin: '1rem 0 0' }}>
            {keyword || statusFilter !== 'all' ? '沒有符合條件的詢價單。' : '目前尚無任何詢價請求紀錄。'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.12)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'rgba(15, 23, 42, 0.3)' }}>
            <thead>
              <tr style={{ background: 'rgba(30, 41, 59, 0.4)' }}>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#94a3b8' }}>日期</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#94a3b8' }}>買家聯絡人 / 公司</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#94a3b8' }}>國家</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#94a3b8' }}>狀態</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => {
                const badge = getStatusLabel(inq.status);
                const dateString = formatDateTime(inq.created_at);

                return (
                  <tr key={inq.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{dateString}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{inq.customer_name}</div>
                      <div className="muted" style={{ fontSize: '0.8rem' }}>
                        {inq.company_name} · <a href={`mailto:${inq.customer_email}`} style={{ textDecoration: 'underline', color: '#dc2626' }}>{inq.customer_email}</a>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{inq.country}</td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          color: badge.color,
                          backgroundColor: badge.bg,
                        }}
                      >
                        {badge.text}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'end' }}>
                        <button
                          type="button"
                          onClick={(e) => handleOpenDetail(inq, e.currentTarget)}
                          style={{
                            padding: '0.35rem 0.7rem',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            color: '#60a5fa',
                            boxShadow: 'none',
                          }}
                        >
                          檢視
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(inq)}
                          style={{
                            padding: '0.35rem 0.7rem',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            boxShadow: 'none',
                          }}
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 0 ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.9rem' }}>
          <span className="muted">共 {total} 筆，第 {page} / {totalPages} 頁</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ padding: '0.35rem 0.8rem', opacity: page <= 1 ? 0.5 : 1 }}>
              上一頁
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ padding: '0.35rem 0.8rem', opacity: page >= totalPages ? 0.5 : 1 }}>
              下一頁
            </button>
          </div>
        </div>
      ) : null}

      {/* Modal 詢價詳情彈出視窗 */}
      {selectedInquiry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(2, 6, 23, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-detail-title"
            tabIndex={-1}
            className="card"
            style={{
              outline: 'none',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              padding: '1.75rem',
              position: 'relative',
              animation: 'fadeIn 0.25s ease-out',
            }}
          >
            <h3 id="inquiry-detail-title" style={{ margin: '0 0 0.5rem 0', fontSize: '1.35rem' }}>詢價單詳情</h3>
            <p className="muted" style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem' }}>
              建立：{formatDateTime(selectedInquiry.created_at)}　最後更新：{formatDateTime(selectedInquiry.updated_at)}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <p className="muted" style={{ margin: '0 0 0.25rem', fontSize: '0.8rem' }}>買家姓名</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{selectedInquiry.customer_name}</p>
              </div>
              <div>
                <p className="muted" style={{ margin: '0 0 0.25rem', fontSize: '0.8rem' }}>買家信箱</p>
                <p style={{ margin: 0 }}>
                  <a href={`mailto:${selectedInquiry.customer_email}`} style={{ color: '#dc2626', textDecoration: 'underline' }}>
                    {selectedInquiry.customer_email}
                  </a>
                </p>
              </div>
              <div>
                <p className="muted" style={{ margin: '0 0 0.25rem', fontSize: '0.8rem' }}>公司名稱</p>
                <p style={{ margin: 0 }}>{selectedInquiry.company_name}</p>
              </div>
              <div>
                <p className="muted" style={{ margin: '0 0 0.25rem', fontSize: '0.8rem' }}>國家 / 電話</p>
                <p style={{ margin: 0 }}>
                  {selectedInquiry.country} {selectedInquiry.phone ? `(${selectedInquiry.phone})` : ''}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <p className="muted" style={{ margin: '0 0 0.4rem', fontSize: '0.8rem' }}>需求備註內容</p>
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  fontSize: '0.9rem',
                  whiteSpace: 'pre-line',
                  lineHeight: '1.5',
                }}
              >
                {selectedInquiry.message || '（無備註內容）'}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p className="muted" style={{ margin: '0 0 0.5rem', fontSize: '0.8rem' }}>詢價產品清單</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid rgba(148, 163, 184, 0.2)', textAlign: 'left' }}>
                    <th style={{ paddingBottom: '0.5rem' }}>產品型號 (Model Number)</th>
                    <th style={{ paddingBottom: '0.5rem' }}>產品名稱 (Name)</th>
                    <th style={{ paddingBottom: '0.5rem', textAlign: 'right' }}>詢價數量 (Qty)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInquiry.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>{item.modelNumber}</td>
                      <td style={{ padding: '0.5rem 0' }}>{item.nameZhTw || item.nameEn || item.nameZhCn || 'N/A'}</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 'bold' }}>{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid rgba(148, 163, 184, 0.12)', margin: '1.5rem 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <label>
                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#94a3b8' }}>跟進狀態</span>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Inquiry['status'])}
                  style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    color: '#f8fafc',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    width: '100%',
                  }}
                >
                  <option value="pending">新詢價 (Pending)</option>
                  <option value="processing">報價中 (Processing)</option>
                  <option value="replied">已回覆 (Replied)</option>
                  <option value="archived">已封存 (Archived)</option>
                </select>
              </label>

              <label>
                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#94a3b8' }}>處理備忘錄 (內部註記)</span>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  placeholder="可在此輸入給客戶報價單的編號、回覆時間、聯絡備註等內部資訊..."
                  style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    color: '#f8fafc',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    width: '100%',
                  }}
                />
              </label>
            </div>

            {modalError ? (
              <p role="alert" style={{ margin: '0 0 1rem', color: '#fca5a5' }}>
                {modalError}
              </p>
            ) : null}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'end' }}>
              <button
                type="button"
                onClick={handleCloseDetail}
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  color: '#e2e8f0',
                  boxShadow: 'none',
                  padding: '0.5rem 1.25rem',
                }}
              >
                關閉
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  padding: '0.5rem 1.25rem',
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? '儲存中...' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
