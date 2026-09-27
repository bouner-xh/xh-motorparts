import {getSupabaseServerAuthClient, getSupabaseServiceRoleClient} from '@/lib/supabase/server';
import {detectImageType} from '@/lib/image-signature';
import {isAdminEmail} from '@/lib/admin-auth';
import {removeUnreferencedImages} from '@/lib/product-image-cleanup';

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
}

function buildRequestId() {
  return `adm-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function logApiError(requestId: string, stage: string, detail: unknown) {
  console.error(`[admin-upload][${requestId}] ${stage}`, detail);
}

export async function POST(request: Request) {
  const requestId = buildRequestId();
  const authClient = await getSupabaseServerAuthClient();
  if (!authClient) {
    return Response.json({error: 'Supabase auth 設定不完整', requestId}, {status: 500});
  }

  const {
    data: {user}
  } = await authClient.auth.getUser();

  if (!user) {
    return Response.json({error: '未授權', requestId}, {status: 401});
  }

  if (!isAdminEmail(user.email)) {
    return Response.json({error: '沒有後台權限', requestId}, {status: 403});
  }

  const service = getSupabaseServiceRoleClient();
  if (!service) {
    return Response.json({error: 'Supabase service role 設定不完整', requestId}, {status: 500});
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return Response.json({error: '請提供圖片檔案', requestId}, {status: 400});
  }

  const supported = ['image/jpeg', 'image/png', 'image/webp'];
  if (!supported.includes(file.type)) {
    return Response.json({error: '僅支援 JPG / PNG / WEBP', requestId}, {status: 400});
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return Response.json({error: '檔案大小不可超過 5MB', requestId}, {status: 400});
  }

  const bucket = process.env.SUPABASE_PRODUCTS_BUCKET || 'product-images';
  const safeName = sanitizeFileName(file.name);
  const objectPath = `products/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // 以檔案內容確認真的是圖片，不只相信瀏覽器提供的 file.type
  const detectedType = detectImageType(buffer);
  if (!detectedType) {
    return Response.json({error: '僅支援 JPG / PNG / WEBP', requestId}, {status: 400});
  }

  const {error: uploadError} = await service.storage.from(bucket).upload(objectPath, buffer, {
    contentType: detectedType,
    upsert: false
  });

  if (uploadError) {
    logApiError(requestId, 'storage upload failed', uploadError.message);
    // 詳細錯誤只記錄在伺服器 log，避免對外透露儲存空間設定
    return Response.json({error: '圖片上傳失敗，請稍後再試', requestId}, {status: 500});
  }

  const {data: publicData} = service.storage.from(bucket).getPublicUrl(objectPath);

  return Response.json({
    ok: true,
    imagePath: publicData.publicUrl,
    objectPath,
    requestId
  });
}

// 刪除「已上傳但最後沒有存檔」的圖片（A7）：例如換了一張圖、取消編輯
// 只會刪除本網站儲存空間內、且沒有任何產品使用的檔案
export async function DELETE(request: Request) {
  const authClient = await getSupabaseServerAuthClient();
  if (!authClient) {
    return Response.json({error: 'Supabase auth 設定不完整'}, {status: 500});
  }
  const {
    data: {user}
  } = await authClient.auth.getUser();
  if (!user) {
    return Response.json({error: '未授權'}, {status: 401});
  }
  if (!isAdminEmail(user.email)) {
    return Response.json({error: '沒有後台權限'}, {status: 403});
  }

  const service = getSupabaseServiceRoleClient();
  if (!service) {
    return Response.json({error: 'Supabase service role 設定不完整'}, {status: 500});
  }

  const url = new URL(request.url).searchParams.get('url') || '';
  if (!url || url.length > 1000) {
    return Response.json({error: '缺少圖片網址'}, {status: 400});
  }

  await removeUnreferencedImages(service, [url]);
  return Response.json({ok: true});
}
