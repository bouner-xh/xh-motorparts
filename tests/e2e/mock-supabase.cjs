// 測試用的模擬 Supabase 伺服器（登入、資料庫讀寫、Storage）
// 用途：在沒有真實 Supabase 的環境下，測試「登入 → 後台權限 → 後台管理功能」的完整流程。
// 測試輔助端點：POST /__mock/reset 重設資料、GET /__mock/state 查看資料與寄出的信、POST /__mock/seed 加入資料、
//   POST /__mock/drop 模擬資料表不存在、POST /__mock/email-fail 模擬寄信失敗；POST /emails 模擬 Resend
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

// 範例資料（欄位對應正式資料庫；關聯以 *_id 欄位表示，查詢時依 select 自動展開）
const i18n = (tw, cn, en) => ({ 'zh-TW': tw, 'zh-CN': cn, en });
function seedTables() {
  return {
    categories: [
      { id: '10000000-0000-4000-8000-000000000001', slug: 'cylinder', sort_order: 1, name_i18n: i18n('汽缸', '汽缸', 'Cylinder'), description_i18n: i18n('汽缸組', '汽缸组', 'Cylinder kits') },
      { id: '10000000-0000-4000-8000-000000000002', slug: 'chain', sort_order: 2, name_i18n: i18n('鏈條', '链条', 'Chain'), description_i18n: i18n('鏈條組', '链条组', 'Chain kits') }
    ],
    sub_categories: [
      { id: '20000000-0000-4000-8000-000000000001', category_id: '10000000-0000-4000-8000-000000000001', slug: 'std', sort_order: 1, name_i18n: i18n('標準汽缸', '标准汽缸', 'Standard') },
      { id: '20000000-0000-4000-8000-000000000002', category_id: '10000000-0000-4000-8000-000000000002', slug: 'chain-std', sort_order: 1, name_i18n: i18n('標準鏈條', '标准链条', 'Standard Chain') }
    ],
    products: [
      { id: '30000000-0000-4000-8000-000000000001', category_id: '10000000-0000-4000-8000-000000000001', sub_category_id: '20000000-0000-4000-8000-000000000001', model_number: '1HV-11311-00', name_i18n: i18n('汽缸本體', '汽缸本体', 'Cylinder Body'), stock_quantity: 20, specifications: ['STD', '47mm'], is_active: true },
      { id: '30000000-0000-4000-8000-000000000002', category_id: '10000000-0000-4000-8000-000000000001', sub_category_id: '20000000-0000-4000-8000-000000000001', model_number: '5TJ-11311-00', name_i18n: i18n('汽缸本體 B', '汽缸本体 B', 'Cylinder Body B'), stock_quantity: 5, specifications: ['STD', '52mm'], is_active: true }
    ],
    product_images: [],
    customers: [],
    inquiries: []
  };
}
let TABLES = seedTables();
let STORAGE = new Set();

// 資料表之間的關聯：外鍵欄位 → 被參照的資料表，以及刪除時的行為（對應正式資料庫設定）
const FOREIGN_KEYS = [
  { table: 'sub_categories', column: 'category_id', ref: 'categories', onDelete: 'cascade' },
  { table: 'products', column: 'category_id', ref: 'categories', onDelete: 'restrict' },
  { table: 'products', column: 'sub_category_id', ref: 'sub_categories', onDelete: 'restrict' },
  { table: 'product_images', column: 'product_id', ref: 'products', onDelete: 'cascade' },
  { table: 'inquiry_events', column: 'inquiry_id', ref: 'inquiry_requests', onDelete: 'set null' }
];
// 模擬「資料表尚未建立」（POST /__mock/drop），測試功能在資料表不存在時的行為
let MISSING = new Set();
// 模擬 Resend 寄信（測試時設定 RESEND_API_URL=http://127.0.0.1:54321）：記錄寄出的信，可模擬寄信失敗
let EMAILS = [];
let EMAIL_FAIL = false;
const UNIQUE = { categories: ['slug'], sub_categories: ['slug'], products: ['model_number'] };

// 解析 select：找出 alias:table!inner(cols) 形式的關聯欄位
function parseEmbeds(select) {
  const tokens = [];
  let depth = 0;
  let current = '';
  for (const ch of select || '') {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      tokens.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim()) tokens.push(current.trim());
  return tokens
    .map((t) => t.match(/^(?:(\w+):)?(\w+)(?:!inner)?\((.*)\)$/))
    .filter(Boolean)
    .map((m) => ({ alias: m[1] || m[2], table: m[2], select: m[3] }));
}

