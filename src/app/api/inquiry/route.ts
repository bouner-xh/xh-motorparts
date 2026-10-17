import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { buildAdminEnvelope, buildCustomerEnvelope, SALES_EMAIL, type EmailEnvelope } from '@/lib/inquiry-email';
import { sendResendEmail } from '@/lib/resend';
import {
  CONFIRMATION_EMAIL_DAILY_LIMIT,
  confirmationQuotaKey,
  firstForwardedIp,
  getMissingProtectionConfig,
  isAllowedTurnstileHostname,
  isProductionDeployment
} from '@/lib/inquiry-protection';
import { buildCustomerFillPatch, escapeIlike, normalizeEmail } from '@/lib/inquiry-customer';
import { rfqCode } from '@/lib/inquiry-reply';
import type { InquiryErrorCode } from '@/lib/inquiry-errors';
import { INQUIRY_LIMITS, productIdsToLookup, resolveInquiryItems, type CatalogProductRow } from '@/lib/inquiry-limits';

// B2B RFQ 詢價車 Payload 驗證 Schema（欄位上限見 src/lib/inquiry-limits.ts）
const L = INQUIRY_LIMITS;
const inquirySchema = z.object({
  name: z.string().min(1).max(L.name),
  email: z.string().max(L.email).email(),
  companyName: z.string().min(1).max(L.companyName),
  country: z.string().min(1).max(L.country),
  phone: z.string().max(L.phone).optional().default(''),
  message: z.string().max(L.message).optional().default(''),
  items: z.array(z.object({
    productId: z.string().min(1).max(L.productId),
    modelNumber: z.string().min(1).max(L.modelNumber),
    nameZhTw: z.string().max(L.productName).optional().default(''),
    nameZhCn: z.string().max(L.productName).optional().default(''),
    nameEn: z.string().max(L.productName).optional().default(''),
    quantity: z.number().int().positive().max(L.quantity)
  })).min(1).max(L.items),
  turnstileToken: z.string().max(L.turnstileToken).optional().default('')
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

// 錯誤回應：保留 HTTP 狀態碼與中文 error 欄位（向後相容），另附穩定的 code 供前端翻譯
function errorResponse(code: InquiryErrorCode, error: string, status: number) {
  return Response.json({ error, code }, { status });
}

// 同一收件信箱每天最多 CONFIRMATION_EMAIL_DAILY_LIMIT 封確認信（SX-5）
// 超過時詢價單照收、管理員照通知，只是不再寄確認信；Upstash 沒設定或連不上時略過限制（維持既有「照常收單」行為）
async function reserveConfirmationEmail(email: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return true;

  try {
    const redis = new Redis({ url, token });
    const key = confirmationQuotaKey(email);
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60 * 60 * 24);
    return count <= CONFIRMATION_EMAIL_DAILY_LIMIT;
  } catch (error) {
    console.error('[inquiry] confirmation quota: Upstash unavailable, skipped quota:', error);
    return true;
  }
}

async function verifyTurnstile(token: string, remoteIp: string) {
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
    body: JSON.stringify({ secret, response: token, ...(remoteIp ? { remoteip: remoteIp } : {}) })
  });

  const data = (await response.json()) as { success?: boolean; hostname?: string };
  if (!data.success) {
    return { ok: false, reason: 'verification-failed' };
  }
  // 正式環境：驗證碼必須是在本站網域產生的（開發與預覽環境略過）
  if (isProductionDeployment() && !isAllowedTurnstileHostname(data.hostname)) {
    console.error('[inquiry] turnstile hostname mismatch:', data.hostname);
    return { ok: false, reason: 'hostname-mismatch' };
  }
  return { ok: true, reason: 'verified' };
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
      return errorResponse('service_unavailable', '詢價服務暫時無法使用，請稍後再試，或直接透過 Email / WhatsApp 與我們聯絡', 503);
    }
  }

  // 出錯時記錄停在哪一步（流量限制／機器人驗證／資料庫／寄信），方便在 Vercel Logs 查修
  let stage = 'parse';
  try {
    const body = await request.json();
    const parsed = inquirySchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('invalid_input', '表單或詢價品項資料不完整', 400);
    }

    const data = parsed.data;

    // 1) Rate Limiting (防刷防爆保護)
    // Upstash 連不上（例如免費資料庫閒置被刪除、環境變數設錯）時略過流量限制照常收單，
    // 仍有 Turnstile 機器人驗證把關；錯誤寫進 Vercel 紀錄以便查修
    stage = 'rate-limit';
    const forwardedIp = firstForwardedIp(request.headers.get('x-forwarded-for'));
    const ip = forwardedIp || '127.0.0.1';
    const rateLimiter = getRateLimiter();
    if (rateLimiter) {
      let limited = false;
      try {
        limited = !(await rateLimiter.limit(ip)).success;
      } catch (error) {
        console.error('[inquiry] rate-limit: Upstash unavailable, skipped rate limiting:', error);
      }
      if (limited) {
        return errorResponse('rate_limited', '請求過於頻繁，請稍後再試', 429);
      }
    }

    // 2) Cloudflare Turnstile 機器人驗證
    stage = 'turnstile';
    const turnstile = await verifyTurnstile(data.turnstileToken, forwardedIp);
    if (!turnstile.ok) {
      return errorResponse('captcha_failed', '驗證失敗，請重新送出', 400);
    }

    // 3) 寫入 Supabase (CRM 客戶關係資料庫)
    stage = 'database';
    const service = getSupabaseServiceRoleClient();
    let customerId: string | null = null;
    // 已設定資料庫但寫入失敗時為 true，需確保管理員至少收到通知信，否則回報失敗
    let saveFailed = false;
    let inquiryNo: string | null = null;

    if (service) {
      // 品項名稱與型號以資料庫為準，不採用瀏覽器送來的文字（信件與詢價單都用這份）
      const ids = productIdsToLookup(data.items);
      let products: CatalogProductRow[] = [];
      if (ids.length) {
        const { data: rows, error: productError } = await service
          .from('products')
          .select('id, model_number, name_i18n')
          .eq('is_active', true) // 未上架的產品不採用其名稱（查不到的品項只保留型號）
          .in('id', ids);
        if (productError) console.error('[inquiry] product lookup failed:', productError.message);
        products = (rows as CatalogProductRow[] | null) || [];
      }
      data.items = resolveInquiryItems(data.items, products);

      // a. 查詢或建立客戶 (以小寫 Email 作為唯一鍵值，比對不分大小寫)
      const customerEmail = normalizeEmail(data.email);
      const { data: existingCustomer } = await service
        .from('customers')
        .select('id, name, company_name, country, phone')
        .ilike('email', escapeIlike(customerEmail))
        .limit(1)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // 公開表單不覆蓋既有客戶資料（避免被人冒用信箱改掉客戶資料），只在原欄位為空時補值；詢價單本身仍存這次填的內容
        const fillPatch = buildCustomerFillPatch(existingCustomer, {
          name: data.name,
          company_name: data.companyName,
          country: data.country,
          phone: data.phone
        });
        if (fillPatch) {
          await service.from('customers').update(fillPatch).eq('id', customerId);
        }
      } else {
        const { data: newCustomer } = await service
          .from('customers')
          .insert({
            email: customerEmail,
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
      const { data: savedInquiry, error: inqError } = await service
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
        })
        .select('id, created_at')
        .single();

      if (inqError) {
        saveFailed = true;
        console.error('Failed to save inquiry to database:', inqError.message);
      } else if (savedInquiry?.id) {
        // 詢價編號沿用後台回覆信的 RFQ 編號格式，不新增資料表
        inquiryNo = rfqCode({ id: savedInquiry.id, created_at: savedInquiry.created_at || new Date().toISOString() });
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
    // 確認信先檢查同信箱的每日額度；超過就不寄（買家端不顯示失敗，管理員通知照寄）
    const sendCustomerEmail = async () => {
      if (!(await reserveConfirmationEmail(data.email))) {
        console.warn('[inquiry] confirmation email skipped: daily quota reached for this address');
        return false;
      }
      return sendEmail(buildCustomerEnvelope(data));
    };
    let confirmationSent = false;

    if (saveFailed) {
      // 資料庫寫入失敗：管理員通知信是唯一的紀錄，寄送成功才能告訴客戶已收到
      const adminNotified = hasResend ? await sendAdminEmail() : false;
      if (!adminNotified) {
        console.error('Inquiry lost: database save failed and admin email was not sent.', {
          email: data.email,
          companyName: data.companyName
        });
        return errorResponse('save_failed', '詢價單暫時無法送出，請稍後再試，或直接透過 Email / WhatsApp 與我們聯絡', 500);
      }
      confirmationSent = await sendCustomerEmail();
    } else if (hasResend) {
      const [, sent] = await Promise.all([sendAdminEmail(), sendCustomerEmail()]);
      confirmationSent = sent;
    }

    return Response.json({
      ok: true,
      mode: hasResend ? 'ready-for-email' : 'scaffold-only',
      // 成功畫面摘要用：品項數、是否寄出確認信、詢價編號（未寫入資料庫時為 null）
      itemCount: data.items.length,
      confirmationSent,
      inquiryNo
    });
  } catch (error: unknown) {
    console.error(`Inquiry submission API error [stage: ${stage}]:`, error);
    return errorResponse('server_error', '伺服器處理詢價單時發生錯誤', 500);
  }
}
