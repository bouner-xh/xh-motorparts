import {type Locale} from '@/lib/catalog';

export const homeContent: Record<Locale, {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  brandBelief: {
    title: string;
    body: string[];
  };
  categoryIntro: {
    title: string;
    subtitle: string;
  };
  whyChooseUs: {
    title: string;
    items: Array<{ icon: string; title: string; description: string }>;
  };
  inquiryFlow: {
    title: string;
    steps: Array<{ step: string; title: string; desc: string }>;
    conclusion: string;
  };
}> = {
  'zh-TW': {
    hero: {
      eyebrow: '台灣摩托車零件製造商',
      title: '三十年前，我們只做一個承諾：\n每一個零件，都要對得起裝上它的那輛車。',
      subtitle: '協皇企業從台灣出發，在一個沒有人會注意到你名字的產業裡，用三十年的時間，讓品質替我們說話。',
      primaryCta: '查看產品目錄',
      secondaryCta: '公司資訊',
    },
    brandBelief: {
      title: '我們不是最大的，但我們是最認真的。',
      body: [
        '摩托車零件產業裡，有太多廠商以價格競爭。',
        '我們選擇用不同的方式存活下來——',
        '對原料嚴格，對工序誠實，對客戶負責。',
        '三十年來，我們拒絕過削價競爭，',
        '拒絕過以次充好的原料供應商，',
        '也拒絕過我們認為無法保證品質的訂單。',
        '這些「拒絕」讓我們損失了一些生意，',
        '卻讓我們留住了最重要的東西：',
        '那些每年回來找我們的採購夥伴。'
      ]
    },
    categoryIntro: {
      title: '9 大品類，涵蓋摩托車核心零件需求',
      subtitle: '從引擎內部到傳動系統，從密封件到電氣線材，我們的產品線設計只有一個邏輯：讓採購商不需要東奔西跑，一站解決。'
    },
    whyChooseUs: {
      title: '全球採購商選擇協皇的理由，不是因為我們最便宜。',
      items: [
        { icon: '🏭', title: '台灣製造', description: '自有工廠生產，品質直接管控，非貿易商轉手' },
        { icon: '📋', title: '規格透明', description: '每款產品提供完整技術規格書與材質報告' },
        { icon: '🔧', title: 'OEM 支援', description: '接受圖面打樣與客製化訂單，彈性配合需求' },
        { icon: '🌍', title: '出口經驗', description: '長期供應東南亞、中東、南美等市場' },
        { icon: '💬', title: '溝通效率', description: '業務團隊具備英語能力，24 小時內回覆詢價' },
        { icon: '📦', title: '小量試單', description: '新客戶友善，支援小批量試單驗證品質' }
      ]
    },
    inquiryFlow: {
      title: '開始合作，比你想像的簡單。',
      steps: [
        { step: 'Step 1', title: '瀏覽產品目錄', desc: '確認所需型號與規格' },
        { step: 'Step 2', title: '填寫詢價表單', desc: '告知數量需求與交期要求' },
        { step: 'Step 3', title: '24小時內收到報價', desc: '業務直接與您對接，確認細節後安排出貨' }
      ],
      conclusion: '不需要繁複的採購流程，我們相信好的合作關係從一次誠實的報價開始。'
    }
  },
  'zh-CN': {
    hero: {
      eyebrow: '台湾摩托车零件制造商',
      title: '三十年前，我们只做一个承诺：\n每一个零件，都要对得起装上它的那辆车。',
      subtitle: '协皇企业从台湾出发，在一个没有人会注意到你名字的产业里，用三十年的时间，让品质替我们说话。',
      primaryCta: '查看产品目录',
      secondaryCta: '公司信息',
    },
    brandBelief: {
      title: '我们不是最大的，但我们是最认真的。',
      body: [
        '摩托车零件产业里，有太多厂商以价格竞争。',
        '我们选择用不同的方式存活下来——',
        '对原料严格，对工序诚实，对客户负责。',
        '三十年来，我们拒绝过削价竞争，',
        '拒绝过以次充好的原料供应商，',
        '也拒绝过我们认为无法保证质量的订单。',
        '这些“拒绝”让我们损失了一些生意，',
        '却让我们留住了最重要的东西：',
        '那些每年回来找我们的采购伙伴。'
      ]
    },
    categoryIntro: {
      title: '9 大品类，涵盖摩托车核心零件需求',
      subtitle: '从引擎内部到传动系统，从密封件到电气线材，我们的产品线设计只有一个逻辑：让采购商不需要东奔西跑，一站解决。'
    },
    whyChooseUs: {
      title: '全球采购商选择协皇的理由，不是因为我们最便宜。',
      items: [
        { icon: '🏭', title: '台湾制造', description: '自有工厂生产，质量直接管控，非贸易商转手' },
        { icon: '📋', title: '规格透明', description: '每款产品提供完整技术规格书与材质报告' },
        { icon: '🔧', title: 'OEM 支持', description: '接受图面打样与定制化订单，弹性配合需求' },
        { icon: '🌍', title: '出口经验', description: '长期供应东南亚、中东、南美等市场' },
        { icon: '💬', title: '沟通效率', description: '业务团队具备英语能力，24 小时内回复询价' },
        { icon: '📦', title: '小量试单', description: '新客户友善，支持小批量试单验证质量' }
      ]
    },
    inquiryFlow: {
      title: '开始合作，比你想像的简单。',
      steps: [
        { step: 'Step 1', title: '浏览产品目录', desc: '确认所需型号与规格' },
        { step: 'Step 2', title: '填写询价表单', desc: '告知数量需求与交期要求' },
        { step: 'Step 3', title: '24小时内收到报价', desc: '业务直接与您对接，确认细节后安排出货' }
      ],
      conclusion: '不需要繁复的采购流程，我们相信好的合作关系从一次诚实的报价开始。'
    }
  },
  'en': {
    hero: {
      eyebrow: 'Taiwan Motorcycle Parts Manufacturer',
      title: '30 years ago, we made one promise:\nEvery part must be worthy of the motorcycle it is installed on.',
      subtitle: 'Starting from Taiwan, in an industry where nobody notices your name, Xie Huang Enterprise has spent 30 years letting our quality speak for us.',
      primaryCta: 'Browse Catalog',
      secondaryCta: 'Company Info',
    },
    brandBelief: {
      title: 'We are not the largest, but we are the most dedicated.',
      body: [
        'In the motorcycle parts industry, too many manufacturers compete on price alone.',
        'We chose a different way to survive—',
        'Strict with materials, honest with processes, responsible to customers.',
        'Over the past 30 years, we have rejected price wars,',
        'rejected suppliers of substandard materials,',
        'and rejected orders where we could not guarantee quality.',
        'These "rejections" have cost us some business,',
        'but they allowed us to keep the most important thing:',
        'The purchasing partners who return to us year after year.'
      ]
    },
    categoryIntro: {
      title: '9 Major Categories, Covering Core Motorcycle Parts',
      subtitle: 'From engine internals to transmission systems, from seals to electrical cables, our product line is designed with one logic: allowing buyers to solve everything in one stop.'
    },
    whyChooseUs: {
      title: 'The reason global buyers choose Xie Huang is not because we are the cheapest.',
      items: [
        { icon: '🏭', title: 'Made in Taiwan', description: 'Own factory production, direct quality control, no middlemen.' },
        { icon: '📋', title: 'Transparent Specs', description: 'Complete technical specifications and material reports for every product.' },
        { icon: '🔧', title: 'OEM Support', description: 'Accepting drawing samples and customized orders, flexible to your needs.' },
        { icon: '🌍', title: 'Export Experience', description: 'Long-term supply to Southeast Asia, Middle East, South America, and more.' },
        { icon: '💬', title: 'Communication', description: 'English-capable sales team, guaranteed inquiry response within 24 hours.' },
        { icon: '📦', title: 'Trial Orders', description: 'Friendly to new customers, supporting small-batch trial orders to verify quality.' }
      ]
    },
    inquiryFlow: {
      title: 'Starting a partnership is simpler than you think.',
      steps: [
        { step: 'Step 1', title: 'Browse Catalog', desc: 'Confirm the required models and specifications.' },
        { step: 'Step 2', title: 'Submit Inquiry', desc: 'Inform us of your quantity needs and delivery requirements.' },
        { step: 'Step 3', title: 'Quote within 24 Hours', desc: 'Direct contact with our sales team to finalize details and arrange shipment.' }
      ],
      conclusion: 'No complicated procurement processes. We believe a good partnership begins with an honest quote.'
    }
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
