import {NextResponse, type NextRequest} from 'next/server';
import {isSameOriginRequest, isWriteMethod} from '@/lib/origin-check';

// 後台寫入 API 的 Origin 檢查（SX-13）：一支 middleware 涵蓋 /api/admin 底下所有路由，
// 不必在每支路由各自呼叫，新增路由也不會漏掉
export function middleware(request: NextRequest) {
  if (isWriteMethod(request.method)) {
    const ok = isSameOriginRequest({
      origin: request.headers.get('origin'),
      host: request.headers.get('host'),
      forwardedHost: request.headers.get('x-forwarded-host')
    });
    if (!ok) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*']
};
