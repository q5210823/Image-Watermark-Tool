import { useState, useEffect, useCallback } from 'react'
import { Image, Download, ZoomIn, Grid3X3, SlidersHorizontal } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { applyWatermark, generatePreview } from '../../utils/watermarkEngine'
import { useTranslation } from '../../i18n/useTranslation'

type CompareMode = 'original' | 'processed'

export function PreviewGrid() {
  const t = useTranslation()
  const images = useAppStore((s) => s.images)
  const selectedImageId = useAppStore((s) => s.selectedImageId)
  const setSelectedImageId = useAppStore((s) => s.setSelectedImageId)
  const getActiveParams = useAppStore((s) => s.getActiveParams)
  const updateImageStatus = useAppStore((s) => s.updateImageStatus)
  const activeWatermarkType = useAppStore((s) => s.activeWatermarkType)
  const textParams = useAppStore((s) => s.textParams)
  const imageParams = useAppStore((s) => s.imageParams)
  const patternParams = useAppStore((s) => s.patternParams)
  const setShowExportDialog = useAppStore((s) => s.setShowExportDialog)

  const [compareMode, setCompareMode] = useState<CompareMode>('processed')
  const [previews, setPreviews] = useState<Record<string, string>>({})

  // Recalculate previews when params, images, or processed state changes
  useEffect(() => {
    const params = getActiveParams()
    const previewable = images.filter((i) => i.status !== 'processing')
    if (previewable.length === 0) return
    previewable.forEach(async (img) => {
      try {
        const preview = await generatePreview(img.dataUrl, params, 300)
        setPreviews((prev) => ({ ...prev, [img.id]: preview }))
      } catch (e) {
        // preview failed
      }
    })
  }, [activeWatermarkType, textParams, imageParams, patternParams, images.length, images.filter(i => i.status === 'done').length])

  const getDisplayUrl = useCallback(
    (img) => {
      if (compareMode === 'original') return img.dataUrl
      // Use preview thumbnails for grid display so text size is consistent
      return previews[img.id] || img.processedDataUrl || img.dataUrl
    },
    [compareMode, previews]
  )

  return (
    <div className='preview-area'>
      <div className='preview-toolbar'>
        <div className='preview-toolbar-left'>
          <Grid3X3 size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            {images.filter((i) => i.status === 'done').length}/{images.length} {t.files.processed}
          </span>
        </div>
        <div className='preview-toolbar-right'>
          <div className='compare-toggle'>
            <button className={compareMode === 'original' ? 'active' : ''} onClick={() => setCompareMode('original')}>{t.common.original}</button>
            <button className={compareMode === 'processed' ? 'active' : ''} onClick={() => setCompareMode('processed')}>{t.common.watermarked}</button>
          </div>
          <button className='btn-outline' onClick={() => setShowExportDialog(true)}>
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      <div className='preview-grid'>
        {images.map((img) => (
          <div
            key={img.id}
            className={'preview-card' + (img.id === selectedImageId ? ' selected' : '')}
            onClick={() => setSelectedImageId(img.id)}
          >
            <div className='preview-card-images'>
              <img src={img.dataUrl} alt={img.name}
                style={{ opacity: compareMode === 'original' ? 1 : 0 }}
              />
              <img src={getDisplayUrl(img)} alt={img.name + ' watermarked'}
                style={{ opacity: compareMode === 'original' ? 0 : 1 }}
              />
            </div>
            <div className='preview-card-footer'>
              <span>{img.name}</span>
              <span style={{ color: img.status === 'done' ? 'var(--success)' : 'var(--text-muted)' }}>
                {img.status === 'done' ? t.common.done : img.status === 'error' ? t.common.error : t.common.pending}
              </span>
            </div>
          </div>
        ))}
        {images.length === 0 && (
          <div className='empty-state'>
            <Image size={48} />
            <h3>{t.common.noImages}</h3>
            <p>{t.common.dropHint}</p>
          </div>
        )}
      </div>
    </div>
  )
}
