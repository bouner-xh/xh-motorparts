import Link from 'next/link';
import {categoryKeys, categoryNames, type CategoryKey, type Locale} from '@/lib/catalog';

export function CategorySidebar({
  locale,
  activeCategory
}: {
  locale: Locale;
  activeCategory?: CategoryKey;
}) {
  return (
    <aside className="category-sidebar card">
      <p className="category-sidebar__label">Catalog</p>
      <ul className="category-sidebar__list">
        {categoryKeys.map((category) => (
          <li key={category}>
            <Link
              className={category === activeCategory ? 'category-sidebar__link is-active' : 'category-sidebar__link'}
              href={`/${locale}/products/${category}`}
            >
              {categoryNames[locale][category]}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
