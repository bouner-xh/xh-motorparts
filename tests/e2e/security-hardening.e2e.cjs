// E2E：安全加固（2026-10-17 網站健診 工作包 A）
//   SX-3 登入 cookie：HttpOnly、SameSite=Lax、效期 7 天，登出後無法再進後台
//   SX-13 後台寫入 API 的 Origin 檢查：同源／無 Origin 放行，跨源 403
//   SX-8／SX-9／SX-13 標頭：CSP、COOP、CORP、Permissions-Policy、不洩漏 X-Powered-By、後台 API no-store
//   SX-12 JSON-LD sku；SX-14 舊版圖片路徑
// 使用模擬 Supabase（啟動方式同 admin-access.e2e.cjs；開發模式即可）：
//   MOCK_SUPABASE_PORT=54332 node tests/e2e/mock-supabase.cjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54332 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon \
//   SUPABASE_SERVICE_ROLE_KEY=service ADMIN_EMAILS=admin@example.com npx next dev -p 3100
const http = require('node:http');
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

async function login(page, email = 'admin@example.com') {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/(dashboard|login\?)/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
}

const authCookies = (context) => context.cookies().then((all) => all.filter((c) => /^sb-.*-auth-token/.test(c.name) && c.value));

// 不經過瀏覽器／fetch 的路徑正規化，直接送出原始網址路徑
function rawGet(rawPath) {
  const url = new URL(BASE_URL);
  return new Promise((resolve, reject) => {
    http
      .request({ host: url.hostname, port: url.port, path: rawPath, method: 'GET' }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      })
      .on('error', reject)
      .end();
  });
}

run('登入 cookie：HttpOnly、SameSite=Lax、效期約 7 天；登入→換頁→登出→再進後台被擋', () =>
  withPage(async (page, context) => {
    await login(page);
    assert(page.url().includes('/admin/dashboard'), `登入後進到後台（${page.url()}）`);

    const cookies = await authCookies(context);
    assert(cookies.length > 0, '有 Supabase 登入 cookie');
    for (const c of cookies) {
      assert(c.httpOnly === true, `${c.name} 是 HttpOnly`);
      assert(c.sameSite === 'Lax', `${c.name} SameSite=Lax（${c.sameSite}）`);
      const days = (c.expires - Date.now() / 1000) / 86400;
      assert(days > 6.9 && days < 7.1, `${c.name} 效期約 7 天（${days.toFixed(2)} 天）`);
    }
    const scriptVisible = await page.evaluate(() => document.cookie);
    assert(!/sb-.*-auth-token/.test(scriptVisible), '頁面上的 JavaScript 讀不到登入 cookie');

    // 換頁後仍保持登入
    await page.goto(`${BASE_URL}/zh-TW/admin/dashboard?tab=products`);
    assert(page.url().includes('/admin/dashboard'), '換頁後仍在後台');
    assert((await page.request.get(`${BASE_URL}/api/admin/categories`)).status() === 200, '後台 API 可用');

    // 登出
    await Promise.all([page.waitForURL(/\/admin\/login/, { timeout: 60000 }), page.getByRole('button', { name: '登出' }).click()]);
    assert((await authCookies(context)).length === 0, '登出後登入 cookie 已清除');
    await page.goto(`${BASE_URL}/zh-TW/admin/dashboard`);
    assert(page.url().includes('/admin/login'), '登出後再進後台被導回登入頁');
    assert((await page.request.get(`${BASE_URL}/api/admin/categories`)).status() === 401, '登出後後台 API 回應 401');
  })
);

run('後台寫入 API：跨源 Origin 回 403、同源與無 Origin 不被擋', () =>
  withPage(async (page) => {
    await login(page);
    const host = new URL(BASE_URL).host;
    const post = (path, headers) => page.request.post(`${BASE_URL}${path}`, { data: {}, headers });

    for (const path of ['/api/admin/categories', '/api/admin/products', '/api/admin/products/batch', '/api/admin/sub-categories', '/api/admin/inquiries', '/api/admin/vehicle-models', '/api/admin/inquiries/reply']) {
      const cross = await post(path, { Origin: 'https://evil.example' });
      assert(cross.status() === 403, `${path} 跨源 POST 回 403（${cross.status()}）`);
    }
    for (const method of ['put', 'delete']) {
      const res = await page.request[method](`${BASE_URL}/api/admin/categories`, { data: {}, headers: { Origin: 'https://evil.example' } });
      assert(res.status() === 403, `跨源 ${method.toUpperCase()} 回 403（${res.status()}）`);
    }
    const nullOrigin = await post('/api/admin/categories', { Origin: 'null' });
    assert(nullOrigin.status() === 403, 'Origin: null 回 403');

    const same = await post('/api/admin/categories', { Origin: `http://${host}` });
    assert(same.status() !== 403 && same.status() < 500, `同源 Origin 不被擋（${same.status()}，輸入驗證失敗為正常）`);
    const none = await post('/api/admin/categories', {});
    assert(none.status() !== 403 && none.status() < 500, `沒有 Origin（curl 類）不被擋（${none.status()}）`);

    // 讀取不受影響，即使帶了別的 Origin
    const read = await page.request.get(`${BASE_URL}/api/admin/categories`, { headers: { Origin: 'https://evil.example' } });
    assert(read.status() === 200, 'GET 不檢查 Origin');
  })
);

