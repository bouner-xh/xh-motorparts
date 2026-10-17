// JSON-LD 輸出轉義（SX-12）
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeJsonLd } from '../../src/lib/json-ld.ts';

test('名稱含結束 script 標籤時，輸出裡不會出現 <', () => {
  const out = serializeJsonLd({ name: 'A</script><script>alert(1)</script>' });
  assert.ok(!out.includes('<'));
  assert.ok(!out.toLowerCase().includes('</script'));
});

test('轉義後解析結果與原資料相同', () => {
  const data = { '@type': 'Product', name: 'X</script> & <b>粗體</b>', list: ['a<b', 'c'] };
  assert.deepEqual(JSON.parse(serializeJsonLd(data)), data);
});

test('沒有特殊字元時與 JSON.stringify 完全相同', () => {
  const data = { a: 1, b: ['x', 'y'], c: { d: '中文' } };
  assert.equal(serializeJsonLd(data), JSON.stringify(data));
});
