// 產品頁標題與描述（SEO）
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProductDescription, buildProductTitle } from '../../src/lib/product-seo.ts';

const dt125 = { model: '2A6-17421-00', name: 'DT125 COUNTER SHAFT', categoryName: 'Transmission', subCategoryName: 'Counter shaft', specifications: ['STD'] };

test('標題：品名在前、加上型號、分類與公司名', () => {
  assert.equal(buildProductTitle(dt125, 'en'), 'DT125 COUNTER SHAFT 2A6-17421-00 | Transmission | Xie Huang Motorcycle Parts');
  assert.equal(buildProductTitle({ ...dt125, categoryName: '傳動系統' }, 'zh-TW'), 'DT125 COUNTER SHAFT 2A6-17421-00 | 傳動系統 | 協皇企業');
});

test('名稱與型號相同時只出現一次', () => {
  assert.equal(buildProductTitle({ ...dt125, name: '2A6-17421-00' }, 'en'), '2A6-17421-00 | Transmission | Xie Huang Motorcycle Parts');
});

test('英文描述是完整句子，沒有中文標點', () => {
  const d = buildProductDescription(dt125, 'en');
  assert.equal(d, 'DT125 COUNTER SHAFT (part no. 2A6-17421-00) – Transmission / Counter shaft. Specifications: STD. Motorcycle parts manufacturer in Taiwan since 1990. Request a quote online.');
  assert.ok(!/[，。：／]/.test(d));
});

test('中文描述：繁中、簡中各自的用字；沒有規格時省略', () => {
  const tw = buildProductDescription({ ...dt125, name: 'DT125 副軸', categoryName: '傳動系統', subCategoryName: '副軸', specifications: [] }, 'zh-TW');
  assert.equal(tw, 'DT125 副軸（型號 2A6-17421-00），傳動系統／副軸。台灣摩托車零件製造商協皇企業，可線上送出詢價。');
  const cn = buildProductDescription({ ...dt125, name: 'DT125 副轴', categoryName: '传动系统', subCategoryName: '副轴' }, 'zh-CN');
  assert.ok(cn.includes('型号 2A6-17421-00') && cn.includes('规格：STD') && cn.includes('台湾摩托车零件制造商'));
});