run('標頭：CSP、COOP、CORP、Permissions-Policy、沒有 X-Powered-By、後台 API no-store', () =>
  withPage(async (page) => {
    const res = await page.request.get(`${BASE_URL}/en`);
    const h = res.headers();
    const csp = h['content-security-policy'] || '';
    for (const part of ["base-uri 'self'", "object-src 'none'", "form-action 'self'", "frame-ancestors 'none'", 'https://challenges.cloudflare.com']) {
      assert(csp.includes(part), `CSP 含 ${part}`);
    }
    assert(csp.includes(MOCK_URL), `connect-src 收斂成專案網域 ${MOCK_URL}`);
    assert(!csp.includes('api.resend.com'), 'CSP 不含 api.resend.com');
    assert(!csp.includes('*.cloudflare.com'), 'img-src 不含 *.cloudflare.com');
    assert(h['cross-origin-opener-policy'] === 'same-origin', 'COOP same-origin');
    assert(h['cross-origin-resource-policy'] === 'same-site', 'CORP same-site');
    assert(h['permissions-policy'].includes('payment=()') && h['permissions-policy'].includes('usb=()'), 'Permissions-Policy 含 payment、usb');
    assert(h['x-powered-by'] === undefined, '沒有 X-Powered-By');
    assert(h['x-frame-options'] === 'DENY', 'X-Frame-Options DENY');

    const api = await page.request.get(`${BASE_URL}/api/admin/categories`);
    assert((api.headers()['cache-control'] || '').includes('no-store'), `後台 API 帶 no-store（${api.headers()['cache-control']}）`);
  })
);

run('同站圖片與頁面載入不受 COOP／CORP／CSP 影響', () =>
  withPage(async (page) => {
    const violations = [];
    // 開發模式的 Vercel Analytics 除錯腳本（va.vercel-scripts.com）本來就不在 CSP 白名單，與本次調整無關
    page.on('console', (m) => /Content Security Policy|Cross-Origin-Resource-Policy|ERR_BLOCKED_BY_RESPONSE/i.test(m.text()) && !m.text().includes('va.vercel-scripts.com') && violations.push(m.text()));
    page.on('requestfailed', (r) => /BLOCKED/i.test(r.failure()?.errorText || '') && violations.push(`${r.url()} ${r.failure().errorText}`));
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState('networkidle');
    assert(violations.length === 0, `首頁沒有 CSP／CORP 阻擋（${violations.join(' | ')}）`);
    const logo = await page.request.get(`${BASE_URL}/legacy-assets/logo.png`);
    assert(logo.status() === 200 && logo.headers()['content-type'] === 'image/png', '舊版圖片 logo.png 正常回應');
  })
);

run('JSON-LD：sku 是網址代號（不是資料庫 UUID），內容可解析且不含未轉義的 <', () =>
  withPage(async (page) => {
    await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
    await page.goto(`${BASE_URL}/en/products/cylinder/std/1HV-11311-00`);
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(raw);
    assert(data.sku === '1HV-11311-00', `sku 為網址代號（${data.sku}）`);
    assert(!/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(data.sku), 'sku 不是 UUID');
    assert(data.mpn === '1HV-11311-00', 'mpn 仍為型號');
    assert(!raw.includes('<'), 'JSON-LD 原文不含 <');
  })
);

run('舊版圖片路徑：.. 與編碼斜線擋下、非圖片副檔名擋下', () =>
  withPage(async () => {
    const root = (await rawGet('/legacy-assets/logo.png')).status;
    assert(root === 200, '正常圖片 200');
    for (const p of ['/legacy-assets/..%2f..%2fpackage.json', '/legacy-assets/%2e%2e/%2e%2e/package.json', '/legacy-assets/..%2f..%2fnext.config.ts', '/legacy-assets/products%2f..%2f..%2fpackage.json', '/legacy-assets/..%5c..%5cpackage.json', '/legacy-assets/%2e%2e%2f%2e%2e%2fpackage.json']) {
      const res = await rawGet(p);
      assert(res.status !== 200 && !res.body.toString().includes('"dependencies"'), `${p} 被擋（${res.status}）`);
    }
    const nonImage = await rawGet('/legacy-assets/products/README.md');
    assert(nonImage.status === 403 || nonImage.status === 404, `非圖片副檔名被擋（${nonImage.status}）`);
  })
);
