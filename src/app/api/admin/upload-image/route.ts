import {getSupabaseServerAuthClient, getSupabaseServiceRoleClient} from '@/lib/supabase/server';

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

  const {error: uploadError} = await service.storage.from(bucket).upload(objectPath, buffer, {
    contentType: file.type,
    upsert: false
  });

  if (uploadError) {
    logApiError(requestId, 'storage upload failed', uploadError.message);
    return Response.json({error: uploadError.message, requestId}, {status: 500});
  }

  const {data: publicData} = service.storage.from(bucket).getPublicUrl(objectPath);

  return Response.json({
    ok: true,
    imagePath: publicData.publicUrl,
    objectPath,
    requestId
  });
}
