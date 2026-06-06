import {Ratelimit} from '@upstash/ratelimit';
import {Redis} from '@upstash/redis';
import {z} from 'zod';

const inquirySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
  productModel: z.string().min(1),
  productName: z.string().min(1),
  turnstileToken: z.string().optional().default('')
});

function getRateLimiter() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Ratelimit({
    redis: new Redis({url, token}),
    limiter: Ratelimit.slidingWindow(3, '10 m')
  });
}

async function verifyTurnstile(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return {ok: true, reason: 'turnstile-not-configured'};
  }

  if (!token) {
    return {ok: false, reason: 'missing-turnstile-token'};
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({secret, response: token})
  });

  const data = (await response.json()) as {success?: boolean};
  return {ok: Boolean(data.success), reason: data.success ? 'verified' : 'verification-failed'};
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = inquirySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({error: '表單資料不完整'}, {status: 400});
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const rateLimiter = getRateLimiter();
  if (rateLimiter) {
    const {success} = await rateLimiter.limit(ip);
    if (!success) {
      return Response.json({error: '請求過於頻繁，請稍後再試'}, {status: 429});
    }
  }

  const turnstile = await verifyTurnstile(parsed.data.turnstileToken);
  if (!turnstile.ok) {
    return Response.json({error: '驗證失敗，請重新送出'}, {status: 400});
  }

  return Response.json({
    ok: true,
    mode: process.env.RESEND_API_KEY ? 'ready-for-email' : 'scaffold-only',
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      productModel: parsed.data.productModel,
      productName: parsed.data.productName
    }
  });
}
