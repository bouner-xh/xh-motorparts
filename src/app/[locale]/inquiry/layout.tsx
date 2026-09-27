import type {Metadata} from 'next';
import {localeAlternates} from '@/lib/site';

// 詢價頁是用戶端元件，無法輸出 metadata，改由這個 layout 設定 canonical 與 hreflang（D14）
export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  return {alternates: localeAlternates(locale, '/inquiry')};
}

export default function InquiryLayout({children}: {children: React.ReactNode}) {
  return children;
}
