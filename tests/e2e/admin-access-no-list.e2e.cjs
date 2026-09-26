// E2E：未設定 ADMIN_EMAILS 時，任何帳號都不能進後台（S2）
// 與 admin-access.e2e.cjs 相同的啟動方式，但「不要」設定 ADMIN_EMAILS
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { PASSWORD } = require('./mock-supabase.cjs');

run('未設定管理員名單時一律拒絕', () =>
  withPage(async (page) => {
    await page.goto(`${BASE_URL}/zh-TW/admin/login`);
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', PASSWORD);
    await Promise.all([page.waitForURL(/error=forbidden|\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
    assert(page.url().includes('error=forbidden'), `帳密正確也無法進入後台（${page.url()}）`);
  })
);
