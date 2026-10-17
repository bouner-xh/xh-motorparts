// E2E：門面補齊（2026-10-17 網站健診 工作包 C）
// 品牌 404 / favicon 與分享預覽 / 各頁標題描述 / Organization JSON-LD / 版面與觸控目標
// 使用模擬 Supabase（啟動方式同 product-seo.e2e.cjs；產品頁需要模擬資料）
const { BASE_URL, withPage, assert, run } = require('./helpers.cjs');
const { MOCK_URL } = require('./mock-supabase.cjs');

const DESKTOP = { viewport: { width: 1440, height: 900 } };
const TABLET = { viewport: { width: 820, height: 1180 } };
const MOBILE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const LOCALES = ['en', 'zh-TW', 'zh-CN'];
const meta = (page, selector) => page.locator(selector).first().getAttribute('content');
const CJK = /[一-鿿]/;

run('品牌 404：三語都回 404，且有導覽、搜尋框、回首頁與產品目錄按鈕、業務信箱', () =>
  withPage(async (page) => {
    const expectTitle = { en: 'Page not found', 'zh-TW': '找不到這個頁面', 'zh-CN': '找不到这个页面' };
    for (const locale of LOCALES) {
      for (const path of [`/${locale}/zzz`, `/${locale}/products/no-such-category`]) {
        const res = await page.goto(`${BASE_URL}${path}`);
        assert(res.status() === 404, `${path} 回應 404（${res.status()}）`);
        await page.waitForFunction((l) => document.documentElement.lang === l, locale, { timeout: 15000 });
        assert((await page.locator('html').getAttribute('lang')) === locale, `${path} 的 lang 是 ${locale}`);
        assert((await page.locator('nav.nav').count()) >= 1, `${path} 有站台導覽列`);
        assert((await page.locator('footer.site-footer').count()) === 1, `${path} 有站台頁尾`);
        assert((await page.locator('main h1').innerText()).includes(expectTitle[locale]), `${path} 標題是「${expectTitle[locale]}」`);
        assert((await page.locator(`main a.button-primary[href="/${locale}"]`).count()) === 1, `${path} 有「回首頁」主按鈕`);
        assert((await page.locator(`main a[href="/${locale}/products"]`).count()) >= 1, `${path} 有「瀏覽產品目錄」連結`);
        assert((await page.locator(`main form[role="search"][action="/${locale}/products/search"]`).count()) === 1, `${path} 有搜尋框`);
        assert((await page.locator('main a[href="mailto:sales@xh-motorparts.com"]').count()) === 1, `${path} 有業務信箱連結`);
      }
    }
    const zh = await page.goto(`${BASE_URL}/zh-TW/zzz`);
    assert(zh.status() === 404 && CJK.test(await page.locator('main').innerText()), '繁中 404 文案是中文');
  })
);

run('沒有語系的網址（/zzz）仍回 404，並提供連到 /en 的品牌頁', () =>
  withPage(async (page) => {
    for (const path of ['/zzz', '/fr/products']) {
      const res = await page.goto(`${BASE_URL}${path}`);
      assert(res.status() === 404, `${path} 回應 404（${res.status()}）`);
      assert((await page.locator('a[href="/en"]').count()) >= 1, `${path} 有連到 /en 的連結`);
      assert((await page.locator('body').innerText()).includes('Xie Huang'), `${path} 有品牌名稱`);
    }
    const root = await page.request.get(`${BASE_URL}/`, { maxRedirects: 0 });
    assert(root.status() >= 300 && root.status() < 400, '根網址仍轉址');
  })
);

