// 客戶列表：由客戶資料與詢價單整理出詢價次數、最近詢價等（A6 ②）
// 純函式、不依賴資料庫，方便單元測試（tests/admin/customer-summary.test.mts）
import {csvCell, formatTaipeiTime, INQUIRY_STATUS_LABELS, type InquiryStatus} from './inquiry-export.ts';

export interface CustomerRow {
  id: string;
  email: string;
  name?: string | null;
  company_name?: string | null;
  country?: string | null;
  phone?: string | null;
  created_at?: string;
}

export interface CustomerInquiryRow {
  id: string;
  customer_id?: string | null;
  customer_email?: string | null;
  status: InquiryStatus;
  created_at: string;
  items?: {modelNumber?: string; quantity?: number}[] | null;
}

export interface CustomerSummary {
  id: string;
  email: string;
  name: string;
  companyName: string;
  country: string;
  phone: string;
  inquiryCount: number;
  pendingCount: number;
  firstInquiryAt: string;
  lastInquiryAt: string;
  // 詢價過的型號（依次數由多到少）
  topModels: string[];
}

export type CustomerSort = 'recent' | 'count' | 'name';

const emailKey = (value?: string | null) => (value || '').trim().toLowerCase();

// 以 customer_id 對應；早期沒有 customer_id 的詢價單改用 Email 對應
export function groupInquiriesByCustomer(customers: CustomerRow[], inquiries: CustomerInquiryRow[]) {
  const byId = new Map(customers.map((c) => [c.id, c.id]));
  const byEmail = new Map(customers.map((c) => [emailKey(c.email), c.id]));
  const groups = new Map<string, CustomerInquiryRow[]>();
  for (const inquiry of inquiries) {
    const customerId = (inquiry.customer_id && byId.get(inquiry.customer_id)) || byEmail.get(emailKey(inquiry.customer_email));
    if (!customerId) continue;
    const list = groups.get(customerId) || [];
    list.push(inquiry);
    groups.set(customerId, list);
  }
  for (const list of groups.values()) list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return groups;
}

export function summarizeCustomers(customers: CustomerRow[], inquiries: CustomerInquiryRow[]): CustomerSummary[] {
  const groups = groupInquiriesByCustomer(customers, inquiries);
  return customers.map((c) => {
    const list = groups.get(c.id) || [];
    const modelCounts = new Map<string, number>();
    list.forEach((inq) => (inq.items || []).forEach((item) => {
      if (item.modelNumber) modelCounts.set(item.modelNumber, (modelCounts.get(item.modelNumber) || 0) + 1);
    }));
    return {
      id: c.id,
      email: c.email,
      name: c.name || '',
      companyName: c.company_name || '',
      country: c.country || '',
      phone: c.phone || '',
      inquiryCount: list.length,
      pendingCount: list.filter((i) => i.status === 'pending').length,
      firstInquiryAt: list.length ? list[list.length - 1].created_at : '',
      lastInquiryAt: list.length ? list[0].created_at : '',
      topModels: [...modelCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([m]) => m)
    };
  });
}

export function filterCustomers(rows: CustomerSummary[], keyword: string, country: string) {
  const k = keyword.trim().toLowerCase();
  return rows.filter((r) => {
    if (country && r.country !== country) return false;
    if (!k) return true;
    return [r.companyName, r.name, r.email, r.country, r.phone, ...r.topModels].some((v) => v.toLowerCase().includes(k));
  });
}

export function sortCustomers(rows: CustomerSummary[], sort: CustomerSort) {
  const copy = [...rows];
  if (sort === 'count') copy.sort((a, b) => b.inquiryCount - a.inquiryCount || (a.lastInquiryAt < b.lastInquiryAt ? 1 : -1));
  else if (sort === 'name') copy.sort((a, b) => (a.companyName || a.name).localeCompare(b.companyName || b.name));
  else copy.sort((a, b) => (a.lastInquiryAt < b.lastInquiryAt ? 1 : a.lastInquiryAt > b.lastInquiryAt ? -1 : 0));
  return copy;
}

export function parseCustomerSort(value: string | null | undefined): CustomerSort {
  return value === 'count' || value === 'name' ? value : 'recent';
}

export const CUSTOMER_CSV_HEADERS = ['公司', '聯絡人', 'Email', '國家', '電話', '詢價次數', '待處理', '首次詢價', '最近詢價', '詢價過的型號'];

export function buildCustomerCsv(rows: CustomerSummary[]): string {
  const lines = [CUSTOMER_CSV_HEADERS.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.companyName,
        r.name,
        r.email,
        r.country,
        r.phone,
        r.inquiryCount,
        r.pendingCount,
        formatTaipeiTime(r.firstInquiryAt),
        formatTaipeiTime(r.lastInquiryAt),
        r.topModels.join('、')
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export const statusLabel = (status: InquiryStatus) => INQUIRY_STATUS_LABELS[status] || status;
