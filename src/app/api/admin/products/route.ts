import {z} from 'zod';
import {categoryKeys} from '@/lib/catalog';
import {getSupabaseServerAuthClient, getSupabaseServiceRoleClient} from '@/lib/supabase/server';

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
}

interface ProductImageRow {
  id: string;
  product_id: string;
  storage_path: string | null;
}

const productPayloadSchema = z.object({
  id: z.string().optional(),
  category: z.enum(categoryKeys),
  modelNumber: z.string().min(1),
  nameZhTw: z.string().min(1),
  nameZhCn: z.string().min(1),
  nameEn: z.string().min(1),
  specifications: z.array(z.string()).default([]),
  stockQuantity: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  subCategoryId: z.string().uuid(),
  imagePath: z.string().optional().default('')
});

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
    imagePath: item.imagePath || ''
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

  return {ok: true, user} as const;
}

async function bindPrimaryImage(service: ServiceClient, productId: string, imagePath?: string) {
  const imageValue = (imagePath || '').trim();
  if (!imageValue) {
    return;
  }

  try {
    const {data: existing, error: selectError} = await service
      .from('product_images')
      .select('id')
      .eq('product_id', productId)
      .order('sort_order', {ascending: true})
      .limit(1)
      .maybeSingle();

    if (selectError && !/0 rows|Results contain 0 rows/.test(selectError.message)) {
      console.error('bindPrimaryImage select error:', selectError.message);
    }

    if (existing?.id) {
      const {error: updateError} = await service.from('product_images').update({storage_path: imageValue}).eq('id', existing.id);
      if (updateError) console.error('bindPrimaryImage update error:', updateError.message);
      return;
    }

    const {error: insertError} = await service.from('product_images').insert({
      product_id: productId,
      storage_path: imageValue,
      sort_order: 0
    });
    
    if (insertError) {
      console.error('bindPrimaryImage insert error:', insertError.message);
    }
  } catch (err) {
    console.error('bindPrimaryImage exception:', err);
  }
}

async function buildImageMap(service: ServiceClient, productIds: string[]) {
  const map = new Map<string, string>();

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
      if (!map.has(item.product_id)) {
        map.set(item.product_id, item.storage_path || '');
      }
    });
  } catch {
    // product_images table may not be provisioned yet.
  }

  return map;
}

function toAuthErrorStatus(error: string) {
  return error === 'Unauthorized' ? 401 : 500;
}

function buildRequestId() {
  return `adm-prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function logApiError(requestId: string, stage: string, detail: unknown) {
  console.error(`[admin-products][${requestId}] ${stage}`, detail);
}

function normalizeDatabaseError(message?: string) {
  const value = (message || '').trim();
  if (!value) {
    return 'Database operation failed';
  }

  if (value.includes('permission denied')) {
    return '資料庫權限不足：請確認 SUPABASE_SERVICE_ROLE_KEY 使用 service role key，並在 Supabase SQL Editor 補齊資料表/策略初始化。';
  }

  if (value.includes('Invalid API key')) {
    return 'Supabase API key 無效：請重新貼上正確的 SUPABASE_SERVICE_ROLE_KEY。';
  }

  return value;
}

interface EnsureCategoryResult {
  id: string | null;
  error: string;
}

async function ensureCategoryId(service: ServiceClient, slug: string) {
  const {data: existed, error: queryError} = await service
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (!queryError && existed?.id) {
    return {id: existed.id, error: ''} satisfies EnsureCategoryResult;
  }

  if (queryError && !/0 rows|Results contain 0 rows/.test(queryError.message || '')) {
    return {id: null, error: `Category query failed: ${queryError.message}`} satisfies EnsureCategoryResult;
  }

  const {data: inserted, error: insertError} = await service
    .from('categories')
    .insert({
      slug,
      name_i18n: {},
      description_i18n: {},
      sort_order: 999
    })
    .select('id')
    .single();

  if (insertError || !inserted?.id) {
    return {
      id: null,
      error: `Category create failed: ${insertError?.message || 'unknown error'}`
    } satisfies EnsureCategoryResult;
  }

  return {id: inserted.id, error: ''} satisfies EnsureCategoryResult;
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

  if (error) {
    logApiError(requestId, 'query products failed', error.message);
    return Response.json({error: normalizeDatabaseError(error.message), requestId}, {status: 500});
  }

  const productRows = (data as ProductRow[] | null) || [];
  const imageMap = await buildImageMap(
    service,
    productRows.map((item) => item.id)
  );

  const items = productRows.map((item) =>
    toAdminProductItem({
      ...item,
      imagePath: imageMap.get(item.id) || ''
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
    return Response.json({error: 'Invalid product payload', requestId}, {status: 400});
  }

  const payload = parsed.data;

  const categoryResult = await ensureCategoryId(service, payload.category);

  if (!categoryResult.id) {
    logApiError(requestId, 'category prepare failed', categoryResult.error || 'unknown');
    return Response.json(
      {error: normalizeDatabaseError(categoryResult.error || 'Category prepare failed'), requestId},
      {status: 400}
    );
  }

  const {data: inserted, error} = await service
    .from('products')
    .insert({
      category_id: categoryResult.id,
      model_number: payload.modelNumber,
      name_i18n: {
        'zh-TW': payload.nameZhTw,
        'zh-CN': payload.nameZhCn,
        en: payload.nameEn
      },
      specifications: payload.specifications,
      stock_quantity: payload.stockQuantity,
      is_active: payload.isActive,
      sub_category_id: payload.subCategoryId
    })
    .select('id')
    .single();

  if (error || !inserted?.id) {
    logApiError(requestId, 'insert product failed', error?.message || 'unknown');
    return Response.json(
      {error: normalizeDatabaseError(error?.message || 'Create product failed'), requestId},
      {status: 500}
    );
  }

  await bindPrimaryImage(service, inserted.id, payload.imagePath);

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
    return Response.json({error: 'Invalid product payload', requestId}, {status: 400});
  }

  const payload = parsed.data;
  const productId = payload.id;

  if (!productId) {
    return Response.json({error: 'Missing product ID', requestId}, {status: 400});
  }

  const categoryResult = await ensureCategoryId(service, payload.category);

  if (!categoryResult.id) {
    logApiError(requestId, 'category prepare failed', categoryResult.error || 'unknown');
    return Response.json(
      {error: normalizeDatabaseError(categoryResult.error || 'Category prepare failed'), requestId},
      {status: 400}
    );
  }

  const {error} = await service
    .from('products')
    .update({
      category_id: categoryResult.id,
      model_number: payload.modelNumber,
      name_i18n: {
        'zh-TW': payload.nameZhTw,
        'zh-CN': payload.nameZhCn,
        en: payload.nameEn
      },
      specifications: payload.specifications,
      stock_quantity: payload.stockQuantity,
      is_active: payload.isActive,
      sub_category_id: payload.subCategoryId
    })
    .eq('id', productId);

  if (error) {
    logApiError(requestId, 'update product failed', error.message);
    return Response.json({error: normalizeDatabaseError(error.message), requestId}, {status: 500});
  }

  await bindPrimaryImage(service, productId, payload.imagePath);

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

  if (!id) {
    return Response.json({error: 'Missing product ID', requestId}, {status: 400});
  }

  const {error} = await service.from('products').delete().eq('id', id);

  if (error) {
    logApiError(requestId, 'delete product failed', error.message);
    return Response.json({error: normalizeDatabaseError(error.message), requestId}, {status: 500});
  }

  return Response.json({ok: true, requestId});
}
