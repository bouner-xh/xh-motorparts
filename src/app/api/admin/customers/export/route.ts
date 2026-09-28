import {requireAdmin} from '@/lib/admin-session';
import {dbErrorResponse} from '@/lib/admin-api-errors';
import {loadCustomerData, queryCustomers} from '@/lib/admin-customers';
import {buildCustomerCsv} from '@/lib/customer-summary';
import {exportFileName} from '@/lib/inquiry-export';

// 匯出客戶 CSV（A6 ②）：套用與列表相同的搜尋、國家與排序；內容含個資，不快取
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const {error, summaries} = await loadCustomerData(auth.service);
  if (error) return dbErrorResponse('customers export', error);

  const rows = queryCustomers(summaries, new URL(request.url).searchParams);
  console.info(`[admin-export] ${auth.email} exported ${rows.length} customers`);
  return new Response(buildCustomerCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName('customers')}"`,
      'Cache-Control': 'no-store'
    }
  });
}
