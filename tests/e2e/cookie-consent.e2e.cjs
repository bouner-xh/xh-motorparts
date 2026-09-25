// E2E：Cookie 同意後才載入 Clarity，回訪時沿用同意狀態（S6）
// 需提供測試用分析 ID 啟動網站：
//   NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-TEST123 NEXT_PUBLIC_CLARITY_PROJECT_ID=testclarity npx next dev -p 3100
const { chromium } = require('playwright');
const { BASE_URL, assert, run } = require('./helpers.cjs');

// 攔截分析服務（測試環境不一定能連外），記錄 Clarity 是否被載入
async function newTrackedContext(browser) {
  const context = await browser.newContext();
  const clarityRequests = [];
  await context.route(/googletagmanager\.com|google-analytics\.com/, (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' })
  );
  await context.route(/clarity\.ms/, (route) => {
    clarityRequests.push(route.request().url());
    return route.fulfill({ contentType: 'application/javascript', body: '' });
  });
  return { context, clarityRequests };
}

async function consentDefault(page) {
  return page.evaluate(() => {
    const entry = (window.dataLayer || []).map((a) => Array.from(a)).find((a) => a[0] === 'consent' && a[1] === 'default');
    return entry ? entry[2].analytics_storage : null;
  });
}

async function hasConsentUpdateGranted(page) {
  return page.evaluate(() =>
    (window.dataLayer || [])
      .map((a) => Array.from(a))
      .some((a) => a[0] === 'consent' && a[1] === 'update' && a[2].analytics_storage === 'granted')
  );
}

async function openHome(page) {
  await page.goto(`${BASE_URL}/en`);
  await page.waitForFunction(() => Array.isArray(window.dataLayer) && window.dataLayer.length > 0);
  await page.waitForTimeout(1500);
}

run('同意 Cookie：同意前不載入 Clarity，回訪時沿用同意', async () => {
  const browser = await chromium.launch();
  try {
    const { context, clarityRequests } = await newTrackedContext(browser);
    const page = await context.newPage();

    await openHome(page);
    assert((await consentDefault(page)) === 'denied', '首次造訪 GA 預設為拒絕');
    assert(clarityRequests.length === 0, '同意前沒有載入 Clarity');

    await page.locator('#rcc-confirm-button').click();
    await page.waitForTimeout(1500);
    assert(await hasConsentUpdateGranted(page), '按下同意後 GA 更新為允許');
    assert(clarityRequests.length > 0, '按下同意後載入 Clarity');

    clarityRequests.length = 0;
    await openHome(page);
    assert((await consentDefault(page)) === 'granted', '回訪時 GA 預設沿用「允許」');
    assert(clarityRequests.length > 0, '回訪時自動載入 Clarity');
    assert((await page.locator('#rcc-confirm-button').count()) === 0, '回訪時不再顯示 Cookie 橫幅');
  } finally {
    await browser.close();
  }
});

run('拒絕 Cookie：不載入 Clarity，回訪仍維持拒絕', async () => {
  const browser = await chromium.launch();
  try {
    const { context, clarityRequests } = await newTrackedContext(browser);
    const page = await context.newPage();

    await openHome(page);
    await page.locator('#rcc-decline-button').click();
    await page.waitForTimeout(1500);
    assert(clarityRequests.length === 0, '拒絕後沒有載入 Clarity');

    await openHome(page);
    assert((await consentDefault(page)) === 'denied', '回訪時 GA 維持拒絕');
    assert(clarityRequests.length === 0, '回訪時仍不載入 Clarity');
  } finally {
    await browser.close();
  }
});
