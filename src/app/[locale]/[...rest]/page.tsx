import { notFound } from 'next/navigation';

// 語系之後任何沒有對應頁面的網址（例如 /en/zzz）都交給 [locale]/not-found.tsx，
// 這樣 404 頁也有站台頁首與頁尾；狀態碼仍是 404
export default function UnknownPage() {
  notFound();
}
