import {requireAdmin} from '@/lib/admin-session';
import {dbErrorResponse, invalidInputResponse, isUuid, INVALID_ID_MESSAGE} from '@/lib/admin-api-errors';
import {loadCustomerData, queryCustomers} from '@/lib/admin-customers';
import {groupInquiriesByCustomer} from '@/lib/customer-summary';

const PAGE_SIZE = 20;

// 客戶列表（A6 ②）
// - 不帶 id：參數 q（關鍵字）、country、sort（recent／count／name）、page
// - 帶 id：回傳該客戶資料與所有詢價單
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const {searchParams} = new URL(request.url);
  const {error, customers, inquiries, summaries} = await loadCustomerData(auth.service);
  if (error) return dbErrorResponse('customers GET', error);

  const id = searchParams.get('id');
  if (id !== null) {
    if (!isUuid(id)) return invalidInputResponse(INVALID_ID_MESSAGE);
    const customer = summaries.find((c) => c.id === id);
    if (!customer) return Response.json({error: '找不到這位客戶'}, {status: 404});
    const list = groupInquiriesByCustomer(customers, inquiries).get(id) || [];
    return Response.json({customer, inquiries: list});
  }

  const filtered = queryCustomers(summaries, searchParams);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1), totalPages);
  const countries = [...new Set(summaries.map((c) => c.country).filter(Boolean))].sort();

  return Response.json({
    items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: filtered.length,
    page,
    totalPages,
    countries
  });
}
