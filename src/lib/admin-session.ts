import {getSupabaseServerAuthClient, getSupabaseServiceRoleClient} from '@/lib/supabase/server';
import {isAdminEmail} from '@/lib/admin-auth';

export type ServiceClient = NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>;

// 後台 API 共用：確認登入者在管理員名單內，並取得 service role 連線
// 失敗時回傳可直接 return 的 Response
export async function requireAdmin(): Promise<{ok: true; email: string; service: ServiceClient} | {ok: false; response: Response}> {
  const supabase = await getSupabaseServerAuthClient();
  if (!supabase) return {ok: false, response: Response.json({error: 'Supabase auth config is missing'}, {status: 500})};
  const {
    data: {user}
  } = await supabase.auth.getUser();
  if (!user) return {ok: false, response: Response.json({error: 'Unauthorized'}, {status: 401})};
  if (!isAdminEmail(user.email)) return {ok: false, response: Response.json({error: 'Forbidden'}, {status: 403})};
  const service = getSupabaseServiceRoleClient();
  if (!service) return {ok: false, response: Response.json({error: 'Missing service role'}, {status: 500})};
  return {ok: true, email: user.email || '', service};
}
