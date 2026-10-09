// E2E：分類卡片的封面圖不會破圖
// 封面順序：分類自己上傳的封面 → 該分類第一個產品的照片 → 預設圖
// 使用模擬 Supabase（啟動方式同 product-urls.e2e.cjs）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const resetMock = () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
const seed = (table, rows) =>
  fetch(`${MOCK_URL}/__mock/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, rows }) });
const i18n = (tw, en) => ({ 'zh-TW': tw, 'zh-CN': tw, en });

const CAT = { clutch: '10000000-0000-4000-8000-0000000000a1', starter: '10000000-0000-4000-8000-0000000000a2', fork: '10000000-0000-4000-8000-0000000000a3' };
const SUB = { clutch: '20000000-0000-4000-8000-0000000000a1', starter: '20000000-0000-4000-8000-0000000000a2', fork: '20000000-0000-4000-8000-0000000000a3' };
const PRODUCT_PHOTO = 'images/products/cylinder/cylinder-003.jpg';
const OWN_COVER = 'images/products/chain/' + require('node:fs').readdirSync('images/products/chain')[0];

async function seedCategories() {
  await resetMock();
  await seed('categories', [
    { id: CAT.clutch, slug: 'clutch-housing', sort_order: 10, name_i18n: i18n('離合器系列', 'Clutch'), description_i18n: i18n('離合器', 'Clutch parts'), cover_image: OWN_COVER },
    { id: CAT.starter, slug: 'starter-motor', sort_order: 11, name_i18n: i18n('啟動系統', 'Starter'), description_i18n: i18n('啟動', 'Starter parts') },
    { id: CAT.fork, slug: 'drum-fork', sort_order: 12, name_i18n: i18n('變數鼓撥插', 'Drum fork'), description_i18n: i18n('撥插', 'Drum fork parts') }
  ]);
  await seed('sub_categories', [
    { id: SUB.clutch, category_id: CAT.clutch, slug: 'a', sort_order: 1, name_i18n: i18n('甲', 'A') },
    { id: SUB.starter, category_id: CAT.starter, slug: 'b', sort_order: 1, name_i18n: i18n('乙', 'B') },
    { id: SUB.fork, category_id: CAT.fork, slug: 'c', sort_order: 1, name_i18n: i18n('丙', 'C') }
  ]);
  const prod = (n, cat, sub) => ({ id: `30000000-0000-4000-8000-0000000000b${n}`, category_id: cat, sub_category_id: sub, model_number: `COV-${n}`, name_i18n: i18n(`產品${n}`, `Product ${n}`), stock_quantity: 1, specifications: [], is_active: true });
  await seed('products', [prod(1, CAT.clutch, SUB.clutch), prod(2, CAT.starter, SUB.starter), prod(3, CAT.fork, SUB.fork)]);
  // 啟動系統的產品有照片；變數鼓撥插沒有照片
  await seed('product_images', [{ id: '40000000-0000-4000-8000-0000000000c2', product_id: '30000000-0000-4000-8000-0000000000b2', storage_path: PRODUCT_PHOTO, sort_order: 0 }]);
}

const coverSrc = async (page, path, name) => {
  await page.goto(`${BASE_URL}${path}`);
  const img = page.locator('.category-card img', { hasText: '' }).and(page.locator(`img[alt="${name}"]`));
  await img.first().waitFor({ state: 'attached' });
  return img.first().getAttribute('src');
};

run('分類封面：自己上傳的封面、第一個產品的照片、預設圖，三種情況都能載入', () =>
  withPage(async (page) => {
    await seedCategories();
    for (const path of ['/zh-TW', '/zh-TW/products', '/en/products']) {
      const en = path.startsWith('/en');
      const names = en ? ['Clutch', 'Starter', 'Drum fork'] : ['離合器系列', '啟動系統', '變數鼓撥插'];
      const srcs = [];
      for (const name of names) srcs.push(await coverSrc(page, path, name));
      assert(srcs[0].includes(`/legacy-assets/${OWN_COVER.replace(/^images\//, '')}`), `${path} 離合器系列使用自己上傳的封面（${srcs[0]}）`);
      assert(srcs[1].includes('/legacy-assets/products/cylinder/cylinder-003.jpg'), `${path} 啟動系統使用第一個產品的照片（${srcs[1]}）`);
      assert(srcs[2].includes('/no-image.svg'), `${path} 沒有照片的分類使用預設圖（${srcs[2]}）`);
      for (const src of srcs) {
        const res = await page.request.get(new URL(src, BASE_URL).toString());
        assert(res.status() === 200 && (res.headers()['content-type'] || '').startsWith('image/'), `${path} 圖片可載入：${src}`);
      }
    }
  })
);

run('子分類卡片：顯示該子分類第一個產品的照片，沒有照片的顯示 No Image 圖', () =>
  withPage(async (page) => {
    await seedCategories();
    for (const [path, name, expected] of [
      ['/zh-TW/products/starter-motor', '乙', `/legacy-assets/${PRODUCT_PHOTO.replace(/^images\//, '')}`],
      ['/en/products/starter-motor', 'B', `/legacy-assets/${PRODUCT_PHOTO.replace(/^images\//, '')}`],
      ['/zh-TW/products/drum-fork', '丙', '/no-image.svg']
    ]) {
      const src = await coverSrc(page, path, name);
      assert(src.includes(expected), `${path} 子分類「${name}」封面（${src}）`);
      const res = await page.request.get(new URL(src, BASE_URL).toString());
      assert(res.status() === 200 && (res.headers()['content-type'] || '').startsWith('image/'), `${path} 子分類封面可載入`);
    }
  })
);
