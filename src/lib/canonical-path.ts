// 網址大小寫不同時，找出正確寫法（例如 /products/Transmission → /products/transmission）
// 純函式、不依賴資料庫，頁面找不到資料時用來決定要不要轉址（tests/admin/canonical-path.test.mts）

export interface CanonicalCatalog {
  categories: string[];
  subCategories: Array<{categorySlug: string; slug: string}>;
  products: Array<{category: string; subCategory: string; model: string}>;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// segments：已解碼的 [大分類, 子分類?, 型號?]。每一段都找得到、且寫法與網址不同時，回傳正確的片段；否則回傳 null
export function matchCanonicalSegments(catalog: CanonicalCatalog, segments: string[]): string[] | null {
  const [category, subCategory, model] = segments;
  const canonCategory = catalog.categories.find((key) => same(key, category));
  if (!canonCategory) return null;
  const result = [canonCategory];

  if (subCategory !== undefined) {
    const sub = catalog.subCategories.find((item) => item.categorySlug === canonCategory && same(item.slug, subCategory));
    if (!sub) return null;
    result.push(sub.slug);

    if (model !== undefined) {
      const product = catalog.products.find((item) => item.category === canonCategory && item.subCategory === sub.slug && same(item.model, model));
      if (!product) return null;
      result.push(product.model);
    }
  }

  return result.every((value, index) => value === segments[index]) ? null : result;
}
