import type { Locale } from '@/lib/catalog';

export type LocalizedText = Record<Locale, string>;

// 依語系挑選文字；三個語系都必須提供，避免簡中頁面退回顯示繁體字
export function localized(locale: Locale | string, text: LocalizedText): string {
  return text[locale as Locale] ?? text['zh-TW'];
}
