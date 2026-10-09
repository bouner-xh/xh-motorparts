import type { Locale } from '@/lib/catalog';

export type LocalizedText = Record<Locale, string>;

// 依語系挑選文字；三個語系都必須提供；缺漏或語系不明時退回英文（主要客戶是國際買家）
export function localized(locale: Locale | string, text: LocalizedText): string {
  return text[locale as Locale] ?? text.en;
}
