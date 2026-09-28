// 透過 Resend 寄信（詢價通知、確認信、後台回覆共用）
// RESEND_API_URL 只給測試使用（指向模擬伺服器），正式環境不需設定

export interface ResendAttachment {
  filename: string;
  // base64 內容
  content: string;
}

export interface ResendMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  attachments?: ResendAttachment[];
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendResendEmail(message: ResendMessage): Promise<{ok: boolean; id?: string; error?: string}> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Resend API key is missing. Skipping email send.');
    return {ok: false, error: 'not-configured'};
  }
  const baseUrl = process.env.RESEND_API_URL || 'https://api.resend.com';
  try {
    const res = await fetch(`${baseUrl}/emails`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`},
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: message.to,
        subject: message.subject,
        html: message.html,
        ...(message.text ? {text: message.text} : {}),
        ...(message.replyTo ? {reply_to: message.replyTo} : {}),
        ...(message.cc?.length ? {cc: message.cc} : {}),
        ...(message.attachments?.length ? {attachments: message.attachments} : {})
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Resend API returned error: ${errText}`);
      return {ok: false, error: errText};
    }
    const data = (await res.json().catch(() => ({}))) as {id?: string};
    return {ok: true, id: data.id};
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    return {ok: false, error: 'network'};
  }
}
