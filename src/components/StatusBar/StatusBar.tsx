import { Download, Image, CheckCircle, Clock } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useTranslation } from '../../i18n/useTranslation'
import { LanguageToggle } from './LanguageToggle'

interface Props { onClickExport: () => void }

export function StatusBar({ onClickExport }: Props) {
  const t = useTranslation()
  const images = useAppStore((s) => s.images)
  const isProcessing = useAppStore((s) => s.isProcessing)
  const progress = useAppStore((s) => s.processingProgress)

  const total = images.length
  const done = images.filter((i) => i.status === 'done').length
  const pending = images.filter((i) => i.status === 'pending').length
  const errors = images.filter((i) => i.status === 'error').length

  return (
    <div className='status-bar'>
      <div className='status-bar-left'>
        <span><Image size={12} /> {total} {t.files.title.toLowerCase()}</span>
        {pending > 0 && <span><Clock size={12} /> {pending} {t.common.pending.toLowerCase()}</span>}
        <span className='success-text'><CheckCircle size={12} /> {done} {t.common.done.toLowerCase()}</span>
        {errors > 0 && <span style={{ color: 'var(--error)' }}>{errors} {t.common.error.toLowerCase()}</span>}
      </div>
      <div className='status-bar-right'>
        {isProcessing && (
          <span className='accent-text'>{t.common.processing} {progress.current}/{progress.total}</span>
        )}
        <LanguageToggle />
        {total > 0 && !isProcessing && (
          <button className='btn-primary' onClick={onClickExport}
            style={{ width: 'auto', padding: '6px 14px', fontSize: 'var(--font-size-xs)' }}
          >
            <Download size={12} /> {t.common.export}
          </button>
        )}
      </div>
    </div>
  )
}