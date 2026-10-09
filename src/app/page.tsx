import { redirect } from 'next/navigation';

export default function Page() {
  // 預設英文：主要客戶是國際買家；中文版請用 /zh-TW、/zh-CN 開頭的網址或頁面上的語言切換
  redirect('/en');
}
