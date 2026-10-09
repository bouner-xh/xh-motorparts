import {type Locale} from '@/lib/catalog';
import type { IconName } from '@/components/ui/Icon';

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
    items: Array<{ icon: IconName; title: string; description: string }>;
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
      title: '摩托車核心零件，依品類一站查詢',
      subtitle: '從引擎內部到傳動系統，我們的產品線只有一個設計邏輯：讓採購商不需要東奔西跑，一站解決。'
    },
    whyChooseUs: {
      title: '全球採購商選擇協皇的理由，不是因為我們最便宜。',
      items: [
        { icon: 'factory', title: '台灣製造', description: '自有工廠生產，品質直接管控，非貿易商轉手' },
        { icon: 'clipboard', title: '規格透明', description: '每款產品提供完整技術規格書與材質報告' },
        { icon: 'wrench', title: 'OEM 支援', description: '接受圖面打樣與客製化訂單，彈性配合需求' },
        { icon: 'globe', title: '出口經驗', description: '長期供應東南亞、中東、南美等市場' },
        { icon: 'chat', title: '溝通效率', description: '業務團隊具備英語能力，24 小時內回覆詢價' },
        { icon: 'package', title: '小量試單', description: '新客戶友善，支援小批量試單驗證品質' }
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
      title: '摩托车核心零件，按品类一站查询',
      subtitle: '从引擎内部到传动系统，我们的产品线只有一个设计逻辑：让采购商不需要东奔西跑，一站解决。'
    },
    whyChooseUs: {
      title: '全球采购商选择协皇的理由，不是因为我们最便宜。',
      items: [
        { icon: 'factory', title: '台湾制造', description: '自有工厂生产，质量直接管控，非贸易商转手' },
        { icon: 'clipboard', title: '规格透明', description: '每款产品提供完整技术规格书与材质报告' },
        { icon: 'wrench', title: 'OEM 支持', description: '接受图面打样与定制化订单，弹性配合需求' },
        { icon: 'globe', title: '出口经验', description: '长期供应东南亚、中东、南美等市场' },
        { icon: 'chat', title: '沟通效率', description: '业务团队具备英语能力，24 小时内回复询价' },
        { icon: 'package', title: '小量试单', description: '新客户友善，支持小批量试单验证质量' }
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
      title: 'Core Motorcycle Parts, Organized by Category',
      subtitle: 'From engine internals to transmission systems, our product line is designed around one idea: letting buyers find what they need in one place.'
    },
    whyChooseUs: {
      title: 'The reason global buyers choose Xie Huang is not because we are the cheapest.',
      items: [
        { icon: 'factory', title: 'Made in Taiwan', description: 'Own factory production, direct quality control, no middlemen.' },
        { icon: 'clipboard', title: 'Transparent Specs', description: 'Complete technical specifications and material reports for every product.' },
        { icon: 'wrench', title: 'OEM Support', description: 'Accepting drawing samples and customized orders, flexible to your needs.' },
        { icon: 'globe', title: 'Export Experience', description: 'Long-term supply to Southeast Asia, Middle East, South America, and more.' },
        { icon: 'chat', title: 'Communication', description: 'English-capable sales team, guaranteed inquiry response within 24 hours.' },
        { icon: 'package', title: 'Trial Orders', description: 'Friendly to new customers, supporting small-batch trial orders to verify quality.' }
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
    value: '1990',
    label: {'zh-TW': '創立於', 'zh-CN': '创立于', en: 'Established'}
  },
  {
    value: 'Worldwide',
    label: {'zh-TW': '出口市場', 'zh-CN': '出口市场', en: 'Export markets'}
  },
  {
    value: 'OEM / ODM',
    label: {'zh-TW': '歡迎客製訂單', 'zh-CN': '欢迎定制订单', en: 'Custom orders welcome'}
  }
];

export const aboutContent: Record<Locale, {
  sections: Array<{title: string; body: string}>;
  markets: string[];
}> = {
  'zh-TW': {
    sections: [
      {
        title: '1990 年起專注摩托車內部零組件',
        body: '協皇企業有限公司位於台灣台中，自 1990 年起生產摩托車內部零組件，供貨給全球採購商。'
      },
      {
        title: '歡迎 OEM／ODM 訂製',
        body: '提供圖面、樣品或料號，我們會評估可行性並報價。'
      },
      {
        title: '彈性訂購、條件清楚',
        body: '最低訂購量、交期與付款方式皆可彈性安排，報價時確認。詳見「聯絡我們」頁的訂購資訊。'
      }
    ],
    markets: ['全球']
  },
  'zh-CN': {
    sections: [
      {
        title: '1990 年起专注摩托车内部零部件',
        body: '协皇企业有限公司位于台湾台中，自 1990 年起生产摩托车内部零部件，供货给全球采购商。'
      },
      {
        title: '欢迎 OEM／ODM 定制',
        body: '提供图纸、样品或料号，我们会评估可行性并报价。'
      },
      {
        title: '灵活订购、条件清楚',
        body: '最低订购量、交期与付款方式均可灵活安排，报价时确认。详见“联系我们”页的订购信息。'
      }
    ],
    markets: ['全球']
  },
  en: {
    sections: [
      {
        title: 'Motorcycle internal components since 1990',
        body: 'Based in Taichung, Taiwan, Xie Huang Enterprise Co., Ltd. has manufactured motorcycle internal components since 1990 and supplies buyers worldwide.'
      },
      {
        title: 'OEM / ODM welcome',
        body: 'Send us your drawings, samples or part numbers and we will review feasibility and quote.'
      },
      {
        title: 'Flexible orders, clear terms',
        body: 'Minimum quantities, lead times and payment terms are flexible and confirmed when we quote. See Ordering Information on the Contact page.'
      }
    ],
    markets: ['Worldwide']
  }
};

export const contactMeta: Record<Locale, {hours: string; note: string}> = {
  'zh-TW': {
    hours: '週一至週五 09:00 - 18:00（台灣時間，GMT+8）',
    note: '若需詢價，建議先提供型號、規格與需求數量。我們會在工作日 24 小時內回覆。'
  },
  'zh-CN': {
    hours: '周一至周五 09:00 - 18:00（台湾时间，GMT+8）',
    note: '如需询价，建议先提供型号、规格与需求数量。我们会在工作日 24 小时内回复。'
  },
  en: {
    hours: 'Mon-Fri, 09:00 - 18:00 (Taiwan time, GMT+8)',
    note: 'For faster quotes, please include the model number, specification and quantity. We reply within 24 hours on business days.'
  }
};

// 訂購資訊（聯絡頁）：內容依老闆 2026-10-09 提供的資料與確認的寫法，見 docs/english-copy-draft.md
export const orderingInfo: Record<Locale, {title: string; items: Array<{title: string; body: string}>}> = {
  'zh-TW': {
    title: '訂購資訊',
    items: [
      { title: '最低訂購量', body: '彈性安排，請告訴我們需求，我們會配合訂單規劃合適的數量。' },
      { title: '交期', body: '依訂單確認；可接急單，詢價時請註明需要的日期。' },
      { title: '付款方式', body: '可使用 T/T、L/C、PayPal，報價時確認。' },
      { title: '貿易條件', body: 'FOB、EXW 或 CIF，下單時確認。常用出貨港為台灣台中港。' },
      { title: '包裝', body: '零件做好防鏽處理，以出口紙箱包裝；可依需求使用棧板或客製包裝。' },
      { title: '出貨前檢驗', body: '每批訂單出貨前都會檢驗，可提供檢驗照片。' },
      { title: '保固與退換貨', body: '收到瑕疵或錯誤品項，請於收貨後 30 天內附照片通知，確認後我們會換貨或退款。' }
    ]
  },
  'zh-CN': {
    title: '订购信息',
    items: [
      { title: '最低订购量', body: '灵活安排，请告诉我们需求，我们会配合订单规划合适的数量。' },
      { title: '交期', body: '依订单确认；可接急单，询价时请注明需要的日期。' },
      { title: '付款方式', body: '可使用 T/T、L/C、PayPal，报价时确认。' },
      { title: '贸易条件', body: 'FOB、EXW 或 CIF，下单时确认。常用出货港为台湾台中港。' },
      { title: '包装', body: '零件做好防锈处理，以出口纸箱包装；可依需求使用托盘或定制包装。' },
      { title: '出货前检验', body: '每批订单出货前都会检验，可提供检验照片。' },
      { title: '质保与退换货', body: '收到瑕疵或错误品项，请于收货后 30 天内附照片通知，确认后我们会换货或退款。' }
    ]
  },
  en: {
    title: 'Ordering Information',
    items: [
      { title: 'Minimum order quantity', body: 'Flexible. Tell us what you need and we will work out a quantity that suits your order.' },
      { title: 'Lead time', body: 'Confirmed per order. Rush orders are possible; please state your required date in the inquiry.' },
      { title: 'Payment', body: 'T/T, L/C and PayPal are available. Terms are confirmed when we quote.' },
      { title: 'Trade terms', body: 'FOB, EXW or CIF, confirmed when the order is placed. Our usual port of shipment is Taichung Port, Taiwan.' },
      { title: 'Packaging', body: 'Parts are rust-protected and shipped in export cartons. Pallets or custom packing on request.' },
      { title: 'Inspection', body: 'Every order is inspected before shipment. Inspection photos are available on request.' },
      { title: 'Warranty and returns', body: 'If you receive defective or incorrect items, tell us within 30 days of receipt with photos. After we confirm the issue, we will replace the items or refund you.' }
    ]
  }
};

export const privacyChecklist: Record<Locale, string[]> = {
  'zh-TW': ['Cookie 同意後才啟用分析腳本', '詢價資料僅用於回覆商務需求', '後續將補齊正式法遵條款與資料保存說明'],
  'zh-CN': ['Cookie 同意后才启用分析脚本', '询价资料仅用于回复商务需求', '后续将补齐正式合规条款与资料保存说明'],
  en: ['Analytics scripts are intended to run after consent is granted', 'Inquiry data is only used to respond to business requests', 'Formal compliance and retention wording will be expanded next']
};
