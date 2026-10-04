import {getTranslations} from 'next-intl/server';
import type {Locale} from '@/lib/catalog';
import {MAX_QUERY_LENGTH} from '@/lib/product-search';

// 產品搜尋框（P2）：一般 GET 表單，不需要 JavaScript 也能用
export async function ProductSearchForm({locale, defaultValue = ''}: {locale: Locale; defaultValue?: string}) {
  const t = await getTranslations({locale, namespace: 'products'});
  return (
    <form className="product-search" role="search" action={`/${locale}/products/search`} method="get">
      <input
        type="search"
        name="q"
        aria-label={t('searchLabel')}
        placeholder={t('searchPlaceholder')}
        defaultValue={defaultValue}
        maxLength={MAX_QUERY_LENGTH}
        required
      />
      <button type="submit">{t('searchButton')}</button>
    </form>
  );
}
