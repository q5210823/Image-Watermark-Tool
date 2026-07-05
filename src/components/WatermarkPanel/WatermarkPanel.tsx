import { useCallback } from 'react'
import { Type, Image, Grid3X3, Eraser, Play, Loader2 } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { applyWatermark } from '../../utils/watermarkEngine'
import { TextWatermarkForm } from './TextWatermarkForm'
import { ImageWatermarkForm } from './ImageWatermarkForm'
import { PatternWatermarkForm } from './PatternWatermarkForm'
import { WatermarkRemovalForm } from './WatermarkRemovalForm'
import { useTranslation } from '../../i18n/useTranslation'

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
    const toProcess = images.filter((i) => i.status !== 'processing')
    if (toProcess.length === 0) return
    setProcessing(true)
    const params = getActiveParams()
    for (let i = 0; i < toProcess.length; i++) {
      const img = toProcess[i]
      setProcessingProgress({ current: i + 1, total: toProcess.length })
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
        <h3>{activeType === 'remover' ? t.remover.title : t.watermark.title}</h3>
      </div>

      <div className='wm-type-tabs'>
        {(['text', 'image', 'pattern', 'remover'] as const).map((type) => (
          <button
            key={type}
            className={'wm-type-tab' + (activeType === type ? ' active' : '')}
            onClick={() => setActiveType(type)}
          >
            {type === 'text' && <Type size={14} />}
            {type === 'image' && <Image size={14} />}
            {type === 'pattern' && <Grid3X3 size={14} />}
            {type === 'remover' && <Eraser size={14} />}
            {type === 'text' ? t.watermark.text
              : type === 'image' ? t.watermark.logo
                : type === 'pattern' ? t.watermark.pattern
                  : t.remover.title}
          </button>
        ))}
      </div>

      <div className='wm-params'>
        {activeType === 'text' && <TextWatermarkForm />}
        {activeType === 'image' && <ImageWatermarkForm />}
        {activeType === 'pattern' && <PatternWatermarkForm />}
        {activeType === 'remover' && <WatermarkRemovalForm />}
      </div>

      {activeType !== 'remover' && (
        <div className='action-bar'>
          <button className='btn-primary' onClick={handleProcessAll} disabled={isProcessing || images.length === 0}>
            {isProcessing ? <Loader2 size={16} className='spin' /> : <Play size={16} />}
            {isProcessing ? t.common.processing : t.common.processAll}
          </button>
        </div>
      )}
    </div>
  )
}