run('favicon、apple-touch-icon、分享圖都能取得（回 200 且是圖片）', () =>
  withPage(async (page) => {
    const fav = await page.request.get(`${BASE_URL}/favicon.ico`);
    assert(fav.status() === 200 && (fav.headers()['content-type'] || '').startsWith('image/'), `/favicon.ico 回 200 圖片（${fav.status()} ${fav.headers()['content-type']}）`);
    await page.goto(`${BASE_URL}/en`);
    const icons = await page.$$eval('link[rel~="icon"], link[rel="apple-touch-icon"]', (links) => links.map((l) => l.getAttribute('href')));
    assert(icons.length >= 2, `head 有 icon 與 apple-touch-icon 連結（${icons.join(', ')}）`);
    for (const href of icons) {
      const res = await page.request.get(new URL(href, BASE_URL).toString());
      assert(res.status() === 200 && (res.headers()['content-type'] || '').startsWith('image/'), `${href} 回 200 圖片`);
    }
    const og = await meta(page, 'meta[property="og:image"]');
    const res = await page.request.get(new URL(new URL(og).pathname + new URL(og).search, BASE_URL).toString());
    assert(res.status() === 200 && (res.headers()['content-type'] || '').startsWith('image/'), `og:image 可取得（${og}）`);
  })
);

run('預設分享預覽：og:image 為絕對網址、og:type／siteName／locale、twitter:card', () =>
  withPage(async (page) => {
    for (const locale of LOCALES) {
      for (const path of ['', '/about', '/contact', '/legal/privacy', '/products']) {
        await page.goto(`${BASE_URL}/${locale}${path}`);
        const og = await meta(page, 'meta[property="og:image"]');
        assert(/^https?:\/\//.test(og || ''), `/${locale}${path} og:image 是絕對網址（${og}）`);
        assert(await meta(page, 'meta[property="og:site_name"]'), `/${locale}${path} 有 og:site_name`);
        assert((await meta(page, 'meta[property="og:type"]')) === 'website', `/${locale}${path} og:type 是 website`);
        assert(await meta(page, 'meta[property="og:locale"]'), `/${locale}${path} 有 og:locale`);
        assert((await meta(page, 'meta[name="twitter:card"]')) === 'summary_large_image', `/${locale}${path} twitter:card 是 summary_large_image`);
      }
    }
  })
);

run('分類頁與子分類頁的 og:image 用該分類的封面或第一個產品圖', () =>
  withPage(async (page) => {
    await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
    await fetch(`${MOCK_URL}/__mock/seed`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'product_images', rows: [{ id: '40000000-0000-4000-8000-0000000000d1', product_id: '30000000-0000-4000-8000-000000000001', storage_path: 'images/products/cylinder/cylinder-001.jpg', sort_order: 0 }] })
    });
    for (const path of ['/en/products/cylinder', '/en/products/cylinder/std']) {
      await page.goto(`${BASE_URL}${path}`);
      const og = await meta(page, 'meta[property="og:image"]');
      assert(/^https?:\/\/.+cylinder-001\.jpg/.test(og || ''), `${path} og:image 是分類／產品照片的絕對網址（${og}）`);
      assert((await meta(page, 'meta[name="twitter:card"]')) === 'summary_large_image', `${path} 有 twitter:card`);
    }
    // 沒有任何產品照片的分類：退回預設分享圖，不可沒有 og:image
    await page.goto(`${BASE_URL}/en/products/chain`);
    assert(/^https?:\/\//.test((await meta(page, 'meta[property="og:image"]')) || ''), '沒有照片的分類頁仍有 og:image');
  })
);

