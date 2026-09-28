import type {ServiceClient} from '@/lib/admin-session';
import {
  filterCustomers,
  parseCustomerSort,
  sortCustomers,
  summarizeCustomers,
  type CustomerInquiryRow,
  type CustomerRow
} from '@/lib/customer-summary';

// 讀取客戶與詢價單並整理成客戶列表（A6 ②）
// 客戶數量以數百到數千筆估計，在伺服器整理後只回傳需要的部分
export async function loadCustomerData(service: ServiceClient) {
  const [customersRes, inquiriesRes] = await Promise.all([
    service.from('customers').select('id,email,name,company_name,country,phone,created_at'),
    service.from('inquiry_requests').select('id,customer_id,customer_email,status,created_at,items')
  ]);
  const error = customersRes.error || inquiriesRes.error;
  const customers = (customersRes.data as CustomerRow[] | null) || [];
  const inquiries = (inquiriesRes.data as CustomerInquiryRow[] | null) || [];
  return {error, customers, inquiries, summaries: summarizeCustomers(customers, inquiries)};
}

export function queryCustomers(summaries: ReturnType<typeof summarizeCustomers>, searchParams: URLSearchParams) {
  const keyword = (searchParams.get('q') || '').slice(0, 100);
  const country = (searchParams.get('country') || '').slice(0, 100);
  return sortCustomers(filterCustomers(summaries, keyword, country), parseCustomerSort(searchParams.get('sort')));
}
