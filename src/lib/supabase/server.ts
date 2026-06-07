import {cookies} from 'next/headers';
import type {NextRequest, NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return {url, anonKey};
}

export function getSupabaseServerClient() {
  const env = getSupabaseEnv();

  if (!env) {
    return null;
  }

  return createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function getSupabaseServerAuthClient() {
  const env = getSupabaseEnv();
  if (!env) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({name, value, options}) => {
          cookieStore.set(name, value, options);
        });
      }
    }
  });
}

export function getSupabaseMiddlewareAuthClient(request: NextRequest, response: NextResponse) {
  const env = getSupabaseEnv();
  if (!env) {
    return null;
  }

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({name, value}) => {
          request.cookies.set(name, value);
        });

        cookiesToSet.forEach(({name, value, options}) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });
}

export function getSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