function expandRow(table, row, select) {
  const out = { ...row };
  for (const embed of parseEmbeds(select)) {
    const manyToOne = FOREIGN_KEYS.find((fk) => fk.table === table && fk.ref === embed.table);
    if (manyToOne) {
      const target = (TABLES[embed.table] || []).find((r) => r.id === row[manyToOne.column]);
      out[embed.alias] = target ? expandRow(embed.table, target, embed.select) : null;
      continue;
    }
    const oneToMany = FOREIGN_KEYS.find((fk) => fk.table === embed.table && fk.ref === table);
    if (oneToMany) {
      out[embed.alias] = (TABLES[embed.table] || [])
        .filter((r) => r[oneToMany.column] === row.id)
        .map((r) => expandRow(embed.table, r, embed.select));
    }
  }
  return out;
}

// 支援 PostgREST 的 eq.、in.() 篩選（含 category.slug 這類巢狀欄位）
function filterRows(rows, params) {
  let result = rows;
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'].includes(key)) continue;
    const get = (row) => key.split('.').reduce((obj, part) => obj?.[part], row);
    if (raw.startsWith('eq.')) {
      const value = raw.slice(3);
      result = result.filter((row) => String(get(row)) === value);
    } else if (raw.startsWith('in.(')) {
      const values = raw.slice(4, -1).split(',').map((v) => v.replace(/^"|"$/g, ''));
      result = result.filter((row) => values.includes(String(get(row))));
    }
  }
  return result;
}

function orderRows(rows, order) {
  if (!order) return rows;
  const [column, direction] = order.split(',')[0].split('.');
  const sign = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => (a[column] > b[column] ? sign : a[column] < b[column] ? -sign : 0));
}

function dbError(status, code, message) {
  return { status, body: { code, message, details: null, hint: null } };
}

function checkUnique(table, row, ignoreId) {
  for (const column of UNIQUE[table] || []) {
    if (TABLES[table].some((r) => r.id !== ignoreId && r[column] === row[column])) {
      return dbError(409, '23505', `duplicate key value violates unique constraint "${table}_${column}_key"`);
    }
  }
  return null;
}

// 刪除一筆資料並依外鍵設定連帶處理（cascade 連帶刪除、restrict 擋下）
function deleteRows(table, ids) {
  for (const fk of FOREIGN_KEYS.filter((f) => f.ref === table)) {
    const children = (TABLES[fk.table] || []).filter((r) => ids.includes(r[fk.column]));
    if (!children.length) continue;
    if (fk.onDelete === 'restrict') {
      return dbError(409, '23503', `update or delete on table "${table}" violates foreign key constraint on table "${fk.table}"`);
    }
    if (fk.onDelete === 'set null') {
      children.forEach((r) => (r[fk.column] = null));
      continue;
    }
    const error = deleteRows(fk.table, children.map((r) => r.id));
    if (error) return error;
  }
  TABLES[table] = TABLES[table].filter((r) => !ids.includes(r.id));
  return null;
}

