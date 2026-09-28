// A6 ①：詢價篩選與 CSV 匯出
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInquiryCsv, csvCell, exportFileName, filterInquiries, formatTaipeiTime, parseCsvForTest } from './inquiry-export-helpers.mts';

const rows = [
  {
    status: 'pending' as const,
    company_name: 'Moto Italia',
    customer_name: 'Marco',
    customer_email: 'marco@moto.example',
    country: 'Italy',
    phone: '',
    message: 'FOB, please',
    reply_notes: '',
    items: [
      { modelNumber: 'CYL-125', nameZhTw: '汽缸 125', quantity: 200 },
      { modelNumber: 'CHN-428', nameEn: 'Chain 428', quantity: 300 },
    ],
    created_at: '2026-09-27T16:30:00Z',
    updated_at: '2026-09-27T16:30:00Z',
  },
  {
    status: 'replied' as const,
    company_name: '=HYPERLINK("http://evil.example","點我")',
    customer_name: 'Eve',
    customer_email: 'eve@x.example',
    country: 'Japan',
    items: [],
    created_at: '2026-09-20T01:00:00Z',
  },
];

test('每個品項一列、沒有品項也保留一列，時間為台灣時間', () => {
  const table = parseCsvForTest(buildInquiryCsv(rows));
  assert.equal(table[0][0], '詢價日期');
  assert.equal(table.length, 1 + 2 + 1);
  assert.deepEqual(table[1].slice(0, 3), ['2026-09-28 00:30', '新詢價', 'Moto Italia']);
  assert.deepEqual(table[1].slice(7, 10), ['CYL-125', '汽缸 125', '200']);
  assert.deepEqual(table[2].slice(7, 10), ['CHN-428', 'Chain 428', '300']);
  assert.equal(table[3][1], '已回覆');
  assert.equal(table[3][7], '');
});

test('檔案開頭有 BOM，逗號與引號正確跳脫', () => {
  const csv = buildInquiryCsv(rows);
  assert.ok(csv.startsWith('﻿'));
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('第一行\n第二行'), '"第一行\n第二行"');
});

test('防止 CSV 公式注入：= + - @ 開頭的內容前面加上單引號', () => {
  for (const v of ['=1+1', '+SUM(A1)', '-2+3', '@cmd']) assert.ok(csvCell(v).replace(/^"/, '').startsWith(`'`), v);
  const table = parseCsvForTest(buildInquiryCsv(rows));
  assert.ok(table[3][2].startsWith(`'=HYPERLINK`));
  assert.equal(csvCell('CYL-125'), 'CYL-125');
});

test('篩選：狀態與關鍵字（含型號）', () => {
  assert.equal(filterInquiries(rows, 'pending', '').length, 1);
  assert.equal(filterInquiries(rows, null, 'chn-428').length, 1);
  assert.equal(filterInquiries(rows, 'replied', 'chn-428').length, 0);
});

test('台灣時間與檔名', () => {
  assert.equal(formatTaipeiTime('2026-09-27T16:00:00Z'), '2026-09-28 00:00');
  assert.equal(formatTaipeiTime('bad'), '');
  assert.equal(exportFileName('inquiries', new Date('2026-09-27T17:00:00Z')), 'inquiries-2026-09-28.csv');
});
