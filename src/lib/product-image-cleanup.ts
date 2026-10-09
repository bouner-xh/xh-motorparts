import {getSupabaseServiceRoleClient} from '@/lib/supabase/server';
import {storageObjectPath} from '@/lib/storage-path';
import {isMissingCoverColumn} from '@/lib/category-cover';

type ServiceClient = NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>;

// 刪除已沒有任何產品使用的圖片檔（A5）
// 用在：刪除產品、換圖、批量匯入覆蓋圖片之後。清除失敗只記錄，不影響主要操作。
export async function removeUnreferencedImages(service: ServiceClient, urls: string[]) {
  const bucket = process.env.SUPABASE_PRODUCTS_BUCKET || 'product-images';
  const paths: string[] = [];

  for (const url of new Set(urls.filter(Boolean))) {
    const objectPath = storageObjectPath(url, bucket);
    if (!objectPath) continue;
    const {data, error} = await service.from('product_images').select('id').eq('storage_path', url).limit(1);
    if (error) {
      console.error('[image-cleanup] reference check failed', error.message);
      continue;
    }
    if (data?.length) continue;
    // 分類封面也算使用中（資料庫還沒有封面欄位時，查詢會失敗，代表沒有分類在使用）
    const {data: categoryUse, error: categoryError} = await service.from('categories').select('id').eq('cover_image', url).limit(1);
    if (categoryError && !isMissingCoverColumn(categoryError)) {
      console.error('[image-cleanup] category reference check failed', categoryError.message);
      continue;
    }
    if (!categoryUse?.length) paths.push(objectPath);
  }

  if (!paths.length) return;
  const {error} = await service.storage.from(bucket).remove(paths);
  if (error) console.error('[image-cleanup] storage remove failed', error.message);
}

// 取得產品目前綁定的圖片網址
export async function getProductImageUrls(service: ServiceClient, productId: string) {
  const {data} = await service.from('product_images').select('storage_path').eq('product_id', productId);
  return ((data as {storage_path: string | null}[] | null) || []).map((row) => row.storage_path || '').filter(Boolean);
}
