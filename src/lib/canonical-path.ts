// 網址大小寫不同時，找出正確寫法（例如 /products/Transmission → /products/transmission）
// 純函式、不依賴資料庫，頁面找不到資料時用來決定要不要轉址（tests/admin/canonical-path.test.mts）

export interface CanonicalCatalog {
  categories: string[];
  subCategories: Array<{categorySlug: string; slug: string}>;
  // slug：網址代號（型號可重複時用來區分）；沒有時用型號
  products: Array<{category: string; subCategory: string; model: string; slug?: string}>;
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

    if (model === undefined) {
      if (!sub) return null;
      result.push(sub.slug);
    } else {
      const inSub = sub && catalog.products.find((item) => item.category === canonCategory && item.subCategory === sub.slug && same(item.slug ?? item.model, model));
      if (inSub) {
        result.push(sub.slug, inSub.slug ?? inSub.model);
      } else {
        // 子分類改過代號、被刪除，或產品搬到別的子分類：同一個大分類裡只有一個產品符合時，轉到它現在的網址
        const matches = catalog.products.filter((item) => item.category === canonCategory && item.subCategory && same(item.slug ?? item.model, model));
        if (matches.length !== 1) return null;
        result.push(matches[0].subCategory, matches[0].slug ?? matches[0].model);
      }
    }
  }

  return result.every((value, index) => value === segments[index]) ? null : result;
}
