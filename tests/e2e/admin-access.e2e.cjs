// E2E：只有 ADMIN_EMAILS 名單內的帳號能進後台（S2）
// 使用模擬 Supabase（tests/e2e/mock-supabase.cjs）：
//   node tests/e2e/mock-supabase.cjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon \
//   SUPABASE_SERVICE_ROLE_KEY=service ADMIN_EMAILS=admin@example.com npx next dev -p 3100
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { PASSWORD, USERS, makeAccessToken } = require('./mock-supabase.cjs');

async function login(page, email) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/(dashboard|login\?)/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
}

async function apiStatus(page, path) {
  const res = await page.request.get(`${BASE_URL}${path}`);
  return res.status();
}

// 以已登入的 session cookie 為範本，偽造一個「名單外帳號」的登入狀態
async function forgeOutsiderSession(context) {
  const cookies = (await context.cookies()).filter((c) => /^sb-.*-auth-token/.test(c.name));
  if (!cookies.length) throw new Error('找不到 Supabase session cookie');
  cookies.sort((a, b) => a.name.localeCompare(b.name));
  const raw = cookies.map((c) => c.value).join('');
  const session = JSON.parse(Buffer.from(raw.replace(/^base64-/, ''), 'base64url').toString());
  const outsider = USERS['outsider@example.com'];
  session.access_token = makeAccessToken(outsider);
  session.user = { ...session.user, id: outsider.id, email: outsider.email };
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
  const baseName = cookies[0].name.replace(/\.\d+$/, '');
  await context.clearCookies();
  await context.addCookies([{ ...cookies[0], name: baseName, value }]);
}

run('名單內帳號可以進後台與使用 API', () =>
  withPage(async (page) => {
    await login(page, 'admin@example.com');
    assert(page.url().includes('/admin/dashboard'), `登入後進到後台（${page.url()}）`);
    await page.getByText('管理後台').first().waitFor();
    assert(true, '後台畫面正常顯示');
    assert((await apiStatus(page, '/api/admin/inquiries')) === 200, '可以讀取詢價資料 API');
    assert((await apiStatus(page, '/api/admin/categories')) === 200, '可以讀取分類 API');
  })
);

run('名單外帳號登入後被拒絕並登出', () =>
  withPage(async (page, context) => {
    await login(page, 'outsider@example.com');
    assert(page.url().includes('error=forbidden'), `停留在登入頁並帶錯誤代碼（${page.url()}）`);
    await page.getByText('此帳號沒有後台權限').waitFor();
    assert(true, '畫面顯示「沒有後台權限」');
    const sessionCookies = (await context.cookies()).filter((c) => /^sb-.*-auth-token/.test(c.name) && c.value);
    assert(sessionCookies.length === 0, '登入狀態已清除');
    await page.goto(`${BASE_URL}/zh-TW/admin/dashboard`);
    assert(page.url().includes('/admin/login'), '直接開後台網址會被導回登入頁');
  })
);

run('名單外帳號的登入狀態無法使用後台 API 與頁面', () =>
  withPage(async (page, context) => {
    await login(page, 'admin@example.com');
    await forgeOutsiderSession(context);
    for (const path of ['/api/admin/inquiries', '/api/admin/categories', '/api/admin/sub-categories', '/api/admin/products']) {
      assert((await apiStatus(page, path)) === 403, `${path} 回應 403`);
    }
    const upload = await page.request.post(`${BASE_URL}/api/admin/upload-image`, { multipart: { file: { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('x') } } });
    assert(upload.status() === 403, '/api/admin/upload-image 回應 403');
    const batch = await page.request.post(`${BASE_URL}/api/admin/products/batch`, { data: { products: [] } });
    assert(batch.status() === 403, '/api/admin/products/batch 回應 403');
    await page.goto(`${BASE_URL}/zh-TW/admin/dashboard`);
    assert(page.url().includes('error=forbidden'), '開後台頁面被導回登入頁');
  })
);

run('未登入無法使用後台 API', () =>
  withPage(async (page) => {
    await page.goto(`${BASE_URL}/zh-TW`);
    assert((await apiStatus(page, '/api/admin/inquiries')) === 401, '/api/admin/inquiries 回應 401');
  })
);
