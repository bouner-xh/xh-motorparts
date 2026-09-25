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
