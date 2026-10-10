import {z} from 'zod';
import {getSupabaseServerAuthClient, getSupabaseServiceRoleClient} from '@/lib/supabase/server';
import {isAdminEmail} from '@/lib/admin-auth';
import {revalidateCatalog} from '@/lib/revalidate';
import {getProductImageUrls, removeUnreferencedImages} from '@/lib/product-image-cleanup';
import {describeDbError, INVALID_ID_MESSAGE, INVALID_INPUT_MESSAGE, isUuid} from '@/lib/admin-api-errors';
import {describeProductInputIssues, duplicateModelMessage, escapeLikePattern, MAX_OEM_NUMBERS, MAX_PRODUCT_IMAGES, MAX_STOCK_QUANTITY, MAX_VEHICLE_MODELS_PER_PRODUCT, normalizeModelNumber, normalizeOemNumbers} from '@/lib/product-form';
import {isMissingVehicleSchema, VEHICLE_SETUP_MESSAGE} from '@/lib/vehicle-models';
import {diffFields, safeSnapshot, writeAuditLog} from '@/lib/audit-log';
import {snapshotProduct} from '@/lib/audit-snapshots';

type ServiceClient = NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>;

interface CategoryJoinRef {
  slug?: string;
}

interface ProductRow {
  id: string;
  model_number: string;
  name_i18n?: Record<string, string>;
  specifications?: string[];
  stock_quantity?: number | null;
  is_active?: boolean | null;
  category: CategoryJoinRef | CategoryJoinRef[] | null;
  sub_category_id?: string | null;
  imagePath?: string;
  images?: string[];
  oemNumbers?: string[];
  vehicleModelIds?: string[];
}

interface ProductImageRow {
  id: string;
  product_id: string;
  storage_path: string | null;
}

// 欄位長度上限（A9）
const productPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(64),
  modelNumber: z.string().trim().min(1).max(100).transform(normalizeModelNumber),
  // 英文名稱必填（英文為主要語言）；繁中、簡中選填，沒填時前台顯示英文名稱（P5）
  nameZhTw: z.string().trim().max(200).optional().default(''),
  nameZhCn: z.string().trim().max(200).optional().default(''),
  nameEn: z.string().trim().min(1).max(200),
  specifications: z.array(z.string().max(200)).max(50).default([]),
  stockQuantity: z.number().int().nonnegative().max(MAX_STOCK_QUANTITY).default(0),
  isActive: z.boolean().default(true),
  subCategoryId: z.string().uuid(),
  // 圖片：images 是完整的圖片清單（第一張是主圖，最多 8 張）；舊的 imagePath 只放主圖，兩者都沒提供就不動圖片
  images: z.array(z.string().trim().min(1).max(1000)).max(MAX_PRODUCT_IMAGES).optional(),
  imagePath: z.string().max(1000).optional(),
  // 適用車型（車型清單的編號）與 OEM／對照料號（轉大寫、去重複）；沒提供就不動（P8）
  vehicleModelIds: z.array(z.string().uuid()).max(MAX_VEHICLE_MODELS_PER_PRODUCT).optional(),
  oemNumbers: z.array(z.string().trim().min(1).max(100)).max(MAX_OEM_NUMBERS).optional().transform((list) => (list ? normalizeOemNumbers(list) : list))
});

// 這次要寫入的圖片清單；undefined 代表不動圖片
function resolveImages(payload: {images?: string[]; imagePath?: string}): string[] | undefined {
  const list = payload.images ?? (payload.imagePath === undefined ? undefined : payload.imagePath.trim() ? [payload.imagePath.trim()] : []);
  return list ? [...new Set(list)] : undefined;
}

// 只存有填寫的語言，沒填的語言前台退回英文名稱
function buildNameI18n(payload: {nameZhTw: string; nameZhCn: string; nameEn: string}) {
  const names: Record<string, string> = {en: payload.nameEn};
  if (payload.nameZhTw) names['zh-TW'] = payload.nameZhTw;
  if (payload.nameZhCn) names['zh-CN'] = payload.nameZhCn;
  return names;
}

