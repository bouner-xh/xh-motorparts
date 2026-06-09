import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

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

/**
 * 透過 Resend REST API 發送 HTML 郵件
 */
async function sendEmail({
  to,
  subject,
  html
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  if (!apiKey) {
    console.warn('Resend API key is missing. Skipping email send.');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject,
        html
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Resend API returned error: ${errText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = inquirySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: '表單或詢價品項資料不完整' }, { status: 400 });
    }

    const data = parsed.data;

    // 1) Rate Limiting (防刷防爆保護)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateLimiter = getRateLimiter();
    if (rateLimiter) {
      const { success } = await rateLimiter.limit(ip);
      if (!success) {
        return Response.json({ error: '請求過於頻繁，請稍後再試' }, { status: 429 });
      }
    }

    // 2) Cloudflare Turnstile 機器人驗證
    const turnstile = await verifyTurnstile(data.turnstileToken);
    if (!turnstile.ok) {
      return Response.json({ error: '驗證失敗，請重新送出' }, { status: 400 });
    }

    // 3) 寫入 Supabase (CRM 客戶關係資料庫)
    const service = getSupabaseServiceRoleClient();
    let customerId: string | null = null;

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
        console.error('Failed to save inquiry to database:', inqError.message);
      }
    } else {
      console.warn('Supabase service client is not available. Saving skipped.');
    }

    // 4) 寄送電子郵件 (Resend)
    const adminEmail = process.env.RESEND_ADMIN_EMAIL || 'bounerchang@gmail.com';
    const hasResend = Boolean(process.env.RESEND_API_KEY);

    if (hasResend) {
      // 建置 HTML 零件清單表格列
      const itemRows = data.items
        .map(
          (item) => `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 8px;"><strong>${item.modelNumber}</strong></td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${item.nameZhTw || item.nameEn || item.nameZhCn}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;"><strong>${item.quantity}</strong> units</td>
        </tr>
      `
        )
        .join('');

      // A. 寄給管理者的「新詢價通知信」
      const adminMailHtml = `
        <h2>Xie Huang Enterprise Co., Ltd. - New RFQ Inquiry Notification</h2>
        <p>Dear Admin,</p>
        <p>A new Request for Quote (RFQ) has been submitted via the website catalog. Below are the details:</p>
        
        <h3>Customer Contact Details</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 600px; border-color: #cbd5e1;">
          <tr>
            <td style="background-color: #f8fafc; font-weight: bold; width: 30%;">Contact Name</td>
            <td>${data.name}</td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; font-weight: bold;">Email Address</td>
            <td>${data.email}</td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; font-weight: bold;">Company Name</td>
            <td>${data.companyName}</td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; font-weight: bold;">Country / Region</td>
            <td>${data.country}</td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; font-weight: bold;">Telephone</td>
            <td>${data.phone || 'N/A'}</td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; font-weight: bold;">Message Detail</td>
            <td>${data.message || 'N/A'}</td>
          </tr>
        </table>
        
        <h3>Inquired Parts List</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 800px; border-color: #cbd5e1; margin-top: 15px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th align="left">Model Number</th>
              <th align="left">Product Name</th>
              <th align="left">Quantity Requested</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px;" />
        <p style="font-size: 0.85rem; color: #64748b;">This email was automatically generated by the Xie Huang Enterprise site system. You can reply directly to this email to contact the buyer at ${data.email}.</p>
      `;

      // B. 寄給客戶的「確認信」
      const customerMailHtml = `
        <h2>Thank You for Your Inquiry</h2>
        <p>Dear ${data.name},</p>
        
        <p>Thank you for contacting <strong>Xie Huang Enterprise Co., Ltd.</strong> (Taiwan). We have successfully received your Request for Quote (RFQ). Our sales representative is reviewing your requirements and will contact you with the pricing and details within 24 hours.</p>
        
        <p>Here is a summary of your requested motorcycle parts for your reference:</p>
        
        <h3>Requested Parts Summary</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 600px; border-color: #cbd5e1;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th align="left">Model Number</th>
              <th align="left">Product Name</th>
              <th align="left">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        
        <h3>Your Messages / Requirements</h3>
        <blockquote style="border-left: 4px solid #cbd5e1; margin-left: 0; padding-left: 15px; color: #475569; font-style: italic;">
          ${data.message || 'No additional message.'}
        </blockquote>
        
        <p>If you have any technical drawings, OEM samples, or additional specifications to provide, please reply directly to this email or send them to sales@xh-motorparts.com.</p>
        
        <p>Sincerely,</p>
        <p>
          <strong>Xie Huang Enterprise Co., Ltd.</strong><br />
          Taiwan Motorcycle Parts Manufacturer Since 1990<br />
          Website: xh-motorparts.com
        </p>
      `;

      await Promise.all([
        sendEmail({
          to: adminEmail,
          subject: `[New RFQ Inquiry] From ${data.country} - ${data.companyName} - ${data.name}`,
          html: adminMailHtml
        }),
        sendEmail({
          to: data.email,
          subject: 'Inquiry Received: Xie Huang Enterprise Co., Ltd. (Taiwan)',
          html: customerMailHtml
        })
      ]);
    }

    return Response.json({
      ok: true,
      mode: hasResend ? 'ready-for-email' : 'scaffold-only'
    });
  } catch (error: unknown) {
    console.error('Inquiry submission API error:', error);
    return Response.json({ error: '伺服器處理詢價單時發生錯誤' }, { status: 500 });
  }
}
