import Link from 'next/link';
import type { CategoryKey, Locale } from '@/lib/catalog';
import { getCategorySummaries, getSubCategories, type SubCategorySummary } from '@/lib/catalog-service';

interface SubCategoryMap {
  [category: string]: SubCategorySummary[];
}

export async function CategorySidebar({
  locale,
  activeCategory,
  activeSubCategory
}: {
  locale: Locale;
  activeCategory?: CategoryKey;
  activeSubCategory?: string;
}) {
  const categories = await getCategorySummaries(locale);

  // 預先載入當前活躍分類的子目錄
  const subCategoryMap: SubCategoryMap = {};
  if (activeCategory) {
    subCategoryMap[activeCategory] = await getSubCategories(activeCategory, locale);
  }

  return (
    <aside className="category-sidebar card">
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
                href={`/${locale}/products/${category}`}
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
                        href={`/${locale}/products/${category}/${encodeURIComponent(sub.slug)}`}
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
