// 後台管理員白名單
// 名單來自環境變數 ADMIN_EMAILS（以逗號分隔），比對時不分大小寫、忽略前後空白。
// 未設定或名單為空時一律拒絕，避免設定遺漏時任何登入者都能進後台。

export function parseAdminEmails(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined, adminEmails = process.env.ADMIN_EMAILS): boolean {
  if (!email) {
    return false;
  }

  return parseAdminEmails(adminEmails).includes(email.trim().toLowerCase());
}
