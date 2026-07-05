import { useCallback, useRef } from 'react'
import { Type, Image, Grid3X3, Play, Check, Loader2 } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { applyWatermark } from '../../utils/watermarkEngine'
import { TextWatermarkForm } from './TextWatermarkForm'
import { ImageWatermarkForm } from './ImageWatermarkForm'
import { PatternWatermarkForm } from './PatternWatermarkForm'
import type { PositionPreset } from '../../types'
import { useTranslation } from '../../i18n/useTranslation'

const POSITIONS: PositionPreset[] = [
  'top-left','top-center','top-right',
  'center-left','center','center-right',
  'bottom-left','bottom-center','bottom-right',
]

export function WatermarkPanel() {
  const t = useTranslation()
  const activeType = useAppStore((s) => s.activeWatermarkType)
  const setActiveType = useAppStore((s) => s.setActiveWatermarkType)
  const images = useAppStore((s) => s.images)
  const updateImageStatus = useAppStore((s) => s.updateImageStatus)
  const isProcessing = useAppStore((s) => s.isProcessing)
  const setProcessing = useAppStore((s) => s.setProcessing)
  const setProcessingProgress = useAppStore((s) => s.setProcessingProgress)
  const getActiveParams = useAppStore((s) => s.getActiveParams)

  const handleProcessAll = useCallback(async () => {
    const pending = images.filter((i) => i.status === 'pending' || i.status === 'error')
    if (pending.length === 0) return
    setProcessing(true)
    const params = getActiveParams()
    for (let i = 0; i < pending.length; i++) {
      const img = pending[i]
      setProcessingProgress({ current: i + 1, total: pending.length })
      updateImageStatus(img.id, 'processing')
      try {
        const result = await applyWatermark(img.dataUrl, params)
        updateImageStatus(img.id, 'done', result)
      } catch {
        updateImageStatus(img.id, 'error', null, 'Processing failed')
      }
    }
    setProcessing(false)
    setProcessingProgress({ current: 0, total: 0 })
  }, [images, getActiveParams, setProcessing, setProcessingProgress, updateImageStatus])

  return (
    <div className='watermark-panel'>
      <div className='watermark-panel-header'>
        <h3>{t.watermark.title}</h3>
      </div>

      <div className='wm-type-tabs'>
        {(['text','image','pattern'] as const).map((t) => (
          <button
            key={t}
            className={'wm-type-tab' + (activeType === t ? ' active' : '')}
            onClick={() => setActiveType(t)}
          >
            {t === 'text' && <Type size={14} />}
            {t === 'image' && <Image size={14} />}
            {t === 'pattern' && <Grid3X3 size={14} />}
            {t === 'text' ? 'Text' : t === 'image' ? 'Logo' : 'Pattern'}
          </button>
        ))}
      </div>

      <div className='wm-params'>
        {activeType === 'text' && <TextWatermarkForm />}
        {activeType === 'image' && <ImageWatermarkForm />}
        {activeType === 'pattern' && <PatternWatermarkForm />}
      </div>

      <div className='action-bar'>
        <button className='btn-primary' onClick={handleProcessAll} disabled={isProcessing || images.length === 0}>
          {isProcessing ? <Loader2 size={16} className='spin' /> : <Play size={16} />}
          {isProcessing ? t.common.processing : t.common.processAll}
        </button>
      </div>
    </div>
  )
}
