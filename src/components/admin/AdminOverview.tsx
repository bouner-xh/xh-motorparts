'use client';

// 後台總覽（A8）：待處理詢價、產品與分類筆數、最新詢價
import type {AdminTab} from '@/components/admin/AdminDashboardTabs';

type InquiryStatus = 'pending' | 'processing' | 'replied' | 'archived';

export interface OverviewData {
  inquiryCounts: Record<'all' | InquiryStatus, number>;
  latestInquiries: {id: string; created_at: string; company_name?: string; customer_name: string; country?: string; status: InquiryStatus}[];
  productTotal: number;
  productActive: number;
  categoryTotal: number;
  subCategoryTotal: number;
}

const STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: '新詢價',
  processing: '報價中',
  replied: '已回覆',
  archived: '已封存'
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-TW', {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'});
}

export function AdminOverview({
  data,
  error,
  onNavigate,
  onRetry
}: {
  data: OverviewData | null;
  error: string;
  onNavigate: (tab: AdminTab) => void;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div role="alert" className="card admin-overview__error">
        總覽資料載入失敗：{error}
        <button type="button" onClick={onRetry}>
          重新載入
        </button>
      </div>
    );
  }
  if (!data) {
    return <p className="muted">載入總覽中...</p>;
  }

  const counts = data.inquiryCounts;
  const pending = counts.pending;

  return (
    <div className="admin-overview" data-testid="admin-overview">
      <div className="admin-overview__stats">
        <div className={`card admin-stat${pending > 0 ? ' admin-stat--alert' : ''}`}>
          <div className="admin-stat__label">待處理詢價</div>
          <div className="admin-stat__value" data-testid="overview-pending">
            {pending}
          </div>
          <div className="admin-stat__sub">
            報價中 {counts.processing}・已回覆 {counts.replied}
          </div>
          <button type="button" className="admin-stat__link" onClick={() => onNavigate('inquiries')}>
            前往處理 →
          </button>
        </div>
        <div className="card admin-stat">
          <div className="admin-stat__label">產品</div>
          <div className="admin-stat__value" data-testid="overview-products">
            {data.productTotal}
          </div>
          <div className="admin-stat__sub">
            已上架 {data.productActive}・未上架 {data.productTotal - data.productActive}
          </div>
          <button type="button" className="admin-stat__link" onClick={() => onNavigate('products')}>
            管理產品 →
          </button>
        </div>
        <div className="card admin-stat">
          <div className="admin-stat__label">分類</div>
          <div className="admin-stat__value" data-testid="overview-categories">
            {data.categoryTotal}
          </div>
          <div className="admin-stat__sub">
            大分類 {data.categoryTotal}・子分類 {data.subCategoryTotal}
          </div>
          <button type="button" className="admin-stat__link" onClick={() => onNavigate('categories')}>
            管理分類 →
          </button>
        </div>
      </div>

      <h2 className="admin-overview__heading">最新詢價</h2>
      <div className="card admin-overview__latest">
        {data.latestInquiries.length ? (
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>公司</th>
                <th className="admin-hide-mobile">國家</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {data.latestInquiries.map((inq) => (
                <tr key={inq.id}>
                  <td>{formatDateTime(inq.created_at)}</td>
                  <td>{inq.company_name || inq.customer_name}</td>
                  <td className="admin-hide-mobile">{inq.country || '—'}</td>
                  <td>
                    <span className={`admin-status admin-status--${inq.status}`}>{STATUS_LABELS[inq.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted" style={{margin: '0.75rem 0.5rem'}}>
            目前還沒有詢價。
          </p>
        )}
      </div>
      {data.latestInquiries.length ? (
        <button type="button" className="admin-stat__link" onClick={() => onNavigate('inquiries')}>
          查看全部詢價 →
        </button>
      ) : null}
    </div>
  );
}
