export const locales = ['zh-TW', 'zh-CN', 'en'] as const;
export type Locale = (typeof locales)[number];

export const categoryKeys = [
  'cylinder',
  'chain',
  'clutch',
  'piston',
  'valve',
  'sprocket',
  'brake',
  'oil-seal',
  'cable',
] as const;

export type CategoryKey = string;

export const categoryNames: Record<Locale, Record<CategoryKey, string>> = {
  'zh-TW': {
    cylinder: '汽缸系列',
    chain: '鏈條系列',
    clutch: '離合器系列',
    piston: '活塞系列',
    valve: '汽門系列',
    sprocket: '齒輪系列',
    brake: '煞車片系列',
    'oil-seal': '油封系列',
    cable: '線材系列',
  },
  'zh-CN': {
    cylinder: '汽缸系列',
    chain: '链条系列',
    clutch: '离合器系列',
    piston: '活塞系列',
    valve: '气门系列',
    sprocket: '齿轮系列',
    brake: '刹车片系列',
    'oil-seal': '油封系列',
    cable: '线材系列',
  },
  en: {
    cylinder: 'Cylinder Series',
    chain: 'Chain Series',
    clutch: 'Clutch Series',
    piston: 'Piston Series',
    valve: 'Valve Series',
    sprocket: 'Sprocket Series',
    brake: 'Brake Pad Series',
    'oil-seal': 'Oil Seal Series',
    cable: 'Cable Series',
  },
};

export const categoryDescriptions: Record<Locale, Record<CategoryKey, string>> = {
  'zh-TW': {
    cylinder: '汽缸組件 — 精密加工，符合各主流車型規格',
    chain: '鏈條系統 — 高張力鋼材，耐磨耐候',
    clutch: '離合器組件 — 精密咬合，提供順暢的換檔體驗',
    piston: '活塞套件 — 輕量化高強度，確保引擎最佳性能',
    valve: '汽門組件 — 耐高溫材質，確保引擎穩定氣密性',
    sprocket: '傳動齒輪 — 高硬度耐磨損，提供穩定的傳動效果',
    brake: '煞車片系統 — 高摩擦係數，確保極致行車安全',
    'oil-seal': '油封與墊片 — 多規格庫存，快速出貨',
    cable: '電氣線材 — 嚴格耐壓測試，穩定導電',
  },
  'zh-CN': {
    cylinder: '汽缸组件 — 精密加工，符合各主流车型规格',
    chain: '链条系统 — 高张力钢材，耐磨耐候',
    clutch: '离合器组件 — 精密咬合，提供顺畅的换档体验',
    piston: '活塞套件 — 轻量化高强度，确保引擎最佳性能',
    valve: '气门组件 — 耐高温材质，确保引擎稳定气密性',
    sprocket: '传动齿轮 — 高硬度耐磨损，提供稳定的传动效果',
    brake: '刹车片系统 — 高摩擦系数，确保极致行车安全',
    'oil-seal': '油封与垫片 — 多规格库存，快速出货',
    cable: '电气线材 — 严格耐压测试，稳定导电',
  },
  en: {
    cylinder: 'Cylinder Components — Precision machining, compatible with mainstream models.',
    chain: 'Chain Systems — High-tensile steel, wear and weather resistant.',
    clutch: 'Clutch Assemblies — Precise engagement for a smooth shifting experience.',
    piston: 'Piston Kits — Lightweight and high-strength for optimal engine performance.',
    valve: 'Valve Components — High-temperature resistant materials ensuring stable sealing.',
    sprocket: 'Transmission Sprockets — High hardness and wear resistance for stable power delivery.',
    brake: 'Brake Pad Systems — High friction coefficient ensuring ultimate riding safety.',
    'oil-seal': 'Oil Seals & Gaskets — Multi-spec inventory ready for fast shipping.',
    cable: 'Electrical Cables — Strict pressure testing ensuring stable conductivity.',
  },
};
