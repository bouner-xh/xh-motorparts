import { type Locale } from '@/lib/catalog';

export interface PrivacySection {
  title: string;
  content?: string;
  bullets?: string[];
  subsections?: Array<{
    title: string;
    body: string | string[];
  }>;
}

export interface ThirdPartyService {
  name: string;
  purpose: string;
  url: string;
}

export interface PrivacyContent {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: PrivacySection[];
  tableHeaders: {
    service: string;
    purpose: string;
    policy: string;
  };
  services: ThirdPartyService[];
}

export const privacyContent: Record<Locale, PrivacyContent> = {
  'zh-TW': {
    title: '隱私權保護政策',
    subtitle: '我們重視您的個人隱私與資料安全，並依循中華民國個人資料保護法及國際隱私標準保護您的資訊。',
    lastUpdated: '最後更新日期：2026 年 6 月',
    tableHeaders: {
      service: '服務名稱',
      purpose: '資料用途',
      policy: '隱私政策連結'
    },
    services: [
      { name: 'Cloudflare', purpose: '網站資安防護、流量負載與內容傳遞加速 (CDN)', url: 'cloudflare.com/privacypolicy' },
      { name: 'Cloudflare Turnstile', purpose: '詢價表單之機器人惡意防護與安全性驗證', url: 'cloudflare.com/privacypolicy' },
      { name: 'Vercel', purpose: '靜態網站主機托管、部署運行與效能優化服務', url: 'vercel.com/legal/privacy-policy' },
      { name: 'Supabase', purpose: '安全雲端資料庫儲存（包含分類、產品及系統資料）', url: 'supabase.com/privacy' },
      { name: 'Resend', purpose: '商務詢價電子郵件自動化遞送與通知服務', url: 'resend.com/legal/privacy-policy' }
    ],
    sections: [
      {
        title: '一、前言',
        content: '協皇企業有限公司（以下簡稱「本公司」或「我們」）非常重視您的個人資料保護。本隱私政策說明當您使用本網站（xh-motorparts.com）時，我們如何蒐集、使用、儲存及保護您的個人資料。使用本網站即表示您同意本隱私政策之內容。若您不同意，請勿繼續使用本網站。'
      },
      {
        title: '二、蒐集的資料類型',
        content: '當您瀏覽本網站或使用我們的商務詢價服務時，我們可能會蒐集以下類型的個人資料：',
        subsections: [
          {
            title: '1. 您主動提供的個人資料',
            body: [
              '聯絡人姓名與稱謂',
              '公司名稱、職稱及所在國家/地區',
              '電子郵件地址及聯絡電話',
              '詢價需求細節（包括產品型號、規格、訂購數量及其他留言內容）'
            ]
          },
          {
            title: '2. 系統自動蒐集的技術資料',
            body: [
              '網際網路協定（IP）位址與連線時間',
              '瀏覽器類型、版本、作業系統及裝置類型',
              '造訪頁面、瀏覽軌跡、停留時間與點擊紀錄',
              '來源網址（Referrer）與搜尋關鍵字'
            ]
          }
        ]
      },
      {
        title: '三、資料蒐集目的與使用方式',
        content: '本公司蒐集您的個人資料，僅限於以下特定的商務與營運目的，並遵循「最小化原則」處理：',
        bullets: [
          '處理、評估並回覆您的產品詢價與商務合作洽談需求',
          '寄送您所要求的產品目錄、規格書、報價單或樣品資訊',
          '提供售前諮詢、售後支援與客戶服務管道',
          '分析流量與使用者行為，以改善網站功能與使用者體驗',
          '配合法律義務、法規要求或防範網站惡意攻擊與詐欺行為'
        ]
      },
      {
        title: '四、資料分享與第三方服務',
        content: '本公司承諾絕不會出售、出租、交換或非法揭露您的個人資料給任何第三方。為維持網站安全與正常營運，我們委託以下符合國際資料安全標準的雲端服務供應商處理部分技術資料：'
      },
      {
        title: '五、資料儲存、保護與保存期限',
        content: '我們實施嚴格的安全防護措施以保護您的個人資料安全：',
        bullets: [
          '傳輸安全：本網站全面採用傳輸層安全協議（HTTPS - SSL/TLS 1.3）進行加密傳輸，防止資料於傳輸過程中遭竊聽或竄改。',
          '權限管制：本公司僅允許因業務運作需要、且經過授權的內部人員存取詢價資料，並設有嚴格的存取控制機制。',
          '保存期限：商務詢價資料將保存至雙方商務往來結束後 3 年，或直到您提出刪除要求為止。屆期後，系統將安全地予以刪除或進行不可逆之匿名化處理。',
          '外洩通報：若不幸發生資料安全性事件，我們將於發現後 72 小時內，依法通報主管機關，並透過您留下的聯絡方式通知受影響的當事人。'
        ]
      },
      {
        title: '六、Cookie 政策',
        content: '本網站使用 Cookie 及類似技術以提供您更流暢的瀏覽體驗。Cookie 是儲存在您裝置上的小型文字檔案。我們所使用的 Cookie 包含：',
        bullets: [
          '必要性 Cookie：確保網站基本操作與核心安全性功能（如安全驗證防護）正常運作，無法手動關閉。',
          '分析性 Cookie：在您同意的前提下，用於了解訪客的流量分布與瀏覽偏好，所有統計資料均經去識別化與匿名處理，僅用於改善網站服務。',
          '您可以透過瀏覽器的設定隨時清除、封鎖或限制 Cookie 的使用，但請注意，停用必要性 Cookie 可能導致網站部分功能無法正常運作。'
        ]
      },
      {
        title: '七、您的法定權利',
        content: '依據中華民國個人資料保護法及適用之國際隱私法規（如 GDPR），您對您的個人資料享有以下法定權利：',
        bullets: [
          '請求查詢或閱覽本公司所持有的個人資料',
          '請求製給個人資料的複製本',
          '請求補充或更正不精確、已變更的個人資料',
          '請求停止蒐集、處理或利用個人資料（除非法律規定必須保存）',
          '請求刪除您的個人資料（註銷權）'
        ],
        subsections: [
          {
            title: '行使權利管道',
            body: '如需行使上述任何權利，請隨時透過本政策第九條的聯絡方式與我們聯繫。本公司將於收到申請並核對身分後，於法定 15 個工作天內回覆處理結果。'
          }
        ]
      },
      {
        title: '八、未成年人保護',
        content: '本網站為專門提供全球採購商的 B2B 商業平台，我們不以未滿 18 歲之未成年人為服務對象。我們不會故意蒐集、儲存或利用任何未成年人的個人資料。'
      },
      {
        title: '九、聯絡我們',
        content: '若您對於本隱私政策、Cookie 設定或個人資料處理有任何疑問、申訴或建議，歡迎透過以下窗口與我們對接：',
        bullets: [
          '公司名稱：協皇企業有限公司',
          '電子郵件：bounerchang@gmail.com',
          '服務時間：週一至週五 09:00 - 18:00 (GMT+8)'
        ]
      },
      {
        title: '十、政策修訂與更新',
        content: '本公司保留隨時修訂與變更本隱私權政策的權利，以反映法律變更或本公司營運政策之調整。政策更新後，我們將於此頁面發布最新版本並更新最後修訂日期。對於有重大影響之修訂，我們亦將以電子郵件主動通知曾於本網站留下商務聯絡資訊的使用者。建議您定期造訪此頁面以獲取最新資訊。'
      }
    ]
  },
  'zh-CN': {
    title: '隐私权保护政策',
    subtitle: '我们重视您的个人隐私与数据安全，並遵循中华民国个人资料保护法及国际隐私标准保护您的信息。',
    lastUpdated: '最后更新日期：2026 年 6 月',
    tableHeaders: {
      service: '服务名称',
      purpose: '数据用途',
      policy: '隐私政策链接'
    },
    services: [
      { name: 'Cloudflare', purpose: '网站安全防护、流量负载与内容分发加速 (CDN)', url: 'cloudflare.com/privacypolicy' },
      { name: 'Cloudflare Turnstile', purpose: '询价表单之机器人恶意防护与安全性验证', url: 'cloudflare.com/privacypolicy' },
      { name: 'Vercel', purpose: '静态网站主机托管、部署运行与性能优化服务', url: 'vercel.com/legal/privacy-policy' },
      { name: 'Supabase', purpose: '安全云端数据库存储（包含分类、产品及系统数据）', url: 'supabase.com/privacy' },
      { name: 'Resend', purpose: '商务询价电子邮件自动化递送与通知服务', url: 'resend.com/legal/privacy-policy' }
    ],
    sections: [
      {
        title: '一、前言',
        content: '协皇企业有限公司（以下简称“本公司”或“我们”）非常重视您的个人数据保护。本隐私政策说明当您使用本网站（xh-motorparts.com）时，我们如何收集、使用、存储及保护您的个人数据。使用本网站即表示您同意本隐私政策之内容。若您不同意，请勿继续使用本网站。'
      },
      {
        title: '二、收集的数据类型',
        content: '当您浏览本网站或使用我们的商务询价服务时，我们可能会收集以下类型的个人数据：',
        subsections: [
          {
            title: '1. 您主动提供的个人数据',
            body: [
              '联系人姓名与称谓',
              '公司名称、职衔及所在国家/地区',
              '电子邮件地址及联系电话',
              '询价需求细节（包括产品型号、规格、订购数量及其他留言内容）'
            ]
          },
          {
            title: '2. 系统自动收集的技术数据',
            body: [
              '互联网协议（IP）地址与连接时间',
              '浏览器类型、版本、操作系统及设备类型',
              '访问页面、浏览轨迹、停留时间与点击记录',
              '来源网址（Referrer）与搜索关键字'
            ]
          }
        ]
      },
      {
        title: '三、数据收集目的与使用方式',
        content: '本公司收集您的个人数据，仅限于以下特定的商务与营运目的，并遵循“最小化原则”处理：',
        bullets: [
          '处理、评估并回复您的产品询价与商务合作洽谈需求',
          '寄送您所要求的产品目录、规格书、报价单或样品信息',
          '提供售前咨询、售后支持与客户服务渠道',
          '分析流量与用户行为，以改善网站功能与用户体验',
          '配合法律义务、法规要求或防范网站恶意攻击与欺诈行为'
        ]
      },
      {
        title: '四、数据分享与第三方服务',
        content: '本公司承诺绝不会出售、出租、交换或非法披露您的个人数据给任何第三方。为维持网站安全与正常营运，我们委托以下符合国际数据安全标准的云端服务供应商处理部分技术数据：'
      },
      {
        title: '五、数据存储、保护与保存期限',
        content: '我们实施严格的安全防护措施以保护您的个人数据安全：',
        bullets: [
          '传输安全：本网站全面采用传输层安全协议（HTTPS - SSL/TLS 1.3）进行加密传输，防止数据在传输过程中遭窃听或篡改。',
          '权限管制：本公司仅允许因业务运作需要、且经过授权的内部人员访问询价数据，并设有严格的访问控制机制。',
          '保存期限：商务询价数据将保存至双方商务往来结束后 3 年，或直到您提出删除要求为止。届期后，系统将安全地予以删除或进行不可逆之匿名化处理。',
          '泄露通报：若不幸发生数据安全性事件，我们将于发现后 72 小时内，依法通报主管机关，并通过您留下的联系方式通知受影响的当事人。'
        ]
      },
      {
        title: '六、Cookie 政策',
        content: '本网站使用 Cookie 及类似技术以提供您更流畅的浏览体验。Cookie 是存储在您设备上的小型文本文件。我们所使用的 Cookie 包含：',
        bullets: [
          '必要性 Cookie：确保网站基本操作与核心安全性功能（如安全验证防护）正常运行，无法手动关闭。',
          '分析性 Cookie：在您同意的前提下，用于了解访客的流量分布与浏览偏好，所有统计数据均经去识别化与匿名处理，仅用于改善网站服务。',
          '您可以通过浏览器的设置随时清除、拦截或限制 Cookie 的使用，但请注意，禁用必要性 Cookie 可能导致网站部分功能无法正常运作。'
        ]
      },
      {
        title: '七、您的法定权利',
        content: '依据中华民国个人资料保护法及适用的国际隐私法规（如 GDPR），您对您的个人数据享有以下法定权利：',
        bullets: [
          '请求查询或阅览本公司所持有的个人数据',
          '请求提供个人数据的复制本',
          '请求补充或更正不精确、已变更的个人数据',
          '请求停止收集、处理或利用个人数据（除非法律规定必须保存）',
          '请求删除您的个人数据（注销权）'
        ],
        subsections: [
          {
            title: '行使权利渠道',
            body: '如需行使上述任何权利，请随时通过本政策第九条的联系方式与我们联系。本公司将于收到申请并核对身份后，于法定 15 个工作日内回复处理结果。'
          }
        ]
      },
      {
        title: '八、未成年人保护',
        content: '本网站为专门提供全球采购商的 B2B 商业平台，我们不以未满 18 岁的未成年人为服务对象。我们不会故意收集、存储或利用任何未成年人的个人数据。'
      },
      {
        title: '九、联系我们',
        content: '若您对于本隐私政策、Cookie 设置或个人数据处理有任何疑问、申诉或建议，欢迎通过以下窗口与我们对接：',
        bullets: [
          '公司名称：协皇企业有限公司',
          '电子邮件：bounerchang@gmail.com',
          '服务时间：周一至周五 09:00 - 18:00 (GMT+8)'
        ]
      },
      {
        title: '十、政策修订与更新',
        content: '本公司保留随时修订与变更本隐私权政策的权利，以反映法律变更或本公司营运政策之调整。政策更新后，我们将于此页面发布最新版本并更新最后修订日期。对于有重大影响之修订，我们亦将以电子邮件主动通知曾于本网站留下商务联系信息的用户。建议您定期访问此页面以获取最新信息。'
      }
    ]
  },
  'en': {
    title: 'Privacy Policy',
    subtitle: 'We value your privacy and security. We process and protect your information in compliance with international data privacy standards and applicable regulations.',
    lastUpdated: 'Last Updated: June 2026',
    tableHeaders: {
      service: 'Service Provider',
      purpose: 'Purpose',
      policy: 'Privacy Policy Link'
    },
    services: [
      { name: 'Cloudflare', purpose: 'Security protection, traffic load balancing, and Content Delivery Network (CDN) acceleration.', url: 'cloudflare.com/privacypolicy' },
      { name: 'Cloudflare Turnstile', purpose: 'Spam protection and bot detection verification for inquiry forms.', url: 'cloudflare.com/privacypolicy' },
      { name: 'Vercel', purpose: 'Website hosting, cloud deployment, and speed optimization.', url: 'vercel.com/legal/privacy-policy' },
      { name: 'Supabase', purpose: 'Secure cloud database storage (storing catalogs, products, and system configurations).', url: 'supabase.com/privacy' },
      { name: 'Resend', purpose: 'Automated email delivery and notification services for business inquiries.', url: 'resend.com/legal/privacy-policy' }
    ],
    sections: [
      {
        title: '1. Introduction',
        content: 'Xie Huang Enterprise Co., Ltd. ("we", "us", or "the Company") values your privacy and is committed to protecting your personal data. This Privacy Policy outlines how we collect, use, store, and protect your personal information when you use our website (xh-motorparts.com). By using this website, you consent to the practices described in this Privacy Policy. If you do not agree, please discontinue use.'
      },
      {
        title: '2. Types of Data We Collect',
        content: 'When you browse our website or submit business inquiries, we may collect the following types of personal information:',
        subsections: [
          {
            title: 'A. Information You Voluntarily Provide',
            body: [
              'Contact name and title.',
              'Company name, job title, and country/region.',
              'Email address and contact telephone number.',
              'Inquiry details (including product model numbers, specifications, order quantities, and additional messages).'
            ]
          },
          {
            title: 'B. Technical Information Automatically Collected',
            body: [
              'Internet Protocol (IP) address and connection timestamps.',
              'Browser type, version, operating system, and device type.',
              'Pages visited, navigation paths, duration of visit, and click data.',
              'Referrer URL and search engine queries.'
            ]
          }
        ]
      },
      {
        title: '3. Purposes of Data Collection & Use',
        content: 'We process your personal information only for specific business and operational purposes under the data minimization principle:',
        bullets: [
          'To process, evaluate, and reply to your product inquiries and business collaboration requests.',
          'To send you requested product catalogs, specifications, quotation sheets, or sample details.',
          'To provide pre-sales consulting, post-sales support, and customer services.',
          'To analyze traffic and user behavior to improve website functionality and user experience.',
          'To comply with legal obligations, enforce terms, or detect and prevent malicious activities (e.g., bot attacks).'
        ]
      },
      {
        title: '4. Data Sharing & Third-Party Services',
        content: 'We promise never to sell, rent, trade, or unlawfully disclose your personal information to third parties. To ensure secure and normal operations, we share some technical data with the following service providers who comply with international data protection standards:'
      },
      {
        title: '5. Data Storage, Security & Retention',
        content: 'We implement strict protection measures to keep your data secure:',
        bullets: [
          'Transmission Security: Our website uses HTTPS (SSL/TLS 1.3) to encrypt all data in transit, preventing eavesdropping and tampering.',
          'Access Control: Only authorized personnel who have a business need-to-know are allowed access to inquiry data, governed by access controls.',
          'Retention Period: Business inquiries will be retained for 3 years after the termination of our business relationship, or until you request deletion. Stale data will be deleted or anonymized irreversibly.',
          'Breach Notification: In the event of a data security breach, we will notify competent regulatory authorities and affected users within 72 hours of discovery as required by law.'
        ]
      },
      {
        title: '6. Cookie Policy',
        content: 'Our website uses cookies and similar technologies to ensure smooth browsing. Cookies are small text files stored on your device. We use:',
        bullets: [
          'Essential Cookies: Necessary for basic operations and security (such as bot prevention), which cannot be disabled.',
          'Analytical Cookies: Subject to your consent, these cookies help us understand traffic patterns and visitor preferences. All data is aggregated and anonymized.',
          'You can clear, block, or manage cookies through your browser settings, though disabling essential cookies may degrade your website experience.'
        ]
      },
      {
        title: '7. Your Legal Rights',
        content: 'Depending on your location and applicable privacy laws, you may exercise the following rights regarding your personal data:',
        bullets: [
          'Request access to or copies of your personal data held by us.',
          'Request correction or updating of inaccurate personal data.',
          'Request restriction or suspension of processing of your personal data (where permitted).',
          'Request deletion of your personal data (the right to be forgotten).',
          'Object to processing or withdraw consent (if previously granted).'
        ],
        subsections: [
          {
            title: 'How to Exercise Your Rights',
            body: 'To exercise any of these rights, please contact us using the details in Section 9. We will review and respond to your request within 15 business days after verifying your identity.'
          }
        ]
      },
      {
        title: '8. Minors Protection',
        content: 'This website is a B2B business catalog designed for commercial procurement. We do not target or provide services to minors under the age of 18. We do not knowingly collect, store, or process personal data of minors.'
      },
      {
        title: '9. Contact Us',
        content: 'If you have any questions, feedback, or requests regarding this Privacy Policy, please contact our data team:',
        bullets: [
          'Company Name: Xie Huang Enterprise Co., Ltd.',
          'Email: bounerchang@gmail.com',
          'Business Hours: Monday to Friday 09:00 - 18:00 (GMT+8)'
        ]
      },
      {
        title: '10. Policy Updates',
        content: 'We reserve the right to revise this Privacy Policy at any time to reflect changes in legal requirements or our operational practices. Updates will be posted on this page with the revised "Last Updated" date. For major material changes, we will notify registered business contacts via email. We encourage you to review this page periodically.'
      }
    ]
  }
};
