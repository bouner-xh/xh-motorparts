// E2E：後台防呆（網站健診 工作包 E，桌機 1366×768）
// UX-12 詢價詳情關閉前確認＋回覆草稿還原；UX-13 切換回覆語言前確認；UX-24 產品表單欄位內嵌錯誤；
// UX-20 列表操作後不縮成載入狀態、捲動位置不跳；UX-15 toast；UX-25 離開頁面與切換語言前確認；
// UX-16 分類排序的上移／下移按鈕；UX-34 後台沒有 Cookie 橫幅
// 使用模擬 Supabase 與模擬 Resend（啟動方式同 admin-inquiry-reply.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const post = (p, body) => fetch(`${MOCK_URL}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const seed = (table, rows) => post('/__mock/seed', { table, rows });
const DESKTOP = { viewport: { width: 1366, height: 768 } };
const INQ_ID = '4a0b1c2d-0000-4000-8000-000000000701';
const CLOSE_MESSAGE = '尚未儲存或寄出的內容會消失，確定要關閉嗎？';
const CAT = { cylinder: '10000000-0000-4000-8000-000000000001', chain: '10000000-0000-4000-8000-000000000002' };
const SUB = { cylinder: '20000000-0000-4000-8000-000000000001', chain: '20000000-0000-4000-8000-000000000002' };

// 記錄瀏覽器對話框（confirm／beforeunload），mode 可隨時改成 accept 或 dismiss
function recordDialogs(page, mode = 'dismiss') {
  const rec = { mode, seen: [] };
  page.on('dialog', async (d) => {
    rec.seen.push({ type: d.type(), message: d.message() });
    if (rec.mode === 'accept') await d.accept();
    else await d.dismiss();
  });
  return rec;
}

async function login(page, tab) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, tab);
}

async function openDetail(page) {
  await page.locator('.admin-crm-panel tr', { hasText: 'Moto Italia' }).getByRole('button', { name: '檢視' }).click();
  const dialog = page.getByRole('dialog', { name: '詢價單詳情' });
  await dialog.waitFor();
  return dialog;
}

async function setupInquiry(page) {
  await post('/__mock/reset');
  await seed('inquiry_requests', [{
    id: INQ_ID, customer_name: 'Marco Rossi', customer_email: 'marco@moto.example', company_name: 'Moto Italia', country: 'Italy',
    items: [{ modelNumber: 'CYL-125-STD', nameZhTw: '汽缸組 125cc', nameEn: 'Cylinder Kit 125cc', quantity: 200 }],
    status: 'pending', reply_notes: '', created_at: '2026-09-27T16:30:00Z', updated_at: '2026-09-27T16:30:00Z',
  }]);
  await login(page, '詢價');
}

const draftKey = `xh-admin-reply-draft:${INQ_ID}`;
const readDraft = (page) => page.evaluate((k) => sessionStorage.getItem(k), draftKey);

run('詢價詳情：沒改東西直接關；備忘錄或狀態有修改時，Esc、點視窗外、關閉按鈕都先確認', () =>
  withPage(async (page) => {
    await setupInquiry(page);
    const rec = recordDialogs(page, 'dismiss');
    let dialog = await openDetail(page);

    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert(rec.seen.length === 0, '沒有修改時按 Esc 直接關閉，不跳確認');

    dialog = await openDetail(page);
    await dialog.getByLabel(/處理備忘錄/).fill('報價 USD 12，下週回覆');
    const ways = [
      ['按 Esc', () => page.keyboard.press('Escape')],
      ['點視窗外', () => page.mouse.click(10, 10)],
      ['按「關閉」', () => dialog.getByRole('button', { name: '關閉', exact: true }).click()],
    ];
    for (const [name, act] of ways) {
      rec.mode = 'dismiss';
      rec.seen.length = 0;
      await act();
      assert(rec.seen.length === 1 && rec.seen[0].type === 'confirm' && rec.seen[0].message === CLOSE_MESSAGE, `${name}：跳出確認「${rec.seen[0] && rec.seen[0].message}」`);
      assert(await dialog.isVisible(), `${name}：按取消後視窗仍在`);
      assert((await dialog.getByLabel(/處理備忘錄/).inputValue()) === '報價 USD 12，下週回覆', `${name}：備忘錄內容還在`);
    }

    // 只改狀態也算未儲存
    await dialog.getByLabel(/處理備忘錄/).fill('');
    await dialog.getByLabel('跟進狀態').selectOption('processing');
    rec.seen.length = 0;
    await page.keyboard.press('Escape');
    assert(rec.seen.length === 1 && rec.seen[0].message === CLOSE_MESSAGE, '只改狀態，關閉前也會確認');
    assert(await dialog.isVisible(), '取消後仍在');

    rec.mode = 'accept';
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert((await mockState()).tables.inquiry_requests[0].status === 'pending', '確定關閉後沒有儲存任何修改');
  }, DESKTOP)
);

