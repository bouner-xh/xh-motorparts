import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  categoryDescriptions,
  categoryKeys,
  categoryNames,
  locales,
  type CategoryKey,
  type Locale,
} from '@/lib/catalog';
import { getCategoryProducts } from '@/lib/catalog-service';
import { Breadcrumb } from '@/components/products/Breadcrumb';
import { CategorySidebar } from '@/components/products/CategorySidebar';
import { ProductCard } from '@/components/products/ProductCard';

export function generateStaticParams() {
  return locales.flatMap((locale) => categoryKeys.map((category) => ({ locale, category })));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  if (!locales.includes(locale as Locale) || !categoryKeys.includes(category as CategoryKey)) {
    notFound();
  }

  const localeValue = locale as Locale;
  const categoryValue = category as CategoryKey;
  const rows = await getCategoryProducts(categoryValue);
  setRequestLocale(localeValue);
  const tProducts = await getTranslations({ locale: localeValue, namespace: 'products' });
  const tNav = await getTranslations({ locale: localeValue, namespace: 'nav' });

  return (
    <main>
      <Breadcrumb
        items={[
          { label: tNav('home'), href: `/${localeValue}` },
          { label: tNav('products'), href: `/${localeValue}/products` },
          { label: categoryNames[localeValue][categoryValue] },
        ]}
      />

      <div className="section-heading">
        <div>
          <h2 className="page-title">{categoryNames[localeValue][categoryValue]}</h2>
          <p className="muted page-lead">{categoryDescriptions[localeValue][categoryValue]}</p>
        </div>
      </div>

      <div className="page-grid">
        <CategorySidebar locale={localeValue} activeCategory={categoryValue} />

        <section className="card-grid">
          {rows.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              href={`/${localeValue}/products/${categoryValue}/${encodeURIComponent(product.model)}`}
              specLabel={tProducts('specifications')}
              detailLabel={tProducts('viewDetail')}
            />
          ))}
        </section>
      </div>
    </main>
  );
}