run('各頁自己的標題與描述：三語各自撰寫、彼此不重複、長度合理', () =>
  withPage(async (page) => {
    const pages = ['', '/about', '/contact', '/inquiry', '/legal/privacy'];
    const titles = new Set();
    const descs = new Set();
    for (const locale of LOCALES) {
      for (const path of pages) {
        await page.goto(`${BASE_URL}/${locale}${path}`);
        const title = await page.title();
        const desc = (await meta(page, 'meta[name="description"]')) || '';
        const label = `/${locale}${path}`;
        assert(!titles.has(title), `${label} 標題不與其他頁重複（${title}）`);
        assert(!descs.has(desc), `${label} 描述不與其他頁重複`);
        titles.add(title);
        descs.add(desc);
        if (locale === 'en') {
          assert(title.length <= 65 && !CJK.test(title), `${label} 英文標題 ≤65 字且無中文（${title.length}）`);
          assert(desc.length >= 110 && desc.length <= 160 && !CJK.test(desc), `${label} 英文描述約 120–155 字（${desc.length}）`);
        } else {
          assert(CJK.test(title) && title.length <= 40, `${label} 中文標題是中文（${title}）`);
          assert(CJK.test(desc) && desc.length >= 30 && desc.length <= 90, `${label} 中文描述是中文且約 70 字內（${desc.length}）`);
        }
        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
        assert(canonical === `https://www.xh-motorparts.com/${locale}${path}`, `${label} canonical 保留（${canonical}）`);
        const alts = await page.locator('link[rel="alternate"][hreflang]').count();
        assert(alts === 4, `${label} hreflang 保留（${alts}）`);
        const robots = await page.$$eval('meta[name="robots"]', (els) => els.map((e) => e.content).join(','));
        assert(!/noindex/.test(robots), `${label} 維持可被收錄`);
      }
    }
    await page.goto(`${BASE_URL}/en`);
    assert((await page.title()).includes('Motorcycle Parts Manufacturer in Taiwan'), '英文首頁標題含關鍵字');
  })
);

run('首頁 Organization JSON-LD：只含已確認事實、無認證字樣、< 已轉義', () =>
  withPage(async (page) => {
    for (const locale of LOCALES) {
      await page.goto(`${BASE_URL}/${locale}`);
      const raws = await page.$$eval('script[type="application/ld+json"]', (nodes) => nodes.map((n) => n.textContent));
      const orgRaw = raws.find((r) => r.includes('"Organization"'));
      assert(Boolean(orgRaw), `/${locale} 有 Organization JSON-LD`);
      assert(!orgRaw.includes('<'), `/${locale} JSON-LD 內沒有未轉義的 <`);
      const org = JSON.parse(orgRaw);
      assert(org['@type'] === 'Organization' && org.name === 'Xie Huang Enterprise Co., Ltd.', `/${locale} name 為英文公司名`);
      assert(org.alternateName === '協皇企業有限公司', `/${locale} alternateName 為中文名`);
      assert(String(org.foundingDate) === '1990', `/${locale} foundingDate 1990`);
      assert(org.email === 'sales@xh-motorparts.com' && /\+886\s?930\s?797\s?299/.test(org.telephone), `/${locale} email 與電話正確`);
      assert(/黎明路一段533-2[號号]/.test(JSON.stringify(org.address)) || JSON.stringify(org.address).includes('Liming'), `/${locale} 有地址`);
      assert(org.areaServed === 'Worldwide', `/${locale} areaServed Worldwide`);
      assert(/^https:\/\/www\.xh-motorparts\.com/.test(org.url) && /^https?:\/\/.+(icon|logo)/.test(org.logo), `/${locale} url 與 logo 為絕對網址`);
      assert(!/ISO|certif|認證|认证|IATF/i.test(orgRaw), `/${locale} JSON-LD 沒有認證字樣`);
      assert(!/employee|員工|员工/i.test(orgRaw), `/${locale} JSON-LD 沒有員工規模`);
    }
  })
);

async function checkStatsCards(page, label) {
  const cards = await page.$$eval('.stats-card', (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      const v = el.querySelector('.stats-card__value');
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, clipped: v.scrollWidth > v.clientWidth + 1, vOverflow: v.getBoundingClientRect().right > r.right + 0.5, lines: v.getBoundingClientRect().height / parseFloat(getComputedStyle(v).lineHeight) };
    })
  );
  assert(cards.length === 3, `${label} 有 3 張統計卡`);
  for (let i = 0; i < cards.length; i++) {
    assert(!cards[i].clipped && !cards[i].vOverflow, `${label} 第 ${i + 1} 張統計卡文字沒有被截斷或溢出`);
    assert(cards[i].lines < 1.5, `${label} 第 ${i + 1} 張統計卡數值不折行（${cards[i].lines.toFixed(1)} 行）`);
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i], b = cards[j];
      const overlap = a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
      assert(!overlap, `${label} 統計卡 ${i + 1} 與 ${j + 1} 沒有重疊`);
    }
  }
}

