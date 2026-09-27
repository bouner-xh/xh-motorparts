// E2E 共用設定
// 執行前請先啟動網站：npx next dev -p 3100
// 執行方式：NODE_PATH=$(npm root -g) node tests/e2e/<檔名>.e2e.cjs
// （使用全域安裝的 playwright，未加入專案依賴）
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3100';

const sampleCart = [
  {
    id: 'e2e-cylinder-1',
    modelNumber: '1HV-11311-00',
    nameZhTw: '汽缸',
    nameZhCn: '汽缸',
    nameEn: 'Cylinder',
    quantity: 3
  }
];

// contextOptions：可指定視窗大小等，例如 { viewport: { width: 390, height: 844 } }
async function withPage(fn, contextOptions = {}) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    await fn(page, context);
  } finally {
    await browser.close();
  }
}

async function seedCart(page, cart = sampleCart) {
  await page.goto(`${BASE_URL}/en`);
  await page.evaluate((items) => localStorage.setItem('xh_rfq_cart', JSON.stringify(items)), cart);
}

async function fillInquiryForm(page, overrides = {}) {
  const values = {
    name: 'E2E Buyer',
    email: 'buyer@example.com',
    companyName: 'E2E Moto Trading',
    country: 'Vietnam',
    phone: '+84 123',
    message: 'Please quote.',
    ...overrides
  };
  for (const [field, value] of Object.entries(values)) {
    await page.fill(`[name="${field}"]`, value);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`斷言失敗：${message}`);
  console.log(`  ✓ ${message}`);
}

// 測試依序執行，避免同時開多個瀏覽器互相干擾
let queue = Promise.resolve();
function run(name, fn) {
  queue = queue.then(async () => {
    console.log(`▶ ${name}`);
    try {
      await fn();
      console.log(`✅ ${name} 通過`);
    } catch (error) {
      console.error(`❌ ${name} 失敗`);
      console.error(error);
      process.exitCode = 1;
    }
  });
  return queue;
}

// 後台：切換到指定分頁（A8 起後台改為分頁，登入後預設在「總覽」）
async function openAdminTab(page, label) {
  const tab = page.getByRole('tab', { name: new RegExp(`^${label}`) });
  await tab.click();
  const panelId = await tab.getAttribute('aria-controls');
  await page.locator(`#${panelId}`).waitFor({ state: 'visible' });
}

module.exports = { BASE_URL, sampleCart, withPage, seedCart, fillInquiryForm, assert, run, openAdminTab };