run('回覆撰寫中：Esc 先確認；草稿存在 sessionStorage，重開同一張詢價單自動還原，捨棄後清除', () =>
  withPage(async (page) => {
    await setupInquiry(page);
    const rec = recordDialogs(page, 'dismiss');
    let dialog = await openDetail(page);
    await dialog.getByRole('button', { name: '回覆客戶' }).click();
    await dialog.getByTestId('reply-editor').waitFor();
    const body = dialog.getByLabel('內容');
    const edited = (await body.inputValue()).replace('[Please fill in unit price, MOQ, lead time and payment terms here]', 'Unit price: USD 12.50\nMOQ: 100 pcs');
    await body.fill(edited);

    await page.keyboard.press('Escape');
    assert(rec.seen.length === 1 && rec.seen[0].message === CLOSE_MESSAGE, '撰寫中按 Esc 跳出確認');
    assert(await dialog.getByTestId('reply-editor').isVisible() && (await body.inputValue()) === edited, '按取消後仍在編輯畫面且內容保留');
    const stored = JSON.parse((await readDraft(page)) || 'null');
    assert(stored && stored.body === edited && stored.language === 'en', '草稿已暫存在 sessionStorage（鍵含詢價單編號）');

    rec.mode = 'accept';
    await page.mouse.click(10, 10);
    await dialog.waitFor({ state: 'detached' });
    assert(rec.seen.length === 2 && rec.seen[1].message === CLOSE_MESSAGE, '撰寫中點視窗外也會確認');
    assert((await readDraft(page)) !== null, '關閉後草稿仍保留');

    dialog = await openDetail(page);
    await dialog.getByRole('button', { name: '回覆客戶' }).click();
    const reopened = dialog.getByLabel('內容');
    assert((await reopened.inputValue()) === edited, '重開同一張詢價單：回覆內容自動還原');
    const notice = dialog.getByTestId('reply-draft-notice');
    assert(await notice.isVisible() && /已還原/.test(await notice.innerText()), '顯示「已還原草稿」提示');

    await notice.getByRole('button', { name: '捨棄草稿' }).click();
    assert(!(await reopened.inputValue()).includes('USD 12.50'), '捨棄草稿後回到範本');
    assert((await readDraft(page)) === null, '捨棄後草稿已清除');
    assert((await notice.count()) === 0, '提示消失');

    // 「取消」：內容有修改時先確認，確定後視為明確丟棄
    await reopened.fill(edited);
    rec.mode = 'dismiss';
    rec.seen.length = 0;
    await dialog.getByRole('button', { name: '取消', exact: true }).click();
    assert(rec.seen.length === 1 && /草稿/.test(rec.seen[0].message), '有修改時按「取消」先確認是否捨棄草稿');
    assert(await dialog.getByTestId('reply-editor').isVisible(), '按取消後仍在編輯');
    rec.mode = 'accept';
    await dialog.getByRole('button', { name: '取消', exact: true }).click();
    await dialog.getByRole('button', { name: '回覆客戶' }).waitFor();
    assert((await readDraft(page)) === null, '確定捨棄後草稿清除');
  }, DESKTOP)
);

run('回覆信寄出成功後清除草稿', () =>
  withPage(async (page) => {
    await setupInquiry(page);
    recordDialogs(page, 'accept');
    const dialog = await openDetail(page);
    await dialog.getByRole('button', { name: '回覆客戶' }).click();
    const body = dialog.getByLabel('內容');
    await body.fill((await body.inputValue()).replace('[Please fill in unit price, MOQ, lead time and payment terms here]', 'USD 12.50'));
    assert((await readDraft(page)) !== null, '編輯後有草稿');
    await dialog.getByRole('button', { name: '預覽' }).click();
    await dialog.getByTestId('reply-preview').getByRole('button', { name: '確認寄出' }).click();
    await page.getByText(/已寄出回覆給 Moto Italia/).waitFor({ timeout: 15000 });
    assert((await readDraft(page)) === null, '寄出成功後草稿已清除');
    assert((await mockState()).emails.length === 1, '信件已寄出');
  }, DESKTOP)
);

