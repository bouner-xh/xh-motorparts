import {type Locale} from '@/lib/catalog';

export const heroContent: Record<Locale, {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  trustPoints: string[];
}> = {
  'zh-TW': {
    eyebrow: '台灣摩托車零件製造商',
    title: '以工業質感重塑摩托車零件產品目錄',
    subtitle: '從汽缸、鏈條到油封與線材，提供可分享、可索引、可詢價的多語產品展示體驗。',
    primaryCta: '查看產品目錄',
    secondaryCta: '了解公司資訊',
    trustPoints: ['30+ 年產業經驗', '多語產品目錄', '支援 B2B 詢價流程']
  },
  'zh-CN': {
    eyebrow: '台湾摩托车零件制造商',
    title: '以工业质感重塑摩托车零件产品目录',
    subtitle: '从汽缸、链条到油封与线材，提供可分享、可索引、可询价的多语产品展示体验。',
    primaryCta: '查看产品目录',
    secondaryCta: '了解公司信息',
    trustPoints: ['30+ 年产业经验', '多语产品目录', '支持 B2B 询价流程']
  },
  en: {
    eyebrow: 'Taiwan Motorcycle Parts Manufacturer',
    title: 'A more modern industrial catalog for motorcycle parts',
    subtitle: 'From cylinders and chains to oil seals and cables, the new site is built for multilingual discovery, shareable links and B2B inquiry workflows.',
    primaryCta: 'Browse catalog',
    secondaryCta: 'Learn about us',
    trustPoints: ['30+ years of industry experience', 'Multilingual product catalog', 'B2B inquiry-ready workflow']
  }
};

export const sharedStats: Array<{value: string; label: Record<Locale, string>}> = [
  {
    value: '9',
    label: {
      'zh-TW': '核心產品分類',
      'zh-CN': '核心产品分类',
      en: 'Core categories'
    }
  },
  {
    value: '35+',
    label: {
      'zh-TW': '可預覽產品項目',
      'zh-CN': '可预览产品项目',
      en: 'Previewable products'
    }
  },
  {
    value: '3',
    label: {
      'zh-TW': '語系版本',
      'zh-CN': '语系版本',
      en: 'Language versions'
    }
  }
];

export const aboutContent: Record<Locale, {
  sections: Array<{title: string; body: string}>;
  markets: string[];
}> = {
  'zh-TW': {
    sections: [
      {
        title: '專注摩托車零件供應',
        body: '新版網站以「產品可查、資訊可信、詢價順暢」為核心，逐步從舊版靜態目錄遷移到現代化架構。'
      },
      {
        title: '以 B2B 信任感為主軸',
        body: '除了產品型號與規格，未來將持續補齊公司介紹、出口市場、品質保證與 CRM 詢價流程。'
      }
    ],
    markets: ['Taiwan', 'Southeast Asia', 'Europe']
  },
  'zh-CN': {
    sections: [
      {
        title: '专注摩托车零件供应',
        body: '新版网站以“产品可查、信息可信、询价顺畅”为核心，逐步从旧版静态目录迁移到现代化架构。'
      },
      {
        title: '以 B2B 信任感为主轴',
        body: '除了产品型号与规格，后续将持续补齐公司介绍、出口市场、质量保证与 CRM 询价流程。'
      }
    ],
    markets: ['Taiwan', 'Southeast Asia', 'Europe']
  },
  en: {
    sections: [
      {
        title: 'Focused on motorcycle parts supply',
        body: 'The new site is being rebuilt around product discoverability, trust and a smoother inquiry flow while preserving the legacy catalog.'
      },
      {
        title: 'Built for B2B credibility',
        body: 'Beyond model numbers and specs, the site is prepared for company profile content, export market trust signals and CRM-style inquiry handling.'
      }
    ],
    markets: ['Taiwan', 'Southeast Asia', 'Europe']
  }
};

export const contactMeta: Record<Locale, {hours: string; note: string}> = {
  'zh-TW': {
    hours: '週一至週五 09:00 - 18:00',
    note: '若需詢價，建議先提供型號、規格與需求數量。'
  },
  'zh-CN': {
    hours: '周一至周五 09:00 - 18:00',
    note: '如需询价，建议先提供型号、规格与需求数量。'
  },
  en: {
    hours: 'Mon-Fri 09:00 - 18:00',
    note: 'For faster inquiries, please include model number, specification and quantity.'
  }
};

export const privacyChecklist: Record<Locale, string[]> = {
  'zh-TW': ['Cookie 同意後才啟用分析腳本', '詢價資料僅用於回覆商務需求', '後續將補齊正式法遵條款與資料保存說明'],
  'zh-CN': ['Cookie 同意后才启用分析脚本', '询价资料仅用于回复商务需求', '后续将补齐正式合规条款与资料保存说明'],
  en: ['Analytics scripts are intended to run after consent is granted', 'Inquiry data is only used to respond to business requests', 'Formal compliance and retention wording will be expanded next']
};
