// E2E：後台登入頁（S0 / S7）
// 啟動網站：npx next dev -p 3100（不需設定 Supabase）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

run('登入頁沒有免密碼的「測試登入」後門', () =>
  withPage(async (page) => {
    await page.goto(`${BASE_URL}/zh-TW/admin/login`);
    await page.locator('input[name="password"]').waitFor();
    assert(true, '登入表單正常顯示');
    assert((await page.getByText('測試登入').count()) === 0, '頁面上沒有「測試登入」按鈕');
    assert((await page.locator('form').count()) === 1, '頁面只有一個登入表單');
  })
);

run('登入後跳轉路徑只接受本站同語系路徑', () =>
  withPage(async (page) => {
    const cases = [
      ['/zh-TW/admin/dashboard?tab=products', '/zh-TW/admin/dashboard?tab=products'],
      ['https://evil.example/login', '/zh-TW/admin/dashboard'],
      ['//evil.example', '/zh-TW/admin/dashboard'],
      ['/zh-TW/\\evil.example', '/zh-TW/admin/dashboard'],
      ['/en/admin/dashboard', '/zh-TW/admin/dashboard']
    ];
    for (const [input, expected] of cases) {
      await page.goto(`${BASE_URL}/zh-TW/admin/login?next=${encodeURIComponent(input)}`);
      const value = await page.locator('input[name="next"]').inputValue();
      assert(value === expected, `next=${input} → ${value}`);
    }
  })
);
