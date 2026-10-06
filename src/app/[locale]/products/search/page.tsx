import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {locales, type Locale} from '@/lib/catalog';
import {searchCatalogProducts} from '@/lib/catalog-service';
import {normalizeQuery} from '@/lib/product-search';
import {CategorySidebar} from '@/components/products/CategorySidebar';
import {ProductCard} from '@/components/products/ProductCard';
import {ProductSearchForm} from '@/components/products/ProductSearchForm';
import { encodeSegment } from '@/lib/url-segment';

// 前台產品搜尋結果（P2）：每次依關鍵字查詢，不做靜態快取；搜尋結果頁不給搜尋引擎收錄
export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale: locale as Locale, namespace: 'products'});
  return {title: t('searchTitle'), robots: {index: false, follow: true}};
}

export default async function ProductSearchPage({
  params,
  searchParams
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{q?: string | string[]}>;
}) {
  const {locale} = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const localeValue = locale as Locale;
  setRequestLocale(localeValue);

  const query = normalizeQuery((await searchParams).q);
  const t = await getTranslations({locale: localeValue, namespace: 'products'});
  const results = query ? await searchCatalogProducts(query, localeValue) : [];

  return (
    <main>
      <div className="section-heading">
        <div>
          <h1 className="page-title">{t('searchTitle')}</h1>
          <p className="muted page-lead" data-testid="search-summary">
            {query ? t('searchFor', {query, count: results.length}) : t('searchPrompt')}
          </p>
        </div>
      </div>

      <div className="page-grid">
        <CategorySidebar locale={localeValue} searchValue={query} />

        <section className="card-grid">
          {results.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              href={
                product.subCategory
                  ? `/${localeValue}/products/${encodeSegment(product.category)}/${encodeURIComponent(product.subCategory)}/${encodeURIComponent(product.model)}`
                  : `/${localeValue}/products/${encodeSegment(product.category)}`
              }
              specLabel={t('specifications')}
              detailLabel={t('viewDetail')}
              locale={localeValue}
              categorySlug={product.category}
              subCategorySlug={product.subCategory}
            />
          ))}
          {query && results.length === 0 ? (
            <div className="card search-empty" style={{gridColumn: '1 / -1'}}>
              <p>{t('searchEmpty', {query})}</p>
              <ProductSearchForm locale={localeValue} defaultValue={query} />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