run('關於我們：桌機統計卡不疊字不截斷、H1 不過大；平板與手機 Worldwide 不重複', async () => {
  await withPage(async (page) => {
    for (const locale of LOCALES) {
      await page.goto(`${BASE_URL}/${locale}/about`);
      await checkStatsCards(page, `桌機 /${locale}/about`);
      const fs = await page.$eval('main h1', (h) => parseFloat(getComputedStyle(h).fontSize));
      assert(fs <= 45, `桌機 /${locale}/about H1 字級 ≤ 45px（${fs}）`);
      const self = await page.$eval('.hero__stats', (el) => getComputedStyle(el).alignSelf);
      assert(self === 'start' || self === 'flex-start', `統計區塊 align-self:start（${self}）`);
    }
  }, DESKTOP);
  for (const [ctx, name] of [[TABLET, '平板'], [MOBILE, '手機']]) {
    await withPage(async (page) => {
      await page.goto(`${BASE_URL}/en/about`);
      await checkStatsCards(page, `${name} /en/about`);
      const n = await page.locator('main :text-is("Worldwide")').count();
      assert(n === 1, `${name} /en/about 的 Worldwide 只出現一次（${n}）`);
    }, ctx);
  }
});

async function lastLineLength(page, selector) {
  return page.$eval(selector, (el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const lines = new Map();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (let i = 0; i < node.length; i++) {
        if (/\s/.test(node.data[i])) continue;
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const rect = range.getBoundingClientRect();
        if (!rect.width) continue;
        const key = Math.round(rect.top / 4);
        lines.set(key, (lines.get(key) || 0) + 1);
      }
    }
    const keys = [...lines.keys()].sort((a, b) => a - b);
    return lines.get(keys[keys.length - 1]);
  });
}

run('繁中／簡中首頁：標題平衡斷行、不單字落單、手機宣言沒有硬換行', async () => {
  for (const [ctx, name] of [[DESKTOP, '桌機'], [TABLET, '平板'], [MOBILE, '手機']]) {
    await withPage(async (page) => {
      for (const locale of ['zh-TW', 'zh-CN']) {
        await page.goto(`${BASE_URL}/${locale}`);
        const style = await page.$eval('.hero__title', (el) => ({ wrap: getComputedStyle(el).textWrap, lb: getComputedStyle(el).lineBreak, ws: getComputedStyle(el).whiteSpace }));
        assert(/balance/.test(style.wrap) && style.lb === 'strict', `${name} /${locale} 標題 text-wrap:balance、line-break:strict（${style.wrap}/${style.lb}）`);
        if (name === '手機') assert(style.ws === 'normal', `手機 /${locale} 宣言不保留硬換行（${style.ws}）`);
        else assert(style.ws === 'pre-line', `${name} /${locale} 宣言保留換行（${style.ws}）`);
        for (const sel of ['.hero__title', '.hero__description']) {
          const n = await lastLineLength(page, sel);
          assert(n >= 2, `${name} /${locale} ${sel} 最後一行不只一個字（${n}）`);
        }
      }
    }, ctx);
  }
});

run('手機搜尋框提示文字完整顯示（三語）', () =>
  withPage(async (page) => {
    for (const locale of LOCALES) {
      await page.goto(`${BASE_URL}/${locale}/products`);
      const r = await page.$eval('.category-sidebar .product-search input', (input) => {
        const cs = getComputedStyle(input);
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const textWidth = ctx.measureText(input.placeholder).width;
        const inner = input.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        return { placeholder: input.placeholder, textWidth, inner };
      });
      assert(r.textWidth <= r.inner, `手機 /${locale} 搜尋提示「${r.placeholder}」完整顯示（${Math.round(r.textWidth)} ≤ ${Math.round(r.inner)}）`);
    }
  }, MOBILE)
);

