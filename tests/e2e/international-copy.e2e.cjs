// E2E：國際客戶看得到的資訊（關於、聯絡、隱私政策、頁尾）
// 英文為主，繁中、簡中內容一致；資料保存期限三種語言都不寫固定年數
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');

const text = async (page, path) => {
  await page.goto(`${BASE_URL}${path}`);
  await page.locator('h1').first().waitFor();
  return page.locator('body').innerText();
};

run('英文聯絡頁：國際電話、WhatsApp、時區、回覆時效與訂購資訊', () =>
  withPage(async (page) => {
    const body = await text(page, '/en/contact');
    assert(body.includes('+886 930 797 299'), '國際格式電話');
    assert(!/Phone: 0930/.test(body), '沒有國內格式電話');
    assert(body.includes('GMT+8') && body.includes('Taiwan time'), '營業時間標示台灣時區');
    assert(body.includes('within 24 hours'), '回覆時效');
    for (const word of ['Ordering Information', 'Minimum order quantity', 'Lead time', 'T/T, L/C and PayPal', 'FOB, EXW or CIF', 'Taichung Port', 'Packaging', 'Inspection', 'Warranty and returns']) {
      assert(body.includes(word), `訂購資訊含「${word}」`);
    }
    const wa = await page.locator('a[href="https://wa.me/886930797299"]').count();
    assert(wa >= 2, `聯絡頁與頁尾都有 WhatsApp 連結（${wa}）`);
    assert(!/[一-鿿]/.test(body.replace(/繁中|简中/g, '')), '英文頁沒有中文');
  })
);

run('英文關於頁：沒有開發中的說法，內容為公司實際資訊', () =>
  withPage(async (page) => {
    const body = await text(page, '/en/about');
    assert(body.includes('since 1990') && body.includes('OEM / ODM'), '成立年份與 OEM／ODM');
    assert(body.includes('Worldwide'), '市場為全球');
    for (const bad of ['being rebuilt', 'CRM', 'legacy catalog', 'Previewable products', 'Southeast Asia']) {
      assert(!body.includes(bad), `沒有「${bad}」`);
    }
  })
);

run('隱私政策：資料保存期限三種語言一致，不寫固定年數', () =>
  withPage(async (page) => {
    const en = await text(page, '/en/legal/privacy');
    assert(/as long as needed to handle your inquiry/.test(en) && !/3 years/.test(en), '英文');
    const tw = await text(page, '/zh-TW/legal/privacy');
    assert(tw.includes('所需期間內保存') && !tw.includes('3 年'), '繁中');
    const cn = await text(page, '/zh-CN/legal/privacy');
    assert(cn.includes('所需期间内保存') && !cn.includes('3 年'), '簡中');
    assert(en.includes('October 2026') && tw.includes('2026 年 10 月') && cn.includes('2026 年 10 月'), '更新日期一致');
  })
);

run('繁中、簡中聯絡頁與關於頁同步', () =>
  withPage(async (page) => {
    for (const [loc, hours, ordering, about] of [
      ['zh-TW', '台灣時間，GMT+8', '訂購資訊', '1990 年起專注摩托車內部零組件'],
      ['zh-CN', '台湾时间，GMT+8', '订购信息', '1990 年起专注摩托车内部零部件']
    ]) {
      const contact = await text(page, `/${loc}/contact`);
      assert(contact.includes('+886 930 797 299') && contact.includes(hours) && contact.includes(ordering) && contact.includes('台中港'), `${loc} 聯絡頁（電話、時區、訂購資訊、出貨港）`);
      const ab = await text(page, `/${loc}/about`);
      assert(ab.includes(about), `${loc} 關於頁`);
    }
  })
);
