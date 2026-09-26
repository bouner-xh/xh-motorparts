// 測試用的模擬 Supabase 伺服器（只實作後台登入測試需要的端點）
// 用途：在沒有真實 Supabase 的環境下，測試「登入 → 後台權限」的完整流程。
// 啟動：node tests/e2e/mock-supabase.cjs（預設 port 54321）
//
// 可登入帳號（密碼皆為 test-password）：
//   admin@example.com     —— 測試時放在 ADMIN_EMAILS 名單內
//   outsider@example.com  —— 帳密正確，但不在名單內
const http = require('node:http');

const PORT = Number(process.env.MOCK_SUPABASE_PORT || 54321);
const PASSWORD = 'test-password';
const USERS = {
  'admin@example.com': { id: '00000000-0000-4000-8000-000000000001', email: 'admin@example.com' },
  'outsider@example.com': { id: '00000000-0000-4000-8000-000000000002', email: 'outsider@example.com' }
};

// 範例產品目錄（對應 src/lib/catalog-service.ts 的查詢欄位）
const i18n = (tw, cn, en) => ({ 'zh-TW': tw, 'zh-CN': cn, en });
const CYLINDER = { slug: 'cylinder' };
const TABLES = {
  categories: [
    { id: 'cat-cylinder', slug: 'cylinder', sort_order: 1, name_i18n: i18n('汽缸', '汽缸', 'Cylinder'), description_i18n: i18n('汽缸組', '汽缸组', 'Cylinder kits') }
  ],
  sub_categories: [
    { id: 'sub-std', slug: 'std', sort_order: 1, name_i18n: i18n('標準汽缸', '标准汽缸', 'Standard'), category: CYLINDER }
  ],
  products: [
    { id: 'prod-1', model_number: '1HV-11311-00', name_i18n: i18n('汽缸本體', '汽缸本体', 'Cylinder Body'), stock_quantity: 20, specifications: ['STD', '47mm'], is_active: true, sub_category_id: 'sub-std', category: CYLINDER },
    { id: 'prod-2', model_number: '5TJ-11311-00', name_i18n: i18n('汽缸本體 B', '汽缸本体 B', 'Cylinder Body B'), stock_quantity: 5, specifications: ['STD', '52mm'], is_active: true, sub_category_id: 'sub-std', category: CYLINDER }
  ],
  product_images: []
};

// 支援 PostgREST 的 eq. 篩選（含 category.slug 這類巢狀欄位）
function filterRows(rows, params) {
  let result = rows;
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(key) || !raw.startsWith('eq.')) continue;
    const value = raw.slice(3);
    result = result.filter((row) => String(key.split('.').reduce((obj, part) => obj?.[part], row)) === value);
  }
  return result;
}

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

function makeAccessToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: user.id, email: user.email, aud: 'authenticated', role: 'authenticated', iat: now, exp: now + 3600 };
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.mock-signature`;
}

function userFromToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return Object.values(USERS).find((u) => u.id === payload.sub) || null;
  } catch {
    return null;
  }
}

function toUserResponse(user) {
  return {
    ...user,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z'
  };
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', () => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const bearer = (req.headers.authorization || '').replace(/^Bearer /, '');

    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const { email, password } = JSON.parse(raw || '{}');
      const user = USERS[String(email).toLowerCase()];
      if (!user || password !== PASSWORD) {
        return send(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      }
      const now = Math.floor(Date.now() / 1000);
      return send(res, 200, {
        access_token: makeAccessToken(user),
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: `refresh-${user.id}`,
        user: toUserResponse(user)
      });
    }

    if (url.pathname === '/auth/v1/user') {
      const user = userFromToken(bearer);
      return user ? send(res, 200, toUserResponse(user)) : send(res, 401, { code: 401, msg: 'invalid JWT' });
    }

    if (url.pathname === '/auth/v1/logout') {
      return send(res, 204);
    }

    // 資料庫：產品目錄相關資料表回傳範例資料，其他資料表回傳空陣列
    if (url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.slice('/rest/v1/'.length);
      const rows = filterRows(TABLES[table] || [], url.searchParams);
      const wantsObject = String(req.headers.accept || '').includes('vnd.pgrst.object');
      if (wantsObject) {
        return rows.length ? send(res, 200, rows[0]) : send(res, 406, { code: 'PGRST116', message: 'no rows' });
      }
      return send(res, 200, rows, { 'Content-Range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
    }
    if (url.pathname.startsWith('/storage/v1/')) {
      return send(res, 200, {});
    }

    return send(res, 404, { msg: `mock: ${req.method} ${url.pathname} not implemented` });
  });
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => console.log(`mock supabase listening on ${PORT}`));
}

module.exports = { PASSWORD, makeAccessToken, USERS };
