import { z } from 'zod';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin-auth';
import { revalidateCatalog } from '@/lib/revalidate';
import { getProductImageUrls, removeUnreferencedImages } from '@/lib/product-image-cleanup';
import { escapeLikePattern, MAX_STOCK_QUANTITY, normalizeModelNumber } from '@/lib/product-form';
import { describeDbError, INVALID_INPUT_MESSAGE, type DbErrorLike } from '@/lib/admin-api-errors';

// 每列的錯誤訊息：原始資料庫錯誤記在伺服器 log，畫面顯示中文說明（A9）
function rowDbError(stage: string, modelNumber: string, error: DbErrorLike | null | undefined) {
  console.error(`[admin-batch] ${stage} ${modelNumber}`, error?.code || '', error?.message || '');
  return new Error(`${stage}：${describeDbError(error).message}`);
}

// 欄位長度上限（A9）
const i18nSchema = z.record(z.string().max(20), z.string().max(200)).default({});
const batchProductSchema = z.object({
  categorySlug: z.string().trim().min(1).max(64),
  categoryNameI18n: i18nSchema,
  subCategorySlug: z.string().trim().min(1).max(64),
  subCategoryNameI18n: i18nSchema,
  modelNumber: z.string().trim().min(1).max(100).transform(normalizeModelNumber),
  nameI18n: i18nSchema,
  // 沒填（null／未提供）時：新產品用預設值，既有產品保留原本內容（A4）
  specifications: z.array(z.string().max(200)).max(50).nullish(),
  stockQuantity: z.number().int().nonnegative().max(MAX_STOCK_QUANTITY).nullish(),
  isActive: z.boolean().default(true),
  imagePath: z.string().max(1000).optional().default('')
});

// 每次最多 100 筆；前端每 50 筆送一次（src/lib/product-import.ts 的 IMPORT_CHUNK_SIZE），避免超過伺服器執行時間
const batchImportPayloadSchema = z.object({
  products: z.array(batchProductSchema).min(1).max(100)
});

async function getAuthenticatedUser() {
  const supabase = await getSupabaseServerAuthClient();
  if (!supabase) return { ok: false, error: 'Supabase auth config is missing' } as const;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Unauthorized' } as const;
  if (!isAdminEmail(user.email)) return { ok: false, error: 'Forbidden' } as const;

  return { ok: true, user } as const;
}

