// E2E：後台更新產品的保護與便利功能（U1–U6）
// 產品已被刪除時不回報成功、庫存上限、改型號確認、切換產品前確認未儲存內容、刪除確認、列表直接上架／下架
// 使用模擬 Supabase（啟動方式同 admin-product-form.e2e.cjs）
const { BASE_URL, withPage, assert, run, openAdminTab } = require('./helpers.cjs');
const { PASSWORD, MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const mockState = async () => (await fetch(`${MOCK_URL}/__mock/state`)).json();
const P1 = { id: '30000000-0000-4000-8000-000000000001', model: '1HV-11311-00' };
const P2 = { model: '5TJ-11311-00' };
const CYLINDER_SUB = '20000000-0000-4000-8000-000000000001';

async function openProducts(page) {
  await page.goto(`${BASE_URL}/zh-TW/admin/login`);
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin\/dashboard/, { timeout: 60000 }), page.click('form button[type="submit"]')]);
  await openAdminTab(page, '產品');
  const form = page.locator('[data-testid="admin-product-form"]');
  await form.waitFor({ timeout: 30000 });
  await page.getByRole('row', { name: new RegExp(P1.model) }).waitFor({ timeout: 30000 });
  return form;
}

function recordDialogs(page, accept) {
  const messages = [];
  page.on('dialog', (d) => {
    messages.push(d.message());
    return accept ? d.accept() : d.dismiss();
  });
  return messages;
}

const put = (page, body) =>
  page.evaluate(async (body) => {
    const res = await fetch('/api/admin/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  }, body);

const rowOf = (page, model) => page.getByRole('row', { name: new RegExp(model) });

run('更新已被刪除的產品：回報找不到，不顯示成功；庫存超過上限被擋下', () =>
  withPage(async (page) => {
    await resetMock();
    await openProducts(page);
    const base = { category: 'cylinder', modelNumber: 'GONE-1', nameZhTw: 'a', nameZhCn: 'a', nameEn: 'a', subCategoryId: CYLINDER_SUB };
    const gone = await put(page, { ...base, id: '30000000-0000-4000-8000-0000000000ff' });
    assert(gone.status === 404 && gone.body.error.includes('找不到這筆產品'), `不存在的產品回應 404（${gone.status} ${gone.body.error}）`);
    const big = await put(page, { ...base, id: P1.id, stockQuantity: 1000001 });
    assert(big.status === 400 && big.body.error.includes('庫存必須是 0 到 1,000,000'), `庫存過大回應 400（${big.body.error}）`);
    const ok = await put(page, { ...base, id: P1.id, modelNumber: P1.model, stockQuantity: 1000000 });
    assert(ok.status === 200, `庫存剛好 1,000,000 可以儲存（${ok.status}）`);
  })
);

run('改型號：先跳出確認，取消就不儲存，確定才儲存', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openProducts(page);
    const dialogs = recordDialogs(page, false);
    await rowOf(page, P1.model).getByRole('button', { name: '編輯' }).click();
    await form.getByLabel('型號').fill('NEW-MODEL-1');
    await form.getByRole('button', { name: '更新產品' }).click();
    await page.waitForTimeout(800);
    assert(/舊網址將無法開啟/.test(dialogs[0] || '') && dialogs[0].includes(P1.model) && dialogs[0].includes('NEW-MODEL-1'), `確認訊息提到新舊型號（${dialogs[0]}）`);
    let { tables } = await mockState();
    assert(tables.products.some((p) => p.model_number === P1.model), '按取消：型號沒有被改');

    page.removeAllListeners('dialog');
    const accepted = recordDialogs(page, true);
    await form.getByRole('button', { name: '更新產品' }).click();
    await page.getByText('產品更新成功').waitFor({ timeout: 30000 });
    ({ tables } = await mockState());
    assert(tables.products.some((p) => p.model_number === 'NEW-MODEL-1'), '按確定：型號已更新');
    assert(accepted.length === 1, '只確認一次');
  })
);

run('只改名稱不改型號：不跳確認', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openProducts(page);
    const dialogs = recordDialogs(page, true);
    await rowOf(page, P1.model).getByRole('button', { name: '編輯' }).click();
    await form.getByLabel('名稱（en）').fill('Cylinder Body X');
    await form.getByRole('button', { name: '更新產品' }).click();
    await page.getByText('產品更新成功').waitFor({ timeout: 30000 });
    assert(dialogs.length === 0, `沒有跳出確認視窗（${dialogs.length}）`);
  })
);

run('編輯到一半切換到其他產品：有未儲存內容才確認，取消後留在原本的產品', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openProducts(page);
    const dialogs = recordDialogs(page, false);
    await rowOf(page, P1.model).getByRole('button', { name: '編輯' }).click();
    // 沒改任何東西就切換：不確認
    await rowOf(page, P2.model).getByRole('button', { name: '編輯' }).click();
    assert(dialogs.length === 0, '沒有修改時切換不跳確認');
    assert((await form.getByLabel('型號').inputValue()) === P2.model, '已切換到第二個產品');

    await form.getByLabel('名稱（en）').fill('Changed but not saved');
    await rowOf(page, P1.model).getByRole('button', { name: '編輯' }).click();
    assert(dialogs.length === 1 && dialogs[0].includes('還沒儲存'), `有修改時跳出確認（${dialogs[0]}）`);
    assert((await form.getByLabel('型號').inputValue()) === P2.model, '按取消：仍停在原本的產品');
    assert((await form.getByLabel('名稱（en）').inputValue()) === 'Changed but not saved', '輸入的內容還在');

    page.removeAllListeners('dialog');
    recordDialogs(page, true);
    await rowOf(page, P1.model).getByRole('button', { name: '編輯' }).click();
    assert((await form.getByLabel('型號').inputValue()) === P1.model, '按確定：切換到第一個產品');
  })
);

