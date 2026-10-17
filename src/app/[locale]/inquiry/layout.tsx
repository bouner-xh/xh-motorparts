import type {Metadata} from 'next';
import {buildPageMetadata} from '@/lib/page-seo';

// 詢價頁是用戶端元件，無法輸出 metadata，改由這個 layout 設定標題、描述、canonical 與 hreflang（D14、OP-06）
export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  return buildPageMetadata(locale, 'inquiry', '/inquiry');
}

export default function InquiryLayout({children}: {children: React.ReactNode}) {
  return children;
}
