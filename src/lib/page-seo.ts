import type {Metadata} from 'next';
import {locales, type Locale} from '@/lib/catalog';
import {getBaseUrl, localeAlternates} from '@/lib/site';

// 各頁自己的搜尋結果標題與描述（OP-06）。
// 文案只使用老闆已確認的事實；英文標題約 60 字內、描述 120–155 字，中文描述約 70 字內。
export type PageKey = 'home' | 'products' | 'about' | 'contact' | 'inquiry' | 'privacy';

const pageSeo: Record<Locale, Record<PageKey, {title: string; description: string}>> = {
  en: {
    home: {
      title: 'Motorcycle Parts Manufacturer in Taiwan | Xie Huang Enterprise',
      description:
        'Taichung-based maker of motorcycle internal parts since 1990: transmission, clutch, drum forks, sprockets, starter motors. OEM/ODM welcome; worldwide.'
    },
    products: {
      title: 'Motorcycle Parts Catalog | Xie Huang Enterprise',
      description:
        'Browse motorcycle internal parts by category, check model numbers and specifications, and add the parts you need to your inquiry list to request a quote.'
    },
    about: {
      title: 'About Us | Xie Huang Enterprise Co., Ltd.',
      description:
        'Founded in 1990 in Taichung, Taiwan, Xie Huang Enterprise makes motorcycle internal components for buyers in 20+ countries and welcomes OEM and ODM orders.'
    },
    contact: {
      title: 'Contact Us | Xie Huang Enterprise Co., Ltd.',
      description:
        'Reach our sales team at sales@xh-motorparts.com or WhatsApp +886 930 797 299. Open Mon-Fri 09:00-18:00 (GMT+8); we reply within 24 hours on working days.'
    },
    inquiry: {
      title: 'Request a Quote | Xie Huang Enterprise',
      description:
        'Send your parts inquiry list with quantities and requirements. We reply within 24 hours on working days; MOQ and lead time are discussed by case.'
    },
    privacy: {
      title: 'Privacy Policy | Xie Huang Enterprise',
      description:
        'How Xie Huang Enterprise handles inquiry information and website analytics, the third-party services this site uses, and how to contact us about your data.'
    }
  },
  'zh-TW': {
    home: {
      title: '台灣摩托車零件製造商｜協皇企業有限公司',
      description: '1990 年創立於台中，專注摩托車內部零組件：傳動、離合器、變速鼓撥叉、鏈輪、啟動馬達等。接受 OEM／ODM，出口全球。'
    },
    products: {
      title: '摩托車零件產品目錄｜協皇企業',
      description: '依類別瀏覽摩托車內部零組件，查看型號與規格，加入詢價清單即可一次詢價。'
    },
    about: {
      title: '關於我們｜協皇企業有限公司',
      description: '協皇企業 1990 年成立於台中，製造摩托車內部零組件，產品出口到 20 多個國家，接受 OEM／ODM 訂單。'
    },
    contact: {
      title: '聯絡我們｜協皇企業有限公司',
      description: 'sales@xh-motorparts.com／WhatsApp +886 930 797 299，週一至週五 09:00–18:00（GMT+8），工作日 24 小時內回覆。'
    },
    inquiry: {
      title: '詢價清單｜協皇企業有限公司',
      description: '把需要的零件加入詢價清單並填寫需求，業務會在工作日 24 小時內回覆。MOQ 與交期可依個案洽談。'
    },
    privacy: {
      title: '隱私政策｜協皇企業有限公司',
      description: '說明協皇企業如何處理詢價資料與網站分析資料、網站使用的第三方服務，以及如何就個人資料與我們聯絡。'
    }
  },
  'zh-CN': {
    home: {
      title: '台湾摩托车零件制造商｜协皇企业有限公司',
      description: '1990 年创立于台中，专注摩托车内部零部件：传动、离合器、变速鼓拨叉、链轮、启动马达等。接受 OEM／ODM，出口全球。'
    },
    products: {
      title: '摩托车零件产品目录｜协皇企业',
      description: '按类别浏览摩托车内部零部件，查看型号与规格，加入询价清单即可一次询价。'
    },
    about: {
      title: '关于我们｜协皇企业有限公司',
      description: '协皇企业 1990 年成立于台中，制造摩托车内部零部件，产品出口到 20 多个国家，接受 OEM／ODM 订单。'
    },
    contact: {
      title: '联系我们｜协皇企业有限公司',
      description: 'sales@xh-motorparts.com／WhatsApp +886 930 797 299，周一至周五 09:00–18:00（GMT+8），工作日 24 小时内回复。'
    },
    inquiry: {
      title: '询价清单｜协皇企业有限公司',
      description: '把需要的零件加入询价清单并填写需求，业务会在工作日 24 小时内回复。MOQ 与交期可依个案洽谈。'
    },
    privacy: {
      title: '隐私政策｜协皇企业有限公司',
      description: '说明协皇企业如何处理询价资料与网站分析资料、网站使用的第三方服务，以及如何就个人资料与我们联系。'
    }
  }
};

export const companyNameByLocale: Record<Locale, string> = {
  'zh-TW': '協皇企業有限公司',
  'zh-CN': '协皇企业有限公司',
  en: 'Xie Huang Enterprise Co., Ltd.'
};

// Open Graph 的語言格式是 en_US、zh_TW（底線）
const ogLocaleByLocale: Record<Locale, string> = {en: 'en_US', 'zh-TW': 'zh_TW', 'zh-CN': 'zh_CN'};

export function ogLocale(locale: string) {
  return ogLocaleByLocale[locale as Locale] ?? ogLocaleByLocale.en;
}

// 全站預設分享圖（src/app/opengraph-image.jpg、twitter-image.jpg，1200×630）。
// 頁面自己設了 openGraph／twitter 就不會再自動帶入檔案慣例的圖，所以要明確列出；
// 相對網址由 layout 的 metadataBase 補成完整網址
export const defaultShareImage = {url: '/opengraph-image.jpg', width: 1200, height: 630, alt: 'Xie Huang Enterprise - Since 1990, Taichung, Taiwan'};
export const defaultTwitterImage = '/twitter-image.jpg';

function isLocale(locale: string): locale is Locale {
  return (locales as readonly string[]).includes(locale);
}

// 頁面的 metadata：標題、描述、canonical／hreflang，並帶上與全站一致的分享預覽設定。
// （Next.js 的 openGraph 不會與 layout 合併，頁面自己設了就要補齊 type／siteName／locale）
export function buildPageMetadata(locale: string, key: PageKey, path = ''): Metadata {
  const safeLocale: Locale = isLocale(locale) ? locale : 'en';
  const {title, description} = pageSeo[safeLocale][key];
  return {
    title,
    description,
    alternates: localeAlternates(locale, path),
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${getBaseUrl()}/${locale}${path}`,
      siteName: companyNameByLocale[safeLocale],
      locale: ogLocale(locale),
      images: [defaultShareImage]
    },
    twitter: {card: 'summary_large_image', title, description, images: [defaultTwitterImage]}
  };
}

export function getPageSeo(locale: string, key: PageKey) {
  return pageSeo[isLocale(locale) ? locale : 'en'][key];
}
