import { z } from 'zod';
import { getSupabaseServerAuthClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

const batchProductSchema = z.object({
  categorySlug: z.string().min(1),
  categoryNameZhTw: z.string().optional().default(''),
  categoryNameZhCn: z.string().optional().default(''),
  categoryNameEn: z.string().optional().default(''),
  subCategorySlug: z.string().min(1),
  subCategoryNameZhTw: z.string().optional().default(''),
  subCategoryNameZhCn: z.string().optional().default(''),
  subCategoryNameEn: z.string().optional().default(''),
  modelNumber: z.string().min(1),
  nameZhTw: z.string().min(1),
  nameZhCn: z.string().min(1),
  nameEn: z.string().min(1),
  specifications: z.array(z.string()).default([]),
  stockQuantity: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  imagePath: z.string().optional().default('')
});

const batchImportPayloadSchema = z.object({
  products: z.array(batchProductSchema)
});

async function getAuthenticatedUser() {
  const supabase = await getSupabaseServerAuthClient();
  if (!supabase) return { ok: false, error: 'Supabase auth config is missing' } as const;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Unauthorized' } as const;

  return { ok: true, user } as const;
}

export async function POST(request: Request) {
  const authResult = await getAuthenticatedUser();
  if (!authResult.ok) return Response.json({ error: authResult.error }, { status: 401 });

  const service = getSupabaseServiceRoleClient();
  if (!service) return Response.json({ error: 'Missing service role' }, { status: 500 });

  const parsed = batchImportPayloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: 'Invalid payload schema', details: parsed.error.flatten() }, { status: 400 });
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
          const nameZhTw = item.categoryNameZhTw || item.categorySlug;
          const nameZhCn = item.categoryNameZhCn || nameZhTw;
          const nameEn = item.categoryNameEn || item.categorySlug;

          const { data: catNew, error: catErr } = await service
            .from('categories')
            .insert({
              slug: item.categorySlug,
              name_i18n: { 'zh-TW': nameZhTw, 'zh-CN': nameZhCn, en: nameEn },
              description_i18n: { 'zh-TW': '', 'zh-CN': '', en: '' },
              sort_order: 0
            })
            .select('id')
            .single();

          if (catErr || !catNew?.id) {
            throw new Error(`建立大分類失敗: ${catErr?.message || '未知錯誤'}`);
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
          const nameZhTw = item.subCategoryNameZhTw || item.subCategorySlug;
          const nameZhCn = item.subCategoryNameZhCn || nameZhTw;
          const nameEn = item.subCategoryNameEn || item.subCategorySlug;

          const { data: subNew, error: subErr } = await service
            .from('sub_categories')
            .insert({
              category_id: categoryId,
              slug: item.subCategorySlug,
              name_i18n: { 'zh-TW': nameZhTw, 'zh-CN': nameZhCn, en: nameEn },
              sort_order: 0
            })
            .select('id')
            .single();

          if (subErr || !subNew?.id) {
            throw new Error(`建立子分類失敗: ${subErr?.message || '未知錯誤'}`);
          }
          subCategoryId = subNew.id;
        }
        if (!subCategoryId) throw new Error('無法取得或建立子分類 ID');
        subCategoryCache.set(subCatCacheKey, subCategoryId);
      }

      // 3. Upsert 產品資訊 (以 model_number 作為唯一鍵)
      const { data: prodExisted } = await service
        .from('products')
        .select('id')
        .eq('model_number', item.modelNumber)
        .maybeSingle();

      let productId = '';
      if (prodExisted?.id) {
        // 更新
        productId = prodExisted.id;
        const { error: updateErr } = await service
          .from('products')
          .update({
            category_id: categoryId,
            sub_category_id: subCategoryId,
            name_i18n: { 'zh-TW': item.nameZhTw, 'zh-CN': item.nameZhCn, en: item.nameEn },
            specifications: item.specifications,
            stock_quantity: item.stockQuantity,
            is_active: item.isActive
          })
          .eq('id', productId);

        if (updateErr) {
          throw new Error(`更新產品失敗: ${updateErr.message}`);
        }
      } else {
        // 新增
        const { data: prodNew, error: createErr } = await service
          .from('products')
          .insert({
            category_id: categoryId,
            sub_category_id: subCategoryId,
            model_number: item.modelNumber,
            name_i18n: { 'zh-TW': item.nameZhTw, 'zh-CN': item.nameZhCn, en: item.nameEn },
            specifications: item.specifications,
            stock_quantity: item.stockQuantity,
            is_active: item.isActive
          })
          .select('id')
          .single();

        if (createErr || !prodNew?.id) {
          throw new Error(`建立產品失敗: ${createErr?.message || '未知錯誤'}`);
        }
        productId = prodNew.id;
      }

      // 4. 綁定圖片 (如果提供了 imagePath)
      if (item.imagePath) {
        // 先嘗試刪除舊的 product_images 關聯 (避免重複)
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
      }

      results.push({ modelNumber: item.modelNumber, success: true });
      successCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知錯誤';
      results.push({ modelNumber: item.modelNumber, success: false, error: msg });
      errorCount++;
    }
  }

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