run('聯絡頁：信箱 mailto、電話 tel、卡片內文不重複標題、Email 可換行', () =>
  withPage(async (page) => {
    for (const locale of LOCALES) {
      await page.goto(`${BASE_URL}/${locale}/contact`);
      assert((await page.locator('main a[href="mailto:sales@xh-motorparts.com"]').count()) >= 1, `/${locale}/contact 信箱是 mailto 連結`);
      assert((await page.locator('main a[href="tel:+886930797299"]').count()) >= 1, `/${locale}/contact 電話是 tel 連結`);
      const cards = await page.$$eval('.info-card', (els) => els.map((el) => ({ h: el.querySelector('h3')?.textContent || '', p: el.querySelector('p')?.textContent || '' })));
      for (const c of cards) {
        assert(!/^(Address|Phone|Email|地址|電話|电话)\s*[:：]/.test(c.p), `/${locale}/contact「${c.h}」卡內文沒有重複標題前綴（${c.p}）`);
      }
      const whatsapps = await page.locator('.info-card h3', { hasText: 'WhatsApp' }).count();
      assert(whatsapps <= 1, `/${locale}/contact 電話與 WhatsApp 合併成一張卡`);
      const standalone = await page.locator('.info-card h3', { hasText: /^WhatsApp$/ }).count();
      assert(standalone === 0, `/${locale}/contact 沒有單獨的 WhatsApp 卡`);
      const wrap = await page.$eval('main a[href^="mailto:"]', (a) => getComputedStyle(a).overflowWrap);
      assert(wrap === 'anywhere', `/${locale}/contact Email overflow-wrap:anywhere（${wrap}）`);
      const lh = await page.$eval('.info-card p', (p) => parseFloat(getComputedStyle(p).lineHeight) / parseFloat(getComputedStyle(p).fontSize));
      assert(Math.abs(lh - 1.6) < 0.05, `/${locale}/contact 卡片內文行高 1.6（${lh}）`);
    }
  })
);

run('手機觸控目標：列表「View details」、產品頁返回連結、空詢價清單按鈕 ≥ 44px', () =>
  withPage(async (page) => {
    await fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' });
    await page.goto(`${BASE_URL}/en/products/cylinder/std`);
    const detail = await page.locator('.product-card .text-link').first().boundingBox();
    assert(detail.height >= 44, `View details 高度 ≥ 44（${detail.height}）`);

    await page.goto(`${BASE_URL}/en/products/cylinder/std/1HV-11311-00`);
    const back = page.locator('.detail-info a.text-link', { hasText: 'Back to' });
    const box = await back.boundingBox();
    assert(box.height >= 44, `返回連結高度 ≥ 44（${box.height}）`);
    const prevGap = await back.evaluate((a) => {
      const prev = a.closest('p').previousElementSibling.getBoundingClientRect();
      return a.getBoundingClientRect().top - prev.bottom;
    });
    assert(prevGap >= 16, `返回連結上方間距 ≥ 16px（${prevGap}）`);

    await page.goto(`${BASE_URL}/en/inquiry`);
    const cta = page.locator('main a[href="/en/products"]').first();
    const cbox = await cta.boundingBox();
    assert(cbox.height >= 44, `空詢價清單的 Browse Products 高度 ≥ 44（${cbox.height}）`);
    const bg = await cta.evaluate((a) => getComputedStyle(a).backgroundColor);
    assert(bg === 'rgb(220, 38, 38)', `Browse Products 是紅色主按鈕（${bg}）`);
    assert((await page.locator('main a[href="mailto:sales@xh-motorparts.com"]').count()) === 1, '空詢價清單有「或寄信至 sales@」連結');
  }, MOBILE)
);

run('產品頁：平板圖片限高、圖左資訊右雙欄；繁中返回文案沒有多餘空格', async () => {
  await withPage(async (page) => {
    await page.goto(`${BASE_URL}/en/products/cylinder/std/1HV-11311-00`);
    const r = await page.evaluate(() => {
      const media = document.querySelector('.detail-media').getBoundingClientRect();
      const info = document.querySelector('.detail-info').getBoundingClientRect();
      const img = document.querySelector('.detail-media img').getBoundingClientRect();
      return { sideBySide: info.left >= media.right - 1, imgH: img.height };
    });
    assert(r.sideBySide, '平板 820px：圖左資訊右（雙欄）');
    assert(r.imgH <= 520, `平板主圖高度 ≤ 520px（${r.imgH}）`);
  }, TABLET);
  await withPage(async (page) => {
    await page.goto(`${BASE_URL}/zh-TW/products/cylinder/std/1HV-11311-00`);
    const text = (await page.locator('.detail-info a.text-link').last().innerText()).trim();
    assert(/^← 返回\S+$/.test(text), `繁中返回連結沒有多餘空格（${text}）`);
  }, DESKTOP);
});

