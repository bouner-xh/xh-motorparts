import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { buildAdminEnvelope, buildCustomerEnvelope, SALES_EMAIL, type EmailEnvelope } from '@/lib/inquiry-email';
import { sendResendEmail } from '@/lib/resend';
import { getMissingProtectionConfig, isProductionDeployment } from '@/lib/inquiry-protection';

// B2B RFQ 詢價車 Payload 驗證 Schema
const inquirySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  companyName: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional().default(''),
  message: z.string().optional().default(''),
  items: z.array(z.object({
    productId: z.string().min(1),
    modelNumber: z.string().min(1),
    nameZhTw: z.string().optional().default(''),
    nameZhCn: z.string().optional().default(''),
    nameEn: z.string().optional().default(''),
    quantity: z.number().int().positive()
  })).min(1),
  turnstileToken: z.string().optional().default('')
});

function getRateLimiter() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(3, '10 m')
  });
}

async function verifyTurnstile(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: true, reason: 'turnstile-not-configured' };
  }

  if (!token) {
    return { ok: false, reason: 'missing-turnstile-token' };
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token })
  });

  const data = (await response.json()) as { success?: boolean };
  return { ok: Boolean(data.success), reason: data.success ? 'verified' : 'verification-failed' };
}

// 透過 Resend 寄信（共用 src/lib/resend.ts）
async function sendEmail({ to, subject, html, replyTo }: EmailEnvelope) {
  return (await sendResendEmail({ to, subject, html, replyTo })).ok;
}

export async function POST(request: Request) {
  // 0) 正式環境缺少防護設定時停止收單（fail-closed）
  if (isProductionDeployment()) {
    const missing = getMissingProtectionConfig();
    if (missing.length > 0) {
      console.error('Inquiry protection is not configured. Missing env:', missing.join(', '));
      return Response.json(
        { error: '詢價服務暫時無法使用，請稍後再試，或直接透過 Email / WhatsApp 與我們聯絡' },
        { status: 503 }
      );
    }
  }

  // 出錯時記錄停在哪一步（流量限制／機器人驗證／資料庫／寄信），方便在 Vercel Logs 查修
  let stage = 'parse';
  try {
    const body = await request.json();
    const parsed = inquirySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: '表單或詢價品項資料不完整' }, { status: 400 });
    }

    const data = parsed.data;

    // 1) Rate Limiting (防刷防爆保護)
    // Upstash 連不上（例如免費資料庫閒置被刪除、環境變數設錯）時略過流量限制照常收單，
    // 仍有 Turnstile 機器人驗證把關；錯誤寫進 Vercel 紀錄以便查修
    stage = 'rate-limit';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateLimiter = getRateLimiter();
    if (rateLimiter) {
      let limited = false;
      try {
        limited = !(await rateLimiter.limit(ip)).success;
      } catch (error) {
        console.error('[inquiry] rate-limit: Upstash unavailable, skipped rate limiting:', error);
      }
      if (limited) {
        return Response.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 });
      }
    }

    // 2) Cloudflare Turnstile 機器人驗證
    stage = 'turnstile';
    const turnstile = await verifyTurnstile(data.turnstileToken);
    if (!turnstile.ok) {
      return Response.json({ error: '驗證失敗，請重新送出' }, { status: 400 });
    }

    // 3) 寫入 Supabase (CRM 客戶關係資料庫)
    stage = 'database';
    const service = getSupabaseServiceRoleClient();
    let customerId: string | null = null;
    // 已設定資料庫但寫入失敗時為 true，需確保管理員至少收到通知信，否則回報失敗
    let saveFailed = false;

    if (service) {
      // a. 查詢或建立客戶 (以 Email 作為唯一鍵值)
      const { data: existingCustomer } = await service
        .from('customers')
        .select('id')
        .eq('email', data.email)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // 更新客戶聯絡資料以保持最新
        await service
          .from('customers')
          .update({
            name: data.name,
            company_name: data.companyName,
            country: data.country,
            phone: data.phone
          })
          .eq('id', customerId);
      } else {
        const { data: newCustomer } = await service
          .from('customers')
          .insert({
            email: data.email,
            name: data.name,
            company_name: data.companyName,
            country: data.country,
            phone: data.phone
          })
          .select('id')
          .single();

        if (newCustomer) {
          customerId = newCustomer.id;
        }
      }

      // b. 寫入詢價單主表 (items 存成 JSONB 快照)
      const { error: inqError } = await service
        .from('inquiry_requests')
        .insert({
          customer_id: customerId,
          customer_name: data.name,
          customer_email: data.email,
          company_name: data.companyName,
          country: data.country,
          phone: data.phone,
          message: data.message,
          items: data.items,
          status: 'pending',
          reply_notes: ''
        });

      if (inqError) {
        saveFailed = true;
        console.error('Failed to save inquiry to database:', inqError.message);
      }
    } else {
      console.warn('Supabase service client is not available. Saving skipped.');
    }

    // 4) 寄送電子郵件 (Resend)
    stage = 'email';
    // 未設定時寄到公司信箱（不再寫死個人信箱）
    const adminEmail = process.env.RESEND_ADMIN_EMAIL || SALES_EMAIL;
    const hasResend = Boolean(process.env.RESEND_API_KEY);

    const sendAdminEmail = () => sendEmail(buildAdminEnvelope(data, adminEmail, saveFailed));
    const sendCustomerEmail = () => sendEmail(buildCustomerEnvelope(data));

    if (saveFailed) {
      // 資料庫寫入失敗：管理員通知信是唯一的紀錄，寄送成功才能告訴客戶已收到
      const adminNotified = hasResend ? await sendAdminEmail() : false;
      if (!adminNotified) {
        console.error('Inquiry lost: database save failed and admin email was not sent.', {
          email: data.email,
          companyName: data.companyName
        });
        return Response.json(
          { error: '詢價單暫時無法送出，請稍後再試，或直接透過 Email / WhatsApp 與我們聯絡' },
          { status: 500 }
        );
      }
      await sendCustomerEmail();
    } else if (hasResend) {
      await Promise.all([sendAdminEmail(), sendCustomerEmail()]);
    }

    return Response.json({
      ok: true,
      mode: hasResend ? 'ready-for-email' : 'scaffold-only'
    });
  } catch (error: unknown) {
    console.error(`Inquiry submission API error [stage: ${stage}]:`, error);
    return Response.json({ error: '伺服器處理詢價單時發生錯誤' }, { status: 500 });
  }
}