run('回覆信切換語言：內容被改過先確認會覆蓋；沒改過直接切換', () =>
  withPage(async (page) => {
    await setupInquiry(page);
    const rec = recordDialogs(page, 'dismiss');
    const dialog = await openDetail(page);
    await dialog.getByRole('button', { name: '回覆客戶' }).click();
    const subject = dialog.getByLabel('主旨');
    const body = dialog.getByLabel('內容');

    await dialog.getByRole('button', { name: '中文' }).click();
    assert(rec.seen.length === 0, '沒改過內容：切換不跳確認');
    assert((await subject.inputValue()) === '協皇企業報價回覆 [RFQ-20260928-4A0B]', '已切成中文範本');
    await dialog.getByRole('button', { name: 'English' }).click();
    assert(rec.seen.length === 0, '再切回英文也不跳確認');

    const hint = await dialog.locator('.reply-composer__lang').innerText();
    assert(/覆蓋/.test(hint), `提示文字說明會覆蓋已編輯內容（${hint}）`);

    const edited = (await body.inputValue()) + '\nP.S. special price';
    await body.fill(edited);
    await dialog.getByRole('button', { name: '中文' }).click();
    assert(rec.seen.length === 1 && rec.seen[0].message.includes('切換語言會覆蓋目前內容'), `改過內容後切換：跳出確認（${rec.seen[0] && rec.seen[0].message}）`);
    assert((await body.inputValue()) === edited, '按取消：內容保留');
    assert((await dialog.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')) === 'true', '按取消：仍是英文');

    rec.mode = 'accept';
    await dialog.getByRole('button', { name: '中文' }).click();
    assert(!(await body.inputValue()).includes('special price') && (await body.inputValue()).includes('您好'), '確定後套用中文範本');
  }, DESKTOP)
);

async function openProductForm(page, prepare) {
  await post('/__mock/reset');
  if (prepare) await prepare();
  await login(page, '產品');
  const form = page.locator('[data-testid="admin-product-form"]');
  await form.waitFor({ timeout: 30000 });
  await page.waitForFunction(() => {
    const f = document.querySelector('[data-testid="admin-product-form"]');
    return f && f.querySelectorAll('select')[1] && f.querySelectorAll('select')[1].options.length > 1;
  });
  return form;
}

const activeId = (page) => page.evaluate(() => document.activeElement && document.activeElement.id);

run('產品表單：必填星號、欄位內嵌錯誤、aria 標示、送出失敗聚焦第一個錯誤欄位', () =>
  withPage(async (page) => {
    const form = await openProductForm(page);
    const model = form.getByLabel('型號', { exact: true });
    assert((await model.getAttribute('required')) !== null, '型號有 required 語意');
    assert((await form.getByLabel('名稱（en）').getAttribute('required')) !== null, '名稱（en）有 required 語意');
    const star = await page.evaluate(() => {
      const label = [...document.querySelectorAll('[data-testid="admin-product-form"] label')].find((l) => l.textContent.trim().startsWith('型號'));
      return getComputedStyle(label.querySelector('.admin-required'), '::after').content;
    });
    assert(/\*/.test(star), `必填欄位標紅色星號（${star}）`);

    await form.getByRole('button', { name: '新增產品' }).click();
    const modelError = form.getByTestId('field-error-modelNumber');
    await modelError.waitFor();
    assert((await modelError.innerText()).includes('型號不可為空'), '型號欄位下方顯示訊息');
    assert((await model.getAttribute('aria-invalid')) === 'true', '型號 aria-invalid');
    const describedBy = await model.getAttribute('aria-describedby');
    assert(describedBy && describedBy.split(' ').includes(await modelError.getAttribute('id')), '型號 aria-describedby 指向錯誤訊息');
    assert(await form.getByTestId('field-error-nameEn').isVisible(), '名稱（en）也有自己的錯誤訊息');
    assert(await form.getByTestId('field-error-subCategoryId').isVisible(), '子分類也有自己的錯誤訊息');
    const border = await model.evaluate((el) => getComputedStyle(el).borderColor);
    assert(border !== (await form.getByLabel('名稱（zh-TW）').evaluate((el) => getComputedStyle(el).borderColor)), `錯誤欄位紅框（${border}）`);
    assert(/標示/.test(await form.getByTestId('product-form-summary').innerText()), '頂部摘要提示看標示的欄位');
    assert((await activeId(page)) === 'product-field-subCategoryId', `自動聚焦第一個錯誤欄位（${await activeId(page)}）`);

    await form.getByLabel('子分類').selectOption(SUB.cylinder);
    await form.getByRole('button', { name: '新增產品' }).click();
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'product-field-modelNumber');
    assert(!(await form.getByTestId('field-error-subCategoryId').count()), '改好的欄位錯誤訊息消失');

    // 伺服器回傳的錯誤（型號重複）顯示在型號欄位旁
    await model.fill('1HV-11311-00');
    await form.getByLabel('名稱（en）').fill('Dup');
    await form.getByRole('button', { name: '新增產品' }).click();
    await modelError.filter({ hasText: '已經存在' }).waitFor({ timeout: 30000 });
    assert((await model.getAttribute('aria-invalid')) === 'true', '型號重複：型號欄位標紅');
    assert(await form.getByTestId('product-form-summary').isVisible(), '型號重複：頂部摘要保留');
    assert((await activeId(page)) === 'product-field-modelNumber', '型號重複：聚焦型號欄位');
    await model.fill('NEW-OK-1');
    assert(!(await modelError.count()), '重新輸入後該欄位錯誤消失');
  }, DESKTOP)
);

run('產品表單：OEM 料號重複顯示在 OEM 欄位旁', () =>
  withPage(async (page) => {
    const form = await openProductForm(page, () => seed('products', [{ id: '30000000-0000-4000-8000-000000000999', category_id: CAT.cylinder, sub_category_id: SUB.cylinder, model_number: 'OEM-OWNER', name_i18n: { en: 'Owner' }, specifications: [], stock_quantity: 1, is_active: true, oem_numbers: ['ABC-123'] }]));
    await form.getByLabel('子分類').selectOption(SUB.cylinder);
    await form.getByLabel('型號', { exact: true }).fill('OEM-NEW');
    await form.getByLabel('名稱（en）').fill('X');
    await form.getByLabel(/^OEM／對照料號/).fill('ABC-123');
    await form.getByRole('button', { name: '新增產品' }).click();
    const err = form.getByTestId('field-error-oemNumbers');
    await err.waitFor({ timeout: 30000 });
    assert(/已經被產品/.test(await err.innerText()), `OEM 欄位旁顯示重複訊息（${await err.innerText()}）`);
  }, DESKTOP)
);

function extraProducts() {
  return Array.from({ length: 23 }, (_, i) => {
    const chain = i < 8;
    const n = String(i + 1).padStart(2, '0');
    return {
      id: `30000000-0000-4000-8000-0000000001${n}`,
      category_id: chain ? CAT.chain : CAT.cylinder,
      sub_category_id: chain ? SUB.chain : SUB.cylinder,
      model_number: `${chain ? 'CH' : 'CY'}-${n}`,
      name_i18n: { 'zh-TW': `${chain ? '鏈條' : '汽缸'}零件 ${n}`, 'zh-CN': '零件', en: 'Part' },
      specifications: [],
      stock_quantity: 1,
      is_active: true,
    };
  });
}

run('產品列表上下架後：舊列表不清空、捲動位置不跳；結果以 toast 顯示（role=status，數秒後自動消失）', () =>
  withPage(async (page) => {
    await post('/__mock/reset');
    await seed('products', extraProducts());
    await login(page, '產品');
    await page.getByText(/共 25 筆，第 1 \/ 2 頁/).last().waitFor({ timeout: 30000 });
    const panel = page.locator('#admin-panel-products');
    const rows = panel.locator('tr', { has: page.getByRole('button', { name: '複製' }) });
    assert((await rows.count()) === 20, '第一頁 20 列');

    // 讓重新載入變慢，才看得出載入期間畫面有沒有縮水
    await page.route('**/api/admin/products', async (route) => {
      if (route.request().method() === 'GET') await new Promise((r) => setTimeout(r, 1200));
      await route.continue();
    });
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' }); // 關掉平滑捲動，量測才準
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const target = rows.nth(14);
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000); // 全站設定了平滑捲動，等捲動停下來
    await target.getByRole('button', { name: '下架' }).hover(); // Playwright 點擊前會自動把按鈕捲進畫面，先做完再量
    // 等捲動位置穩定（連續 400ms 不變）才開始量
    for (let last = -1, stable = 0; stable < 8; ) {
      const y = await page.evaluate(() => window.scrollY);
      stable = y === last ? stable + 1 : 0;
      last = y;
      await page.waitForTimeout(50);
    }
    const before = await page.evaluate(() => window.scrollY);
    assert(before > 300, `列表已捲動（scrollY=${before}）`);
    await page.evaluate(() => {
      window.__samples = [];
      window.__timer = setInterval(() => {
        const panelEl = document.getElementById('admin-panel-products');
        window.__samples.push({
          rows: [...panelEl.querySelectorAll('tbody tr')].length,
          loading: panelEl.textContent.includes('載入中...'),
          y: window.scrollY,
        });
      }, 25);
    });
    const toggle = target.getByRole('button', { name: '下架' });
    await toggle.click();
    const toast = page.getByTestId('admin-toast');
    await toast.filter({ hasText: '已下架' }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1800);
    const samples = await page.evaluate(() => {
      clearInterval(window.__timer);
      return window.__samples;
    });
    assert(samples.length > 20, `取樣 ${samples.length} 次`);
    assert(samples.every((s) => !s.loading), '重新載入期間沒有出現「載入中...」');
    assert(samples.every((s) => s.rows === 20), `重新載入期間列表一直是 20 列（最少 ${Math.min(...samples.map((s) => s.rows))}）`);
    const ys = samples.map((s) => s.y);
    assert(Math.max(...ys) - Math.min(...ys) <= 2, `捲動位置沒有跳動（${Math.min(...ys)}–${Math.max(...ys)}）`);

    assert((await toast.evaluate((el) => el.closest('[role="status"]') !== null)), '成功訊息放在 role=status 區域');
    assert((await toast.evaluate((el) => getComputedStyle(el.closest('.admin-toast-region')).position)) === 'fixed', 'toast 固定在視窗上');
    await toast.waitFor({ state: 'detached', timeout: 9000 });
    assert(true, '成功訊息數秒後自動消失');
  }, DESKTOP)
);

