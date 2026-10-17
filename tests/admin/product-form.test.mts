// 產品上架檢查 P4、P6：規格拆分與錯誤訊息
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeModelNumber,
  normalizeOemNumbers,
  splitOemNumbers,
  escapeLikePattern,
  describeProductInputIssues,
  duplicateModelMessage,
  splitSpecifications,
  validateProductForm
} from '../../src/lib/product-form.ts';

test('規格可用半形逗號、全形逗號、頓號、分號分隔', () => {
  assert.deepEqual(splitSpecifications('STD，47MM、50MM, 52MM；55MM'), ['STD', '47MM', '50MM', '52MM', '55MM']);
  assert.deepEqual(splitSpecifications(' , ，'), []);
});

test('錯誤訊息指出欄位', () => {
  assert.equal(
    describeProductInputIssues([{ path: ['modelNumber'], code: 'too_big', maximum: 100 }]),
    '請修正：型號太長（最多 100 字）'
  );
  assert.equal(describeProductInputIssues([{ path: ['stockQuantity'], code: 'invalid_type' }]), '請修正：庫存必須是 0 到 1,000,000 的整數');
  assert.equal(describeProductInputIssues([{ path: ['specifications'], code: 'too_big', maximum: 50 }]), '請修正：規格最多 50 項');
  assert.equal(describeProductInputIssues([{ path: ['specifications', 3], code: 'too_big', maximum: 200 }]), '請修正：每個規格最多 200 字');
  assert.equal(describeProductInputIssues([{ path: ['nameEn'], code: 'too_small' }]), '請修正：名稱（en）不可為空');
});

test('型號重複的訊息包含型號', () => {
  assert.match(duplicateModelMessage('1HV-11311-00'), /型號「1HV-11311-00」已經存在/);
});

test('送出前檢查：庫存須為 0 以上的整數', () => {
  const ok = { modelNumber: 'A', subCategoryId: 'x', nameZhTw: 'a', nameZhCn: 'a', nameEn: 'a', stockQuantity: 3 };
  assert.deepEqual(validateProductForm(ok), []);
  assert.deepEqual(validateProductForm({ ...ok, stockQuantity: 1.5 }), ['庫存必須是 0 到 1,000,000 的整數']);
  assert.deepEqual(validateProductForm({ ...ok, stockQuantity: -1 }), ['庫存必須是 0 到 1,000,000 的整數']);
  assert.ok(validateProductForm({ ...ok, subCategoryId: '' })[0].includes('請選擇子分類'));
});

test('送出前檢查：英文名稱必填，繁中、簡中選填', () => {
  const ok = { modelNumber: 'A', subCategoryId: 'x', nameZhTw: '', nameZhCn: '', nameEn: 'Cylinder', stockQuantity: 0 };
  assert.deepEqual(validateProductForm(ok), []);
  assert.deepEqual(validateProductForm({ ...ok, nameEn: '' }), ['名稱（en）不可為空']);
});

test('型號一律轉大寫並去掉頭尾空白', () => {
  assert.equal(normalizeModelNumber('  2a6-17421-00 '), '2A6-17421-00');
  assert.equal(normalizeModelNumber('DT125-4j3-17411-00'), 'DT125-4J3-17411-00');
  assert.equal(normalizeModelNumber('ABC'), 'ABC');
});

test('不分大小寫比對用的字串會跳脫 % _ 與反斜線', () => {
  assert.equal(escapeLikePattern('A_B%C\\D'), 'A\\_B\\%C\\\\D');
  assert.equal(escapeLikePattern('1HV-11311-00'), '1HV-11311-00');
});

test('OEM／對照料號：逗號、頓號、分號、換行分隔，轉大寫、去重複、去空白', () => {
  assert.deepEqual(splitOemNumbers('2a6-17421-00, 5t5-17421-00，2A6-17421-00、 ;\n x-1'), ['2A6-17421-00', '5T5-17421-00', 'X-1']);
  assert.deepEqual(splitOemNumbers(' , ，'), []);
  assert.deepEqual(normalizeOemNumbers(['ab-1', 'AB-1', '  ']), ['AB-1']);
});

// 健診 UX-24：欄位內嵌錯誤
import { mapServerErrorToFields, validateProductFormFields } from '../../src/lib/product-form.ts';

test('驗證結果依欄位回傳，validateProductForm 的訊息順序不變', () => {
  const input = { modelNumber: '', subCategoryId: '', nameZhTw: '', nameZhCn: '', nameEn: '', stockQuantity: 1.5 };
  const fields = validateProductFormFields(input);
  assert.deepEqual(Object.keys(fields), ['modelNumber', 'subCategoryId', 'nameEn', 'stockQuantity']);
  assert.deepEqual(validateProductForm(input), Object.values(fields));
  assert.deepEqual(validateProductFormFields({ ...input, modelNumber: 'A', subCategoryId: 's', nameEn: 'n', stockQuantity: 1 }), {});
});

test('伺服器錯誤對應到欄位；對不上的保留給摘要', () => {
  assert.deepEqual(mapServerErrorToFields(duplicateModelMessage('A-1')), { fields: { modelNumber: duplicateModelMessage('A-1') }, unmapped: false });
  assert.deepEqual(mapServerErrorToFields('OEM／對照料號「X-1」已經被產品「A」使用，請確認'), { fields: { oemNumbers: 'OEM／對照料號「X-1」已經被產品「A」使用，請確認' }, unmapped: false });
  assert.deepEqual(mapServerErrorToFields('請修正：型號太長（最多 100 字）、庫存必須是 0 到 1,000,000 的整數'), {
    fields: { modelNumber: '型號太長（最多 100 字）', stockQuantity: '庫存必須是 0 到 1,000,000 的整數' },
    unmapped: false
  });
  assert.equal(mapServerErrorToFields('請修正：每個規格最多 200 字').fields.specifications, '每個規格最多 200 字');
  assert.equal(mapServerErrorToFields('資料庫操作失敗，請稍後再試').unmapped, true);
  assert.equal(mapServerErrorToFields('請修正：型號太長（最多 100 字）、奇怪的錯誤').unmapped, true);
});
