// E2E：網站對外顯示的聯絡信箱為 sales@xh-motorparts.com，不再出現個人 Gmail（S9）
// 啟動網站：npx next dev -p 3100（唯讀，也可用 E2E_BASE_URL 對正式網站執行）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const COMPANY = 'sales@xh-motorparts.com';
const PAGES = ['', '/contact', '/legal/privacy', '/about', '/products'];

run('對外聯絡信箱統一為 sales@xh-motorparts.com', () =>
  withPage(async (page) => {
    for (const locale of ['zh-TW', 'zh-CN', 'en']) {
      for (const path of PAGES) {
        const url = `/${locale}${path}`;
        await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
        const html = await page.content();
        assert(!/@gmail\.com/i.test(html), `${url} 沒有個人 Gmail`);
        const text = await page.evaluate(() => document.body.innerText);
        assert(text.includes(COMPANY), `${url} 顯示 ${COMPANY}`);
        const mailtos = await page.$$eval('a[href^="mailto:"]', (as) => as.map((a) => a.getAttribute('href')));
        assert(mailtos.every((h) => h === `mailto:${COMPANY}`), `${url} 的信箱連結（${mailtos.length} 個）都指向公司信箱`);
      }
    }
  })
);
