export type Lang = 'en' | 'zh';
export type TranslationKeys = typeof import('./en').en;

import { en } from './en';
import { zh } from './zh';

const translations: Record<Lang, TranslationKeys> = { en, zh };

export function getTranslation(lang: Lang): TranslationKeys {
  return translations[lang];
}

export function getLangLabel(lang: Lang): string {
  return lang === 'en' ? 'English' : '\u4E2D\u6587';
}