run('刪除確認寫出型號；列表可直接下架與上架', () =>
  withPage(async (page) => {
    await resetMock();
    await openProducts(page);
    const dialogs = recordDialogs(page, false);
    await rowOf(page, P1.model).getByRole('button', { name: '刪除' }).click();
    await page.waitForTimeout(500);
    assert(dialogs[0]?.includes(`「${P1.model}」`) && dialogs[0].includes('下架'), `確認訊息寫出型號並提示可改下架（${dialogs[0]}）`);
    let { tables } = await mockState();
    assert(tables.products.some((p) => p.model_number === P1.model), '按取消：產品還在');

    await rowOf(page, P1.model).getByRole('button', { name: '下架' }).click();
    await page.getByText(`${P1.model} 已下架`).waitFor({ timeout: 30000 });
    ({ tables } = await mockState());
    assert(tables.products.find((p) => p.model_number === P1.model).is_active === false, '資料庫已改為未上架');
    // 沒有圖片的產品上架時會提醒（U8）：先取消，再確定
    await rowOf(page, P1.model).getByRole('button', { name: '上架' }).click();
    await page.waitForTimeout(500);
    assert(dialogs[1]?.includes('還沒有圖片'), `沒有圖片時上架會提醒（${dialogs[1]}）`);
    ({ tables } = await mockState());
    assert(tables.products.find((p) => p.model_number === P1.model).is_active === false, '按取消：維持下架');
    page.removeAllListeners('dialog');
    recordDialogs(page, true);
    await rowOf(page, P1.model).getByRole('button', { name: '上架' }).click();
    await page.getByText(`${P1.model} 已上架`).waitFor({ timeout: 30000 });
    ({ tables } = await mockState());
    assert(tables.products.find((p) => p.model_number === P1.model).is_active === true, '資料庫已改回上架');
    assert(tables.products.find((p) => p.model_number === P1.model).name_i18n.en === 'Cylinder Body', '其他欄位沒有被改到');
  })
);

const seedImage = (rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'product_images', rows }) });
const IMG = 'https://example.supabase.co/storage/v1/object/public/product-images/products/2026-10-09/a.jpg';

run('新增並上架但沒有圖片：提醒，取消不儲存；有圖片或未上架不提醒', () =>
  withPage(async (page) => {
    await resetMock();
    const form = await openProducts(page);
    await form.getByLabel('型號').fill('NOIMG-1');
    await form.getByLabel('名稱（zh-TW）').fill('無圖');
    await form.getByLabel('名稱（zh-CN）').fill('无图');
    await form.getByLabel('名稱（en）').fill('No image');
    await form.getByLabel('子分類').selectOption(CYLINDER_SUB);
    await form.getByLabel('上架').check();
    const dialogs = recordDialogs(page, false);
    await form.getByRole('button', { name: '新增產品' }).click();
    await page.waitForTimeout(800);
    assert(dialogs.length === 1 && dialogs[0].includes('還沒有圖片'), `提醒沒有圖片（${dialogs[0]}）`);
    let { tables } = await mockState();
    assert(!tables.products.some((p) => p.model_number === 'NOIMG-1'), '按取消：沒有新增');

    await form.getByLabel('上架').uncheck();
    await form.getByRole('button', { name: '新增產品' }).click();
    await page.getByText('產品新增成功').waitFor({ timeout: 30000 });
    assert(dialogs.length === 1, '未上架時不提醒');
    ({ tables } = await mockState());
    assert(tables.products.some((p) => p.model_number === 'NOIMG-1' && p.is_active === false), '未上架可以直接新增');
  })
);

run('移除圖片：按下該張圖的「移除」並更新後，圖片紀錄被清除', () =>
  withPage(async (page) => {
    await resetMock();
    await seedImage([{ id: '40000000-0000-4000-8000-000000000001', product_id: P1.id, storage_path: IMG, sort_order: 0 }]);
    const form = await openProducts(page);
    await rowOf(page, P1.model).getByRole('button', { name: '編輯' }).click();
    await form.getByRole('button', { name: '移除第 1 張' }).click();
    assert((await form.getByRole('button', { name: '移除第 1 張' }).count()) === 0, '按鈕在移除後消失');
    let { tables } = await mockState();
    assert(tables.product_images.length === 1, '還沒按更新前，圖片仍在資料庫');
    await form.getByRole('button', { name: '更新產品' }).click();
    await page.getByText('產品更新成功').waitFor({ timeout: 30000 });
    ({ tables } = await mockState());
    assert(!tables.product_images.some((i) => i.product_id === P1.id), '圖片紀錄已刪除');
    assert(tables.products.some((p) => p.id === P1.id), '產品本身還在');
  })
);