function toAdminProductItem(item: ProductRow) {
  const categoryRef = item.category;
  const category = Array.isArray(categoryRef) ? categoryRef[0]?.slug : categoryRef?.slug;

  return {
    id: item.id,
    category: category || 'cylinder',
    modelNumber: item.model_number,
    nameZhTw: item.name_i18n?.['zh-TW'] || '',
    nameZhCn: item.name_i18n?.['zh-CN'] || '',
    nameEn: item.name_i18n?.en || '',
    specifications: item.specifications || [],
    stockQuantity: item.stock_quantity ?? 0,
    isActive: Boolean(item.is_active),
    subCategoryId: item.sub_category_id || '',
    imagePath: item.imagePath || '',
    images: item.images || [],
    oemNumbers: item.oemNumbers || [],
    vehicleModelIds: item.vehicleModelIds || []
  };
}

async function getAuthenticatedUser() {
  const supabase = await getSupabaseServerAuthClient();
  if (!supabase) {
    return {ok: false, error: 'Supabase auth config is missing'} as const;
  }

  const {
    data: {user}
  } = await supabase.auth.getUser();

  if (!user) {
    return {ok: false, error: 'Unauthorized'} as const;
  }

  if (!isAdminEmail(user.email)) {
    return {ok: false, error: 'Forbidden'} as const;
  }

  return {ok: true, user} as const;
}

// 把產品的圖片清單同步到資料庫（第一張是主圖）：新圖加入、順序更新、不在清單裡的刪除，並清掉沒人使用的圖檔（U9）
async function syncProductImages(service: ServiceClient, productId: string, urls: string[]) {
  try {
    const {data: existing, error: selectError} = await service
      .from('product_images')
      .select('id, storage_path, sort_order')
      .eq('product_id', productId)
      .order('sort_order', {ascending: true});
    if (selectError) {
      console.error('syncProductImages select error:', selectError.message);
      return;
    }

    const rows = (existing as Array<{id: string; storage_path: string | null; sort_order: number | null}> | null) || [];
    const keepByPath = new Map<string, {id: string; sort_order: number | null}>();
    const removeIds: string[] = [];
    const removedUrls: string[] = [];
    for (const row of rows) {
      const path = row.storage_path || '';
      if (path && urls.includes(path) && !keepByPath.has(path)) keepByPath.set(path, row);
      else {
        removeIds.push(row.id);
        if (path) removedUrls.push(path);
      }
    }

    // 1) 先刪掉不要的（空出順序，避免資料庫對順序有唯一限制時衝突）
    if (removeIds.length) {
      const {error} = await service.from('product_images').delete().in('id', removeIds);
      if (error) {
        console.error('syncProductImages delete error:', error.message);
        return;
      }
    }
    // 2) 順序有變的先移到暫時的位置，再改成最終順序
    const reorder = urls.map((url, index) => ({url, index, row: keepByPath.get(url)})).filter((item) => item.row && item.row.sort_order !== item.index);
    for (const item of reorder) {
      await service.from('product_images').update({sort_order: 1000 + item.index}).eq('id', item.row!.id);
    }
    for (const item of reorder) {
      await service.from('product_images').update({sort_order: item.index}).eq('id', item.row!.id);
    }
    // 3) 新增的圖
    const inserts = urls.map((url, index) => ({product_id: productId, storage_path: url, sort_order: index})).filter((item) => !keepByPath.has(item.storage_path));
    if (inserts.length) {
      const {error} = await service.from('product_images').insert(inserts);
      if (error) console.error('syncProductImages insert error:', error.message);
    }
    // 4) 清掉沒有任何產品或分類使用的舊圖檔
    if (removedUrls.length) await removeUnreferencedImages(service, removedUrls);
  } catch (err) {
    console.error('syncProductImages exception:', err);
  }
}

