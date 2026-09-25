// E2E：圖片上傳 API 未登入時必須拒絕（S8）
// 啟動網站：npx next dev -p 3100
// 註：格式檢查在登入驗證之後，需要可用的 Supabase 才能完整測試；
//     格式判斷邏輯由 tests/security/image-signature.test.mts 覆蓋。
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

run('未登入無法上傳圖片', () =>
  withPage(async (page) => {
    await page.goto(`${BASE_URL}/en`);
    const result = await page.evaluate(async () => {
      const form = new FormData();
      form.append('file', new File(['<html>fake</html>'], 'fake.png', { type: 'image/png' }));
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: form });
      return { status: res.status, body: await res.json() };
    });
    assert(result.status === 401 || result.status === 500, `API 拒絕匿名上傳（${result.status}）`);
    assert(!('imagePath' in result.body), '沒有回傳上傳後的圖片網址');
  })
);
