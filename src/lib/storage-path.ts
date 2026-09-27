// 從 Supabase Storage 的公開網址取出檔案路徑（A5）
// 例：https://xxx.supabase.co/storage/v1/object/public/product-images/products/2026-09-27/a.jpg
//   → products/2026-09-27/a.jpg
// 不是這個儲存空間的網址（例如舊版放在網站內的圖片）回傳 null，不會被刪除
export function storageObjectPath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  const objectPath = decodeURIComponent(url.slice(index + marker.length).split(/[?#]/)[0]);
  if (!objectPath || objectPath.includes('..')) return null;
  return objectPath;
}