// 每個產品的圖片清單（依順序，第一張是主圖）
async function buildImageMap(service: ServiceClient, productIds: string[]) {
  const map = new Map<string, string[]>();

  if (!productIds.length) {
    return map;
  }

  try {
    const {data} = await service
      .from('product_images')
      .select('product_id,storage_path,sort_order')
      .in('product_id', productIds)
      .order('sort_order', {ascending: true});

    ((data as ProductImageRow[] | null) || []).forEach((item) => {
      if (!item.storage_path) return;
      map.set(item.product_id, [...(map.get(item.product_id) || []), item.storage_path]);
    });
  } catch {
    // product_images table may not be provisioned yet.
  }

  return map;
}

// 產品的 OEM 對照料號與適用車型（資料庫還沒執行更新語法時查不到，回傳空的，不影響其他功能）
async function loadVehicleData(service: ServiceClient, productIds: string[]) {
  const oem = new Map<string, string[]>();
  const models = new Map<string, string[]>();
  if (!productIds.length) return {oem, models};
  try {
    const {data, error} = await service.from('products').select('id, oem_numbers').in('id', productIds);
    if (!error) ((data as Array<{id: string; oem_numbers: string[] | null}> | null) || []).forEach((row) => oem.set(row.id, row.oem_numbers || []));
  } catch {
    // products.oem_numbers 還沒建立
  }
  try {
    const {data, error} = await service.from('product_vehicle_models').select('product_id, vehicle_model_id').in('product_id', productIds);
    if (!error) {
      ((data as Array<{product_id: string; vehicle_model_id: string}> | null) || []).forEach((row) => {
        models.set(row.product_id, [...(models.get(row.product_id) || []), row.vehicle_model_id]);
      });
    }
  } catch {
    // product_vehicle_models 還沒建立
  }
  return {oem, models};
}

// 要存車型或對照料號時，先確認資料庫已經執行更新語法；沒有就整筆不存並說明，避免存了一半
async function vehicleSchemaMissing(service: ServiceClient, needsOem: boolean, needsModels: boolean) {
  if (needsOem) {
    const {error} = await service.from('products').select('oem_numbers').limit(1);
    if (error && isMissingVehicleSchema(error)) return true;
  }
  if (needsModels) {
    const {error} = await service.from('product_vehicle_models').select('product_id').limit(1);
    if (error && isMissingVehicleSchema(error)) return true;
  }
  return false;
}

// 把產品的適用車型同步到資料庫：不在清單裡的刪除、新的加入
async function syncProductVehicleModels(service: ServiceClient, productId: string, modelIds: string[]) {
  try {
    const {data, error} = await service.from('product_vehicle_models').select('vehicle_model_id').eq('product_id', productId);
    if (error) {
      if (!isMissingVehicleSchema(error)) console.error('syncProductVehicleModels select error:', error.message);
      return;
    }
    const current = ((data as Array<{vehicle_model_id: string}> | null) || []).map((row) => row.vehicle_model_id);
    const wanted = [...new Set(modelIds)];
    const removed = current.filter((id) => !wanted.includes(id));
    const added = wanted.filter((id) => !current.includes(id));
    if (removed.length) {
      const {error: deleteError} = await service.from('product_vehicle_models').delete().eq('product_id', productId).in('vehicle_model_id', removed);
      if (deleteError) console.error('syncProductVehicleModels delete error:', deleteError.message);
    }
    if (added.length) {
      const {error: insertError} = await service.from('product_vehicle_models').insert(added.map((id) => ({product_id: productId, vehicle_model_id: id})));
      if (insertError) console.error('syncProductVehicleModels insert error:', insertError.message);
    }
  } catch (err) {
    console.error('syncProductVehicleModels exception:', err);
  }
}

function toAuthErrorStatus(error: string) {
  if (error === 'Unauthorized') return 401;
  if (error === 'Forbidden') return 403;
  return 500;
}

