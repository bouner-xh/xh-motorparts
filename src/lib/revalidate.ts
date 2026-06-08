import { revalidatePath } from 'next/cache';

/**
 * 確保清除前台所有語系目錄與產品頁面的靜態快取
 */
export function revalidateCatalog() {
  try {
    revalidatePath('/[locale]/products', 'layout');
    revalidatePath('/[locale]/products/[category]', 'layout');
    revalidatePath('/', 'layout');
  } catch (error) {
    console.error('Failed to revalidate paths:', error);
  }
}