run('頁尾：分隔符只在項目之間（沒有孤立豎線）、平板 2 欄、簡介 14px', async () => {
  await withPage(async (page) => {
    for (const locale of LOCALES) {
      await page.goto(`${BASE_URL}/${locale}`);
      const text = await page.$eval('.footer-bottom', (el) => el.innerText);
      assert(!text.includes('|'), `手機 /${locale} 頁尾文字沒有孤立的 | 字元`);
      const seps = await page.$$eval('.footer-legal > li', (els) => els.slice(1).map((el) => getComputedStyle(el, '::before').content));
      assert(seps.length >= 1 && seps.every((c) => c && c !== 'none' && c !== 'normal'), `手機 /${locale} 項目間的分隔符由 ::before 提供（${seps.join(',')}）`);
      const first = await page.$eval('.footer-legal > li:first-child', (el) => getComputedStyle(el, '::before').content);
      assert(first === 'none' || first === 'normal', `手機 /${locale} 第一個項目前面沒有分隔符`);
    }
  }, MOBILE);
  await withPage(async (page) => {
    await page.goto(`${BASE_URL}/en`);
    const cols = await page.$eval('.footer-grid', (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert(cols === 2, `平板頁尾 2 欄（${cols}）`);
    const fs = await page.$eval('.footer-col__desc', (el) => parseFloat(getComputedStyle(el).fontSize));
    assert(fs === 14, `頁尾簡介 14px（${fs}）`);
  }, TABLET);
});

run('隱私政策：手機服務商表格第三欄連結看得到；桌機標題與卡片左緣對齊', async () => {
  await withPage(async (page) => {
    await page.goto(`${BASE_URL}/en/legal/privacy`);
    const links = await page.$$eval('.privacy-table a', (as) => as.map((a) => { const r = a.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
    assert(links.length > 0, '有服務商連結');
    assert(links.every((l) => l.left >= 0 && l.right <= 390), `手機 所有服務商連結都在螢幕內（${links.map((l) => Math.round(l.right)).join(',')}）`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert(!overflow, '手機隱私頁沒有橫向捲動');
  }, MOBILE);
  await withPage(async (page) => {
    await page.goto(`${BASE_URL}/en/legal/privacy`);
    const r = await page.evaluate(() => {
      const h = document.querySelector('main h1').getBoundingClientRect();
      const c = document.querySelector('.privacy-doc-card').getBoundingClientRect();
      return { hLeft: h.left, cLeft: c.left };
    });
    assert(Math.abs(r.hLeft - r.cLeft) <= 1, `桌機標題與卡片左緣對齊（${r.hLeft} vs ${r.cLeft}）`);
  }, DESKTOP);
});

run('列表卡片規格文字最多 2 行；首頁引言區內文合成一段、行高 1.7', async () => {
  await withPage(async (page) => {
    await page.goto(`${BASE_URL}/en/products/cylinder/std`);
    const clamp = await page.$eval('.product-card__specs', (el) => getComputedStyle(el).webkitLineClamp);
    assert(clamp === '2', `規格文字 line-clamp 2（${clamp}）`);
  }, DESKTOP);
  await withPage(async (page) => {
    await page.goto(`${BASE_URL}/en`);
    const p = await page.$eval('.brand-belief p', (el) => {
      const cs = getComputedStyle(el);
      return { lh: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize), n: document.querySelectorAll('.brand-belief p').length };
    });
    assert(Math.abs(p.lh - 1.7) < 0.05, `引言內文行高 1.7（${p.lh}）`);
    assert(p.n === 1, `引言內文合成一段、沒有手動換行造成的參差（${p.n}）`);
  }, DESKTOP);
});
