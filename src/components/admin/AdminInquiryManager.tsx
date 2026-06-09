'use client';

import { useEffect, useState } from 'react';

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
}

/**
 * 後台 RFQ / CRM 詢價管理中心
 */
export function AdminInquiryManager() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [editStatus, setEditStatus] = useState<Inquiry['status']>('pending');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInquiries();
  }, []);

  async function fetchInquiries() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/inquiries');
      const data = await res.json();
      if (res.ok) {
        setInquiries(data.items || []);
      } else {
        setError(data.error || '無法載入詢價單');
      }
    } catch {
      setError('載入時發生網路錯誤');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenDetail = (inq: Inquiry) => {
    setSelectedInquiry(inq);
    setEditStatus(inq.status);
    setEditNotes(inq.reply_notes || '');
  };

  const handleCloseDetail = () => {
    setSelectedInquiry(null);
  };

  const handleSave = async () => {
    if (!selectedInquiry) return;
    setSaving(true);
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

      if (res.ok) {
        setInquiries((prev) =>
          prev.map((i) =>
            i.id === selectedInquiry.id
              ? { ...i, status: editStatus, reply_notes: editNotes }
              : i
          )
        );
        handleCloseDetail();
      } else {
        const d = await res.json();
        alert(d.error || '儲存失敗');
      }
    } catch {
      alert('連線失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('您確定要刪除這筆詢價紀錄嗎？此動作無法復原。')) return;
    try {
      const res = await fetch(`/api/admin/inquiries?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setInquiries((prev) => prev.filter((i) => i.id !== id));
      } else {
        const d = await res.json();
        alert(d.error || '刪除失敗');
      }
    } catch {
      alert('刪除時連線失敗');
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

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>載入詢價單中...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444', textAlign: 'center' }}>{error}</div>;

  return (
    <div className="admin-crm-panel" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>詢價管理中心 (CRM)</h3>
        <button
          onClick={fetchInquiries}
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

      {inquiries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <span style={{ fontSize: '2.5rem' }}>📋</span>
          <p className="muted" style={{ margin: '1rem 0 0' }}>目前尚無任何詢價請求紀錄。</p>
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
                const dateString = new Date(inq.created_at).toLocaleDateString('zh-TW', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                });

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
                          onClick={() => handleOpenDetail(inq)}
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
                          onClick={() => handleDelete(inq.id)}
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
            className="card"
            style={{
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
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.35rem' }}>詢價單詳情</h3>

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