run('toast：錯誤用 role=alert、不自動消失，可手動關閉', () =>
  withPage(async (page) => {
    await post('/__mock/reset');
    await login(page, '產品');
    await page.getByText(/共 \d+ 筆，第 1 \/ \d+ 頁/).last().waitFor({ timeout: 30000 });
    await page.route('**/api/admin/products', async (route) => {
      if (route.request().method() === 'PUT') return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: '模擬下架失敗' }) });
      return route.continue();
    });
    const panel = page.locator('#admin-panel-products');
    await panel.locator('tr', { hasText: '1HV-11311-00' }).getByRole('button', { name: '下架' }).click();
    const toast = page.getByTestId('admin-toast').filter({ hasText: '模擬下架失敗' });
    await toast.waitFor();
    assert(await toast.evaluate((el) => el.closest('[role="alert"]') !== null), '錯誤訊息放在 role=alert 區域');
    await page.waitForTimeout(6500);
    assert(await toast.isVisible(), '錯誤訊息超過成功訊息的消失時間仍在');
    await toast.getByRole('button', { name: '關閉訊息' }).click();
    await toast.waitFor({ state: 'detached' });
    assert(true, '可以手動關閉');
  }, DESKTOP)
);

run('產品表單有未儲存內容：重新整理跳瀏覽器確認；切換語言連結先確認；沒內容時都不打擾', () =>
  withPage(async (page) => {
    const form = await openProductForm(page);
    const rec = recordDialogs(page, 'dismiss');
    const lang = page.locator('nav.nav').getByRole('link', { name: 'EN', exact: true });

    await lang.click();
    await page.waitForURL(/\/en\/admin\/dashboard/, { timeout: 30000 });
    assert(rec.seen.length === 0, '表單是空的：切換語言不跳確認');
    await page.goto(`${BASE_URL}/zh-TW/admin/dashboard#products`);
    await form.waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('[data-testid="admin-product-form"]').querySelectorAll('select')[1].options.length > 1);

    await form.getByLabel('型號', { exact: true }).fill('DRAFT-1');
    await page.mouse.click(5, 300);
    await lang.click();
    await page.waitForTimeout(500);
    assert(rec.seen.length === 1 && rec.seen[0].type === 'confirm' && /尚未儲存/.test(rec.seen[0].message), `有未儲存內容：切換語言先確認（${rec.seen[0] && rec.seen[0].message}）`);
    assert(new URL(page.url()).pathname === '/zh-TW/admin/dashboard', '按取消：留在原頁');
    assert((await form.getByLabel('型號', { exact: true }).inputValue()) === 'DRAFT-1', '表單內容還在');

    rec.seen.length = 0;
    await page.evaluate(() => setTimeout(() => location.reload(), 0));
    await page.waitForTimeout(1000);
    assert(rec.seen.length === 1 && rec.seen[0].type === 'beforeunload', `重新整理：跳出離開確認（${JSON.stringify(rec.seen)}）`);
    assert((await form.getByLabel('型號', { exact: true }).inputValue()) === 'DRAFT-1', '按取消後仍在原頁');

    rec.mode = 'accept';
    await lang.click();
    await page.waitForURL(/\/en\/admin\/dashboard/, { timeout: 30000 });
    assert(true, '確定後切換成功');
  }, DESKTOP)
);

