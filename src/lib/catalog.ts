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

export type CategoryKey = (typeof categoryKeys)[number];

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
    cylinder: '高品質汽缸套件，適用於各種摩托車型號',
    chain: '專業傳動鏈條，確保最佳傳動效率',
    clutch: '耐用離合器組件，提供順暢的換檔體驗',
    piston: '精密活塞套件，確保引擎最佳性能',
    valve: '高精度汽門組件，確保引擎氣密性',
    sprocket: '耐磨齒輪，提供穩定的傳動效果',
    brake: '高性能煞車片，確保行車安全',
    'oil-seal': '優質油封，防止油料洩漏',
    cable: '耐用線材，確保操控靈敏度',
  },
  'zh-CN': {
    cylinder: '高品质汽缸套件，适用于各种摩托车型号',
    chain: '专业传动链条，确保最佳传动效率',
    clutch: '耐用离合器组件，提供顺畅的换档体验',
    piston: '精密活塞套件，确保引擎最佳性能',
    valve: '高精度气门组件，确保引擎气密性',
    sprocket: '耐磨齿轮，提供稳定的传动效果',
    brake: '高性能刹车片，确保行车安全',
    'oil-seal': '优质油封，防止油料泄漏',
    cable: '耐用线材，确保操控灵敏度',
  },
  en: {
    cylinder: 'High-quality cylinder kits for various motorcycle models',
    chain: 'Professional transmission chains ensuring optimal power delivery',
    clutch: 'Durable clutch components for smooth shifting experience',
    piston: 'Precision piston kits for optimal engine performance',
    valve: 'High-precision valve components ensuring engine sealing',
    sprocket: 'Wear-resistant sprockets for stable transmission',
    brake: 'High-performance brake pads for safe riding',
    'oil-seal': 'Premium oil seals preventing oil leakage',
    cable: 'Durable cables ensuring responsive control',
  },
};
