// E2E：正式環境 CSP 不得擋下 GA4 / Clarity（S3）
// 需以正式環境模式啟動並提供測試用 ID：
//   NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-TEST123 NEXT_PUBLIC_CLARITY_PROJECT_ID=testclarity npx next build
//   NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-TEST123 NEXT_PUBLIC_CLARITY_PROJECT_ID=testclarity npx next start -p 3100
//
// 測試環境不一定能連外，因此攔截分析服務的網址，改回傳「替身腳本」。
// 替身腳本模擬官方腳本的行為：向 GA4 / Clarity 的官方收集端點送出資料、載入 Clarity 主程式。
// CSP 檢查發生在請求送出之前，由瀏覽器真實執行，攔截不影響檢查結果。
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const ANALYTICS_HOST = /google-analytics\.com|analytics\.google\.com|googletagmanager\.com|clarity\.ms|bing\.com/;

const gtagStub = `
  fetch('https://region1.google-analytics.com/g/collect?v=2&tid=G-TEST123', {method: 'POST', mode: 'no-cors'}).catch(() => {});
  new Image().src = 'https://www.google-analytics.com/g/collect?v=2&tid=G-TEST123';
  fetch('https://region1.analytics.google.com/g/collect?v=2', {method: 'POST', mode: 'no-cors'}).catch(() => {});
`;
const clarityTagStub = `
  var s = document.createElement('script');
  s.src = 'https://scripts.clarity.ms/0.8.0/clarity.js';
  document.head.appendChild(s);
`;
const clarityMainStub = `
  fetch('https://k.clarity.ms/collect', {method: 'POST', mode: 'no-cors'}).catch(() => {});
  new Image().src = 'https://c.bing.com/c.gif';
  new Image().src = 'https://c.clarity.ms/c.gif';
`;

run('GA4 與 Clarity 未被 CSP 阻擋', () =>
  withPage(async (page, context) => {
    const reached = [];
    await context.route(ANALYTICS_HOST, (route) => {
      const url = route.request().url();
      reached.push(url);
      if (url.includes('googletagmanager.com/gtag/js')) {
        return route.fulfill({ contentType: 'application/javascript', body: gtagStub });
      }
      if (url.includes('www.clarity.ms/tag/')) {
        return route.fulfill({ contentType: 'application/javascript', body: clarityTagStub });
      }
      if (url.includes('scripts.clarity.ms')) {
        return route.fulfill({ contentType: 'application/javascript', body: clarityMainStub });
      }
      return route.fulfill({ status: 204, body: '' });
    });

    const violations = [];
    await page.exposeFunction('reportCspViolation', (v) => violations.push(v));
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        window.reportCspViolation(`${e.violatedDirective} ${e.blockedURI}`);
      });
    });

    const response = await page.goto(`${BASE_URL}/en`);
    const csp = response.headers()['content-security-policy'] || '';
    assert(csp.includes('connect-src'), 'CSP 標頭存在');

    // 同意 Cookie
    const accept = page.getByRole('button', { name: /accept/i });
    if (await accept.count()) await accept.first().click();
    await page.waitForTimeout(3000);

    const blocked = violations.filter((v) => ANALYTICS_HOST.test(v));
    console.log('  被擋下的請求：', blocked.length ? blocked : '無');
    assert(reached.some((u) => u.includes('/g/collect')), 'GA4 資料有送到收集端點');
    assert(reached.some((u) => u.includes('scripts.clarity.ms')), 'Clarity 主程式有載入');
    assert(blocked.length === 0, '沒有任何分析服務的請求被 CSP 擋下');
  })
);