function buildRequestId() {
  return `adm-prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function logApiError(requestId: string, stage: string, detail: unknown) {
  console.error(`[admin-products][${requestId}] ${stage}`, detail);
}

// 資料庫錯誤：詳細內容記錄在伺服器 log，回應中文說明（A9）
function dbError(requestId: string, stage: string, error: {code?: string; message?: string} | null | undefined) {
  logApiError(requestId, stage, `${error?.code || ''} ${error?.message || ''}`);
  const {message, status} = describeDbError(error);
  return Response.json({error: message, requestId}, {status});
}

// 型號重複：直接指出是哪個型號（P6；資料庫對型號有唯一限制）
function duplicateModelResponse(requestId: string, modelNumber: string, error: {code?: string; message?: string}) {
  logApiError(requestId, 'duplicate model number', `${error.code || ''} ${error.message || ''}`);
  return Response.json({error: duplicateModelMessage(modelNumber), requestId}, {status: 409});
}

// 型號不分大小寫比對是否已被其他產品使用（資料庫的唯一限制區分大小寫，舊資料可能是小寫）
async function modelNumberTaken(service: ServiceClient, modelNumber: string, excludeId?: string) {
  let query = service.from('products').select('id').ilike('model_number', escapeLikePattern(modelNumber)).limit(1);
  if (excludeId) query = query.neq('id', excludeId);
  const {data} = await query;
  return Boolean(data?.length);
}

// 依代號找大分類；找不到時不再自動建立沒有名稱的分類（A9）
async function findCategoryId(service: ServiceClient, slug: string) {
  const {data} = await service.from('categories').select('id').eq('slug', slug).maybeSingle();
  return (data?.id as string | undefined) || null;
}

// 子分類必須屬於所選的大分類，否則前台會把產品放到錯誤的位置（A3）
async function checkSubCategoryInCategory(service: ServiceClient, subCategoryId: string, categoryId: string) {
  const {data} = await service.from('sub_categories').select('category_id').eq('id', subCategoryId).maybeSingle();
  return data?.category_id === categoryId;
}

export async function GET() {
  const requestId = buildRequestId();
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) {
    return Response.json({error: authResult.error, requestId}, {status: toAuthErrorStatus(authResult.error)});
  }

  const service = getSupabaseServiceRoleClient();
  if (!service) {
    return Response.json({error: 'Supabase service role config is missing', requestId}, {status: 500});
  }

  const {data, error} = await service
    .from('products')
    .select('id,model_number,name_i18n,specifications,stock_quantity,is_active,category:categories!inner(slug),sub_category_id')
    .order('model_number', {ascending: true});

  if (error) return dbError(requestId, 'query products failed', error);

  const productRows = (data as ProductRow[] | null) || [];
  const imageMap = await buildImageMap(
    service,
    productRows.map((item) => item.id)
  );

  const vehicleData = await loadVehicleData(
    service,
    productRows.map((item) => item.id)
  );

  const items = productRows.map((item) =>
    toAdminProductItem({
      ...item,
      imagePath: imageMap.get(item.id)?.[0] || '',
      images: imageMap.get(item.id) || [],
      oemNumbers: vehicleData.oem.get(item.id) || [],
      vehicleModelIds: vehicleData.models.get(item.id) || []
    })
  );

  return Response.json({items, requestId});
}

export async function POST(request: Request) {
  const requestId = buildRequestId();
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) {
    return Response.json({error: authResult.error, requestId}, {status: toAuthErrorStatus(authResult.error)});
  }

  const service = getSupabaseServiceRoleClient();
  if (!service) {
    return Response.json({error: 'Supabase service role config is missing', requestId}, {status: 500});
  }

  const rawPayload = await request.json();
  const parsed = productPayloadSchema.safeParse(rawPayload);

  if (!parsed.success) {
    logApiError(requestId, 'payload validation failed', parsed.error.flatten());
    // 指出是哪個欄位有問題（P6）
    return Response.json({error: describeProductInputIssues(parsed.error.issues), requestId}, {status: 400});
  }

  const payload = parsed.data;

  const categoryId = await findCategoryId(service, payload.category);
  if (!categoryId) {
    return Response.json({error: '找不到這個大分類，請重新整理頁面後再選一次', requestId}, {status: 400});
  }

  if (!(await checkSubCategoryInCategory(service, payload.subCategoryId, categoryId))) {
    return Response.json({error: '子分類不屬於所選的大分類，請重新選擇子分類', requestId}, {status: 400});
  }

  if (await modelNumberTaken(service, payload.modelNumber)) {
    return duplicateModelResponse(requestId, payload.modelNumber, {code: '23505', message: 'model number exists (case-insensitive)'});
  }

  if (await vehicleSchemaMissing(service, Boolean(payload.oemNumbers?.length), Boolean(payload.vehicleModelIds?.length))) {
    return Response.json({error: VEHICLE_SETUP_MESSAGE, requestId}, {status: 409});
  }

  const insertRow: Record<string, unknown> = {
    category_id: categoryId,
    model_number: payload.modelNumber,
    name_i18n: buildNameI18n(payload),
    specifications: payload.specifications,
    stock_quantity: payload.stockQuantity,
    is_active: payload.isActive,
    sub_category_id: payload.subCategoryId
  };
  // 對照料號有提供才寫入；資料庫還沒有該欄位時（且沒有要存對照料號），改用不含該欄位的寫法
  let insertResult = await service
    .from('products')
    .insert(payload.oemNumbers === undefined ? insertRow : {...insertRow, oem_numbers: payload.oemNumbers})
    .select('id')
    .single();
  if (insertResult.error && isMissingVehicleSchema(insertResult.error)) {
    insertResult = await service.from('products').insert(insertRow).select('id').single();
  }
  const {data: inserted, error} = insertResult;

  if (error?.code === '23505') return duplicateModelResponse(requestId, payload.modelNumber, error);
  if (error || !inserted?.id) return dbError(requestId, 'insert product failed', error);

  const images = resolveImages(payload);
  if (images?.length) await syncProductImages(service, inserted.id, images);
  if (payload.vehicleModelIds?.length) await syncProductVehicleModels(service, inserted.id, payload.vehicleModelIds);

  const createdSnapshot = await safeSnapshot(() => snapshotProduct(service, inserted.id));
  await writeAuditLog(service, {
    actorEmail: authResult.user.email || '',
    action: 'create',
    entityType: 'product',
    entityId: inserted.id,
    entityLabel: payload.modelNumber,
    changes: diffFields(null, createdSnapshot || null)
  });

  revalidateCatalog();
  return Response.json({ok: true, id: inserted.id, requestId});
}

export async function PUT(request: Request) {
  const requestId = buildRequestId();
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) {
    return Response.json({error: authResult.error, requestId}, {status: toAuthErrorStatus(authResult.error)});
  }

  const service = getSupabaseServiceRoleClient();
  if (!service) {
    return Response.json({error: 'Supabase service role config is missing', requestId}, {status: 500});
  }

  const rawPayload = await request.json();
  const parsed = productPayloadSchema.safeParse(rawPayload);

  if (!parsed.success || !parsed.data.id) {
    logApiError(requestId, 'payload validation failed', parsed.success ? 'missing id' : parsed.error.flatten());
    const message = parsed.success ? INVALID_INPUT_MESSAGE : describeProductInputIssues(parsed.error.issues);
    return Response.json({error: message, requestId}, {status: 400});
  }

  const payload = parsed.data;
  const productId = payload.id;

  if (!productId) {
    return Response.json({error: INVALID_ID_MESSAGE, requestId}, {status: 400});
  }

  const categoryId = await findCategoryId(service, payload.category);
  if (!categoryId) {
    return Response.json({error: '找不到這個大分類，請重新整理頁面後再選一次', requestId}, {status: 400});
  }

  if (!(await checkSubCategoryInCategory(service, payload.subCategoryId, categoryId))) {
    return Response.json({error: '子分類不屬於所選的大分類，請重新選擇子分類', requestId}, {status: 400});
  }

  if (await modelNumberTaken(service, payload.modelNumber, productId)) {
    return duplicateModelResponse(requestId, payload.modelNumber, {code: '23505', message: 'model number exists (case-insensitive)'});
  }

  if (await vehicleSchemaMissing(service, Boolean(payload.oemNumbers?.length), Boolean(payload.vehicleModelIds?.length))) {
    return Response.json({error: VEHICLE_SETUP_MESSAGE, requestId}, {status: 409});
  }

  const updateRow: Record<string, unknown> = {
    category_id: categoryId,
    model_number: payload.modelNumber,
    name_i18n: buildNameI18n(payload),
    specifications: payload.specifications,
    stock_quantity: payload.stockQuantity,
    is_active: payload.isActive,
    sub_category_id: payload.subCategoryId
  };
  const beforeSnapshot = await safeSnapshot(() => snapshotProduct(service, productId));
  let updateResult = await service
    .from('products')
    .update(payload.oemNumbers === undefined ? updateRow : {...updateRow, oem_numbers: payload.oemNumbers})
    .eq('id', productId)
    .select('id');
  if (updateResult.error && isMissingVehicleSchema(updateResult.error)) {
    updateResult = await service.from('products').update(updateRow).eq('id', productId).select('id');
  }
  const {data: updated, error} = updateResult;

  if (error?.code === '23505') return duplicateModelResponse(requestId, payload.modelNumber, error);
  if (error) return dbError(requestId, 'update product failed', error);
  // 產品已被其他人刪除時，不要回報成功（U1）
  if (!updated?.length) {
    return Response.json({error: '找不到這筆產品，可能已被刪除，請重新載入列表', requestId}, {status: 404});
  }

  // 同步圖片清單（清單留空 = 移除全部圖片，U7）；沒提供圖片欄位就不動
  const images = resolveImages(payload);
  if (images) await syncProductImages(service, productId, images);
  if (payload.vehicleModelIds !== undefined) await syncProductVehicleModels(service, productId, payload.vehicleModelIds);

  const afterSnapshot = await safeSnapshot(() => snapshotProduct(service, productId));
  if (beforeSnapshot && afterSnapshot) {
    const changes = diffFields(beforeSnapshot, afterSnapshot);
    if (Object.keys(changes).length) {
      await writeAuditLog(service, {
        actorEmail: authResult.user.email || '',
        action: 'update',
        entityType: 'product',
        entityId: productId,
        entityLabel: afterSnapshot['型號'] || payload.modelNumber,
        changes
      });
    }
  }

  revalidateCatalog();
  return Response.json({ok: true, requestId});
}

export async function DELETE(request: Request) {
  const requestId = buildRequestId();
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) {
    return Response.json({error: authResult.error, requestId}, {status: toAuthErrorStatus(authResult.error)});
  }

  const service = getSupabaseServiceRoleClient();
  if (!service) {
    return Response.json({error: 'Supabase service role config is missing', requestId}, {status: 500});
  }

  const {searchParams} = new URL(request.url);
  const id = searchParams.get('id');

  if (!isUuid(id)) {
    return Response.json({error: INVALID_ID_MESSAGE, requestId}, {status: 400});
  }

  // 先記下圖片網址；刪除產品時資料庫會一併刪除圖片紀錄（on delete cascade），再清掉圖檔（A5）
  const imageUrls = await getProductImageUrls(service, id);
  const deletedSnapshot = await safeSnapshot(() => snapshotProduct(service, id));
  const {error} = await service.from('products').delete().eq('id', id);

  if (error) return dbError(requestId, 'delete product failed', error);
  await removeUnreferencedImages(service, imageUrls);
  await writeAuditLog(service, {
    actorEmail: authResult.user.email || '',
    action: 'delete',
    entityType: 'product',
    entityId: id,
    entityLabel: deletedSnapshot?.['型號'] || '（未知）',
    changes: diffFields(deletedSnapshot || null, null)
  });

  revalidateCatalog();
  return Response.json({ok: true, requestId});
}
