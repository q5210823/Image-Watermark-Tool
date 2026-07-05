import { Languages } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { getLangLabel } from '../../i18n'

export function LanguageToggle() {
  const lang = useAppStore((s) => s.language)
  const setLanguage = useAppStore((s) => s.setLanguage)

  return (
    <button
      className='btn-outline'
      onClick={() => setLanguage(lang === 'en' ? 'zh' : 'en')}
      title={lang === 'en' ? 'Switch to Chinese' : '切换到英文'}
      style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
    >
      <Languages size={12} /> {getLangLabel(lang)}
    </button>
  )
}