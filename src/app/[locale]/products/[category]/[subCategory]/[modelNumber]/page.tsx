import type { Metadata } from 'next';
import {ProductGallery} from '@/components/products/ProductGallery';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { Breadcrumb } from '@/components/products/Breadcrumb';
import { InquiryForm } from '@/components/products/InquiryForm';
import { ProductSchema } from '@/components/products/ProductSchema';
import { toProductImageUrl } from '@/lib/assets';
import { getCatalogProduct, getCatalogProducts, getCategoryBySlug, getSubCategoryBySlug, resolveCanonicalProductPath } from '@/lib/catalog-service';
import { locales, type Locale, type CategoryKey } from '@/lib/catalog';
import { getBaseUrl, localeAlternates } from '@/lib/site';
import { localized } from '@/lib/localized-text';
import { decodeSegment, encodeSegment } from '@/lib/url-segment';
import { buildProductDescription, buildProductTitle } from '@/lib/product-seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; subCategory: string; modelNumber: string }>;
}): Promise<Metadata> {
  const { locale, category: rawCategory, subCategory, modelNumber } = await params;
  const category = decodeSegment(rawCategory);

  if (!locales.includes(locale as Locale)) {
    return {};
  }

  const localeValue = locale as Locale;
  const categoryData = await getCategoryBySlug(category, localeValue);
  if (!categoryData) return {};

  const decodedSubCategory = decodeURIComponent(subCategory);
  
  const subCategoryData = await getSubCategoryBySlug(categoryData.slug, decodedSubCategory, localeValue);
  if (!subCategoryData) return {};

  const product = await getCatalogProduct(categoryData.slug, decodeURIComponent(modelNumber), localeValue);
  if (!product) {
    return {};
  }

  const baseUrl = getBaseUrl();
  const encodedModel = encodeURIComponent(product.slug ?? product.model);

  // 搜尋引擎看到的標題與描述：品名在前、加上分類與公司名，描述依語言寫成完整句子（SEO 調整）
  const seoInput = {
    model: product.model,
    name: product.name,
    categoryName: categoryData.name,
    subCategoryName: subCategoryData.name,
    specifications: product.specifications
  };
  const title = buildProductTitle(seoInput, localeValue);
  const description = buildProductDescription(seoInput, localeValue);

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${baseUrl}/${locale}/products/${encodeSegment(categoryData.slug)}/${encodeURIComponent(subCategoryData.slug)}/${encodedModel}`,
      images: [toProductImageUrl(product.image)],
      locale,
      siteName: localized(locale, { 'zh-TW': '協皇企業有限公司', 'zh-CN': '协皇企业有限公司', en: 'Xie Huang Enterprise Co., Ltd.' })
    },
    alternates: localeAlternates(locale, `/products/${encodeSegment(categoryData.slug)}/${encodeURIComponent(subCategoryData.slug)}/${encodedModel}`),
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; category: string; subCategory: string; modelNumber: string }>;
}) {
  const { locale, category: rawCategory, subCategory, modelNumber } = await params;
  const category = decodeSegment(rawCategory);
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const localeValue = locale as Locale;
  setRequestLocale(localeValue);

  const decodedModel = decodeURIComponent(modelNumber);
  const decodedSubCategory = decodeURIComponent(subCategory);

  const [categoryData, product, subCategoryData, tProducts, tNav] = await Promise.all([
    getCategoryBySlug(category, localeValue),
    getCatalogProduct(category as CategoryKey, decodedModel, localeValue),
    getSubCategoryBySlug(category as CategoryKey, decodedSubCategory, localeValue),
    getTranslations({ locale: localeValue, namespace: 'products' }),
    getTranslations({ locale: localeValue, namespace: 'nav' })
  ]);

  // 產品其實在別的子分類底下（子分類改過代號、產品被搬走）時，也轉到正確網址，避免舊網址 404 或同一產品出現在兩個網址
  const inWrongSubCategory = Boolean(product?.subCategory && subCategoryData && product.subCategory !== subCategoryData.slug);
  if (!categoryData || !product || !subCategoryData || inWrongSubCategory) {
    // 網址大小寫寫錯時轉到正確的網址（分類、子分類、型號都不分大小寫）
    const canonical = await resolveCanonicalProductPath([category, decodedSubCategory, decodedModel]);
    if (canonical) permanentRedirect(`/${localeValue}${canonical}`);
    notFound();
  }

  return (
    <main>
      <ProductSchema product={product} category={categoryData.slug} subCategory={subCategoryData.slug} locale={localeValue} />
      <Breadcrumb
        items={[
          { label: tNav('home'), href: `/${localeValue}` },
          { label: tNav('products'), href: `/${localeValue}/products` },
          { label: categoryData.name, href: `/${localeValue}/products/${encodeSegment(categoryData.slug)}` },
          { label: subCategoryData.name, href: `/${localeValue}/products/${encodeSegment(categoryData.slug)}/${encodeURIComponent(subCategoryData.slug)}` },
          { label: product.model },
        ]}
      />

      <section className="detail-grid">
        <article className="card detail-media">
          <ProductGallery
            images={(product.images?.length ? product.images : [product.image]).map(toProductImageUrl)}
            alt={`${product.model} ${product.name}`}
            thumbLabel={localized(localeValue, { 'zh-TW': '第 {n} 張圖片，共 {total} 張', 'zh-CN': '第 {n} 张图片，共 {total} 张', en: 'Image {n} of {total}' })}
          />
        </article>

        <div className="detail-info card">
          <h1 className="product-detail-title">{product.model}</h1>
          <p>{product.name}</p>
          <p className="muted">
            {tProducts('category')}：{categoryData.name}
          </p>
          <div className="spec-list">
            {product.specifications.map((spec: string) => (
              <span key={spec} className="spec-chip">
                {spec}
              </span>
            ))}
          </div>
          {product.vehicleModels?.length ? (
            <div className="product-fitment" data-testid="product-fitment">
              <h2 className="product-fitment__title">{localized(localeValue, { 'zh-TW': '適用車型', 'zh-CN': '适用车型', en: 'Fits' })}</h2>
              <div className="spec-list">
                {product.vehicleModels.map((name: string) => (
                  <Link key={name} className="spec-chip" href={`/${localeValue}/products/search?q=${encodeURIComponent(name)}`}>
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          {product.oemNumbers?.length ? (
            <div className="product-fitment" data-testid="product-oem">
              <h2 className="product-fitment__title">{localized(localeValue, { 'zh-TW': 'OEM／對照料號', 'zh-CN': 'OEM／对照料号', en: 'OEM / Cross reference' })}</h2>
              <div className="spec-list">
                {product.oemNumbers.map((number: string) => (
                  <Link key={number} className="spec-chip" href={`/${localeValue}/products/search?q=${encodeURIComponent(number)}`}>
                    {number}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          <p className="muted">
            {/* 不公開精確庫存數字，只顯示供貨狀態（P3） */}
            {tProducts('availability')}：{product.stock > 0 ? tProducts('inStock') : tProducts('madeToOrder')}
          </p>

          {/* D15：數量與「加入詢價清單」放在規格、庫存下方，不用捲動就看得到 */}
          <InquiryForm
            productId={product.id}
            productModel={product.model}
            productName={product.name}
            categorySlug={categoryData.slug}
            subCategorySlug={subCategoryData.slug}
          />

          <p style={{ margin: 'auto 0 0' }}>
            <Link className="text-link" href={`/${localeValue}/products/${encodeSegment(categoryData.slug)}/${encodeURIComponent(subCategoryData.slug)}`}>
              ← {localized(localeValue, { 'zh-TW': '返回', 'zh-CN': '返回', en: 'Back to' })} {subCategoryData.name}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export const revalidate = 300;

// 建置時最多預先產生幾個產品（每個語言各一頁），其餘第一次被瀏覽時再產生並快取（ISR），避免產品很多時建置過久
const PRERENDER_PRODUCT_LIMIT = 100;

// 沒有 generateStaticParams 時，Next 會把這個動態路由當成「每次都現場渲染」（回應標頭 private, no-store），
// 補上後才會進入 ISR，由 CDN 快取 5 分鐘。讀取失敗或沒設資料庫時回傳空陣列，不可讓建置失敗
export async function generateStaticParams() {
  try {
    const products = (await getCatalogProducts('en')).filter((product) => product.subCategory && product.category);
    return locales.flatMap((locale) =>
      products.slice(0, PRERENDER_PRODUCT_LIMIT).map((product) => ({
        locale,
        category: product.category as string,
        subCategory: product.subCategory,
        modelNumber: product.slug ?? product.model
      }))
    );
  } catch (error) {
    console.error('[catalog] generateStaticParams failed:', error instanceof Error ? error.message : error);
    return [];
  }
}
