// 車型清單（P8）：名稱整理與「資料庫還沒執行更新語法」的判斷
// 執行：node --experimental-strip-types --test 'tests/admin/*.test.mts'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMissingVehicleSchema, normalizeVehicleName } from '../../src/lib/vehicle-models.ts';

test('車型名稱：去掉頭尾空白、連續空白合成一個', () => {
  assert.equal(normalizeVehicleName('  Yamaha   DT125 '), 'Yamaha DT125');
  assert.equal(normalizeVehicleName('Honda\tCG125'), 'Honda CG125');
});

test('判斷資料表或欄位還沒建立', () => {
  assert.equal(isMissingVehicleSchema({ code: 'PGRST205', message: "Could not find the table 'public.vehicle_models' in the schema cache" }), true);
  assert.equal(isMissingVehicleSchema({ code: '42P01', message: 'relation "public.product_vehicle_models" does not exist' }), true);
  assert.equal(isMissingVehicleSchema({ code: '42703', message: 'column products.oem_numbers does not exist' }), true);
  assert.equal(isMissingVehicleSchema({ code: 'PGRST204', message: "Could not find the 'oem_numbers' column of 'products' in the schema cache" }), true);
  assert.equal(isMissingVehicleSchema({ code: '23505', message: 'duplicate key value' }), false);
  assert.equal(isMissingVehicleSchema({ code: '42703', message: 'column products.cover_image does not exist' }), false);
  assert.equal(isMissingVehicleSchema(null), false);
});