run('分類與子分類排序：每列有上移／下移按鈕，頭尾禁用，儲存沿用排序 API', () =>
  withPage(async (page) => {
    await post('/__mock/reset');
    await login(page, '分類');
    await page.getByRole('button', { name: '新增大分類' }).waitFor({ timeout: 30000 });
    const panel = page.locator('#admin-panel-categories');
    await panel.locator('tbody tr', { hasText: 'chain' }).first().waitFor();

    const up = (name) => panel.getByRole('button', { name: `上移：${name}`, exact: true });
    const down = (name) => panel.getByRole('button', { name: `下移：${name}`, exact: true });
    assert(await up('汽缸').isDisabled(), '最上面一列的「上移」禁用');
    assert(await down('鏈條').isDisabled(), '最下面一列的「下移」禁用');
    assert(await down('汽缸').isEnabled() && await up('鏈條').isEnabled(), '其他按鈕可用');

    const saves = [];
    page.on('request', (req) => {
      if (req.method() === 'PUT' && req.url().endsWith('/api/admin/categories')) saves.push(JSON.parse(req.postData()));
    });
    await down('汽缸').click();
    await page.getByTestId('admin-toast').filter({ hasText: '排列順序儲存成功' }).waitFor({ timeout: 15000 });
    assert(saves.length === 1 && Array.isArray(saves[0]) && saves[0].length === 2, '送出陣列格式的排序');
    const first = await panel.locator('tbody tr').first().innerText();
    assert(first.includes('chain'), `畫面順序已交換（${first.slice(0, 20)}）`);
    const cats = (await mockState()).tables.categories;
    const sort = (slug) => cats.find((c) => c.slug === slug).sort_order;
    assert(sort('chain') < sort('cylinder'), '資料庫排序已更新');
    assert(await up('鏈條').isDisabled() && await down('汽缸').isDisabled(), '交換後按鈕狀態跟著變');

    // 子分類
    const subSaves = [];
    page.on('request', (req) => {
      if (req.method() === 'PUT' && req.url().endsWith('/api/admin/sub-categories')) subSaves.push(JSON.parse(req.postData()));
    });
    assert(await up('標準汽缸').isDisabled() && await down('標準鏈條').isDisabled(), '子分類：頭尾禁用');
    await down('標準汽缸').click();
    await page.getByTestId('admin-toast').filter({ hasText: '排列順序儲存成功' }).waitFor({ timeout: 15000 });
    assert(subSaves.length === 1 && Array.isArray(subSaves[0]), '子分類沿用陣列格式排序 API');
    const subs = (await mockState()).tables.sub_categories;
    assert(subs.find((s) => s.slug === 'chain-std').sort_order < subs.find((s) => s.slug === 'std').sort_order, '子分類資料庫排序已更新');
  }, DESKTOP)
);

run('Cookie 橫幅只給訪客：後台頁面不顯示，前台仍顯示', () =>
  withPage(async (page) => {
    await post('/__mock/reset');
    await page.goto(`${BASE_URL}/zh-TW`);
    await page.locator('#rcc-confirm-button').waitFor({ timeout: 30000 });
    assert(true, '前台首頁有 Cookie 橫幅');
    await page.goto(`${BASE_URL}/zh-TW/admin/login`);
    await page.locator('input[name="email"]').waitFor();
    await page.waitForTimeout(1500);
    assert((await page.locator('#rcc-confirm-button').count()) === 0, '後台登入頁沒有 Cookie 橫幅');
    await login(page, '產品');
    await page.waitForTimeout(1000);
    assert((await page.locator('#rcc-confirm-button').count()) === 0, '後台儀表板沒有 Cookie 橫幅');
    await page.goto(`${BASE_URL}/en/products`);
    await page.locator('#rcc-confirm-button').waitFor({ timeout: 30000 });
    assert(true, '離開後台回到前台，橫幅再度出現');
  }, DESKTOP)
);
