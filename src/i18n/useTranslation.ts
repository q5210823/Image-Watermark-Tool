import { useAppStore } from '../stores/useAppStore'
import { getTranslation } from './index'
import type { TranslationKeys } from './index'

export function useTranslation(): TranslationKeys {
  const lang = useAppStore((s) => s.language)
  return getTranslation(lang)
}