// 模擬資料庫的讀寫（PostgREST）
function handleRest(req, url, raw) {
  const table = url.pathname.slice('/rest/v1/'.length);
  if (MISSING.has(table)) return dbError(404, 'PGRST205', `Could not find the table 'public.${table}' in the schema cache`);
  if (!TABLES[table]) TABLES[table] = [];
  const select = url.searchParams.get('select') || '*';
  const now = new Date().toISOString();
  let rows;

  if (req.method === 'GET' || req.method === 'HEAD') {
    const expanded = TABLES[table].map((r) => expandRow(table, r, select));
    rows = filterRows(expanded, url.searchParams);
    // !inner 關聯找不到時，排除該筆
    for (const embed of parseEmbeds(select)) {
      if (select.includes(`${embed.table}!inner`)) rows = rows.filter((r) => r[embed.alias] !== null);
    }
    rows = orderRows(rows, url.searchParams.get('order'));
    const limit = Number(url.searchParams.get('limit'));
    if (limit) rows = rows.slice(0, limit);
  } else if (req.method === 'POST') {
    const body = JSON.parse(raw || '[]');
    const inserted = [];
    for (const item of Array.isArray(body) ? body : [body]) {
      const row = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...item };
      const error = checkUnique(table, row);
      if (error) return error;
      for (const fk of FOREIGN_KEYS.filter((f) => f.table === table)) {
        if (row[fk.column] && !TABLES[fk.ref].some((r) => r.id === row[fk.column])) {
          return dbError(409, '23503', `insert on table "${table}" violates foreign key constraint`);
        }
      }
      TABLES[table].push(row);
      inserted.push(row);
    }
    rows = inserted.map((r) => expandRow(table, r, select));
  } else if (req.method === 'PATCH') {
    const patch = JSON.parse(raw || '{}');
    const targets = filterRows(TABLES[table], url.searchParams);
    for (const row of targets) {
      const error = checkUnique(table, { ...row, ...patch }, row.id);
      if (error) return error;
    }
    // 模擬資料庫的 updated_at 觸發器
    for (const row of targets) Object.assign(row, patch, 'updated_at' in row ? { updated_at: now } : {});
    rows = targets.map((r) => expandRow(table, r, select));
  } else if (req.method === 'DELETE') {
    const targets = filterRows(TABLES[table], url.searchParams);
    const error = deleteRows(table, targets.map((r) => r.id));
    if (error) return error;
    rows = targets;
  } else {
    return dbError(405, 'PGRST000', `mock: method ${req.method} not supported`);
  }

  const wantsObject = String(req.headers.accept || '').includes('vnd.pgrst.object');
  if (wantsObject) {
    if (rows.length === 1) return { status: 200, body: rows[0] };
    return dbError(406, 'PGRST116', 'JSON object requested, multiple (or no) rows returned');
  }
  const prefer = String(req.headers.prefer || '');
  if (req.method !== 'GET' && !prefer.includes('return=representation')) return { status: 204 };
  return { status: 200, body: rows, headers: { 'Content-Range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` } };
}

// 模擬 Storage：記錄上傳與刪除的檔案路徑
function handleStorage(req, url, raw) {
  const match = url.pathname.match(/^\/storage\/v1\/object\/([^/]+)\/?(.*)$/);
  if (!match) return { status: 200, body: {} };
  const [, bucket, objectPath] = match;
  if ((req.method === 'POST' || req.method === 'PUT') && objectPath) {
    STORAGE.add(`${bucket}/${decodeURIComponent(objectPath)}`);
    return { status: 200, body: { Key: `${bucket}/${objectPath}` } };
  }
  if (req.method === 'DELETE') {
    const { prefixes = [] } = JSON.parse(raw || '{}');
    const removed = prefixes.filter((p) => STORAGE.delete(`${bucket}/${p}`));
    return { status: 200, body: removed.map((name) => ({ name })) };
  }
  return { status: 200, body: {} };
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

    // 測試用：重設資料、查看目前資料與已上傳檔案
    if (url.pathname === '/__mock/reset') {
      TABLES = seedTables();
      STORAGE = new Set();
      MISSING = new Set();
      EMAILS = [];
      EMAIL_FAIL = false;
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/__mock/state') {
      return send(res, 200, { tables: TABLES, storage: [...STORAGE], emails: EMAILS });
    }
    if (url.pathname === '/__mock/email-fail' && req.method === 'POST') {
      EMAIL_FAIL = Boolean(JSON.parse(raw || '{}').fail);
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/emails' && req.method === 'POST') {
      if (EMAIL_FAIL) return send(res, 422, { statusCode: 422, name: 'validation_error', message: 'mock: domain is not verified' });
      const message = JSON.parse(raw || '{}');
      EMAILS.push({ ...message, authorization: req.headers.authorization });
      return send(res, 200, { id: `mock-email-${EMAILS.length}` });
    }
    if (url.pathname === '/__mock/drop' && req.method === 'POST') {
      const { table } = JSON.parse(raw || '{}');
      MISSING.add(table);
      delete TABLES[table];
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/__mock/seed' && req.method === 'POST') {
      const { table, rows } = JSON.parse(raw || '{}');
      TABLES[table] = [...(TABLES[table] || []), ...rows];
      return send(res, 200, { ok: true });
    }

    if (url.pathname.startsWith('/rest/v1/')) {
      const result = handleRest(req, url, raw);
      return send(res, result.status, result.body, result.headers);
    }
    if (url.pathname.startsWith('/storage/v1/')) {
      const result = handleStorage(req, url, raw);
      return send(res, result.status, result.body);
    }

    return send(res, 404, { msg: `mock: ${req.method} ${url.pathname} not implemented` });
  });
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => console.log(`mock supabase listening on ${PORT}`));
}

const MOCK_URL = `http://127.0.0.1:${PORT}`;

module.exports = { PASSWORD, makeAccessToken, USERS, MOCK_URL };
