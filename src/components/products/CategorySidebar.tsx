import Link from 'next/link';
import type { CategoryKey, Locale } from '@/lib/catalog';
import { getCategorySummaries, getSubCategories, type SubCategorySummary } from '@/lib/catalog-service';
import { ProductSearchForm } from './ProductSearchForm';
import { encodeSegment } from '@/lib/url-segment';

interface SubCategoryMap {
  [category: string]: SubCategorySummary[];
}

export async function CategorySidebar({
  locale,
  activeCategory,
  activeSubCategory,
  searchValue = ''
}: {
  locale: Locale;
  activeCategory?: CategoryKey;
  activeSubCategory?: string;
  searchValue?: string;
}) {
  const [categories, activeSubs] = await Promise.all([
    getCategorySummaries(locale),
    activeCategory ? getSubCategories(activeCategory, locale) : Promise.resolve([])
  ]);

  const subCategoryMap: SubCategoryMap = {};
  if (activeCategory) {
    subCategoryMap[activeCategory] = activeSubs;
  }

  return (
    <aside className="category-sidebar card">
      {/* 產品搜尋（P2）：所有產品列表頁的側欄最上方 */}
      <ProductSearchForm locale={locale} defaultValue={searchValue} />
      <p className="category-sidebar__label">Catalog</p>
      <ul className="category-sidebar__list">
        {categories.map((c) => {
          const category = c.key;
          const isActive = category === activeCategory;
          const subs = subCategoryMap[category] || [];

          return (
            <li key={category}>
              <Link
                className={isActive ? 'category-sidebar__link is-active' : 'category-sidebar__link'}
                href={`/${locale}/products/${encodeSegment(category)}`}
              >
                {c.name}
                {isActive && subs.length > 0 && (
                  <span className="category-sidebar__arrow">▾</span>
                )}
              </Link>

              {isActive && subs.length > 0 && (
                <ul className="category-sidebar__sublist">
                  {subs.map((sub) => (
                    <li key={sub.id}>
                      <Link
                        className={
                          activeSubCategory === sub.slug
                            ? 'category-sidebar__sublink is-active'
                            : 'category-sidebar__sublink'
                        }
                        href={`/${locale}/products/${encodeSegment(category)}/${encodeSegment(sub.slug)}`}
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