export async function POST(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: authResult.error === 'Forbidden' ? 403 : 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const parsed = batchImportPayloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    console.error('[admin-batch] payload validation failed', JSON.stringify(parsed.error.flatten()));
    return Response.json({ error: `${INVALID_INPUT_MESSAGE}（每次最多 100 筆）` }, { status: 400 });
  }

  const { products } = parsed.data;

  // 用於快取避免重複查詢資料庫
  const categoryCache = new Map<string, string>(); // slug -> id
  const subCategoryCache = new Map<string, string>(); // categoryId:subCategorySlug -> id

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (const item of products) {
    try {
      // 1. 確保大分類存在
      let categoryId = categoryCache.get(item.categorySlug);
      if (!categoryId) {
        const { data: catExisted } = await service
          .from('categories')
          .select('id')
          .eq('slug', item.categorySlug)
          .maybeSingle();

        if (catExisted?.id) {
          categoryId = catExisted.id;
        } else {
          // 建立新大分類
          const nameI18n = {...item.categoryNameI18n};
          if (Object.keys(nameI18n).length === 0) {
            nameI18n['zh-TW'] = item.categorySlug;
          }

          const { data: catNew, error: catErr } = await service
            .from('categories')
            .insert({
              slug: item.categorySlug,
              name_i18n: nameI18n,
              description_i18n: { 'zh-TW': '', 'zh-CN': '', en: '' },
              sort_order: 0
            })
            .select('id')
            .single();

          if (catErr || !catNew?.id) {
            throw rowDbError('建立大分類失敗', item.modelNumber, catErr);
          }
          categoryId = catNew.id;
        }
        if (!categoryId) throw new Error('無法取得或建立大分類 ID');
        categoryCache.set(item.categorySlug, categoryId);
      }

      // 2. 確保子分類存在
      const subCatCacheKey = `${categoryId}:${item.subCategorySlug}`;
      let subCategoryId = subCategoryCache.get(subCatCacheKey);
      if (!subCategoryId) {
        const { data: subExisted } = await service
          .from('sub_categories')
          .select('id')
          .eq('category_id', categoryId)
          .eq('slug', item.subCategorySlug)
          .maybeSingle();

        if (subExisted?.id) {
          subCategoryId = subExisted.id;
        } else {
          // 建立新子分類
          const nameI18n = {...item.subCategoryNameI18n};
          if (Object.keys(nameI18n).length === 0) {
            nameI18n['zh-TW'] = item.subCategorySlug;
          }

          const { data: subNew, error: subErr } = await service
            .from('sub_categories')
            .insert({
              category_id: categoryId,
              slug: item.subCategorySlug,
              name_i18n: nameI18n,
              sort_order: 0
            })
            .select('id')
            .single();

          if (subErr || !subNew?.id) {
            throw rowDbError('建立子分類失敗', item.modelNumber, subErr);
          }
          subCategoryId = subNew.id;
        }
        if (!subCategoryId) throw new Error('無法取得或建立子分類 ID');
        subCategoryCache.set(subCatCacheKey, subCategoryId);
      }

      // 3. Upsert 產品資訊 (以 model_number 作為唯一鍵)
      // 型號不分大小寫比對，舊資料是小寫時也會更新同一筆（並改存成大寫），不會重複建立
      const { data: prodMatches } = await service
        .from('products')
        .select('id, name_i18n')
        .ilike('model_number', escapeLikePattern(item.modelNumber))
        .limit(1);
      const prodExisted = prodMatches?.[0];

      let productId = '';
      if (prodExisted?.id) {
        // 更新：名稱只覆蓋有填寫的語言，規格與庫存沒填時保留原值（A4）
        productId = prodExisted.id;
        const update: Record<string, unknown> = {
          category_id: categoryId,
          sub_category_id: subCategoryId,
          model_number: item.modelNumber,
          name_i18n: { ...(prodExisted.name_i18n || {}), ...item.nameI18n },
          is_active: item.isActive
        };
        if (item.specifications != null) update.specifications = item.specifications;
        if (item.stockQuantity != null) update.stock_quantity = item.stockQuantity;
        const { error: updateErr } = await service
          .from('products')
          .update(update)
          .eq('id', productId);

        if (updateErr) {
          throw rowDbError('更新產品失敗', item.modelNumber, updateErr);
        }
      } else {
        // 新增
        if (Object.keys(item.nameI18n).length === 0) {
          throw new Error('新產品至少要填寫一個語言的名稱');
        }
        const { data: prodNew, error: createErr } = await service
          .from('products')
          .insert({
            category_id: categoryId,
            sub_category_id: subCategoryId,
            model_number: item.modelNumber,
            name_i18n: item.nameI18n,
            specifications: item.specifications ?? [],
            stock_quantity: item.stockQuantity ?? 0,
            is_active: item.isActive
          })
          .select('id')
          .single();

        if (createErr || !prodNew?.id) {
          throw rowDbError('建立產品失敗', item.modelNumber, createErr);
        }
        productId = prodNew.id;
      }

      // 4. 綁定圖片 (如果提供了 imagePath)
      if (item.imagePath) {
        // 先嘗試刪除舊的 product_images 關聯 (避免重複)，並記下舊圖稍後清除（A5）
        const oldImageUrls = await getProductImageUrls(service, productId);
        await service.from('product_images').delete().eq('product_id', productId);
        // 新增新的關聯
        const { error: imgErr } = await service
          .from('product_images')
          .insert({
            product_id: productId,
            storage_path: item.imagePath,
            sort_order: 0
          });

        if (imgErr) {
          console.error(`綁定圖片失敗 (Product ID: ${productId}): ${imgErr.message}`);
        }
        await removeUnreferencedImages(service, oldImageUrls.filter((url) => url !== item.imagePath));
      }

      results.push({ modelNumber: item.modelNumber, success: true });
      successCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知錯誤';
      results.push({ modelNumber: item.modelNumber, success: false, error: msg });
      errorCount++;
    }
  }

  revalidateCatalog();
  return Response.json({
    ok: true,
    summary: {
      total: products.length,
      success: successCount,
      failed: errorCount
    },
    results
  });
}
