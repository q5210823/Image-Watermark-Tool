import { useState, useEffect, useCallback, useRef } from 'react'
import { Image, Download, Grid3X3, Maximize2, Trash2 } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { applyWatermark, generatePreview } from '../../utils/watermarkEngine'
import { useTranslation } from '../../i18n/useTranslation'
import { DetectionEditor } from '../ImageViewer/DetectionEditor'
import type { EditableBbox, ImageItem } from '../../types'

type CompareMode = 'original' | 'processed'
let _di = 0
function ndi() { return `d_${++_di}` }

export function PreviewGrid() {
  const t = useTranslation()
  const images = useAppStore((s) => s.images)
  const selectedImageId = useAppStore((s) => s.selectedImageId)
  const getActiveParams = useAppStore((s) => s.getActiveParams)
  const workMode = useAppStore((s) => s.workMode)
  const activeWatermarkType = useAppStore((s) => s.activeWatermarkType)
  const textParams = useAppStore((s) => s.textParams)
  const imageParams = useAppStore((s) => s.imageParams)
  const patternParams = useAppStore((s) => s.patternParams)
  const removerParams = useAppStore((s) => s.removerParams)
  const setShowExportDialog = useAppStore((s) => s.setShowExportDialog)
  const userBboxes = useAppStore((s) => s.userBboxes)
  const setUserBboxes = useAppStore((s) => s.setUserBboxes)
  const setSelectedImageIdStore = useAppStore((s) => s.setSelectedImageId)
  const ocrResults = useAppStore((s) => s.ocrResults)
  const editParams = useAppStore((s) => s.editParams)
  const setEditParams = useAppStore((s) => s.setEditParams)

  const [compareMode, setCompareMode] = useState<CompareMode>('processed')
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [editingImageId, setEditingImageId] = useState<string | null>(null)
  const [viewerImgUrl, setViewerImgUrl] = useState<string | null>(null)
  const [thumbDrag, setThumbDrag] = useState<{ imgId: string; boxId: string; sx: number; sy: number; orig: EditableBbox; imgW: number; imgH: number } | null>(null)

  const isRemoverMode = workMode === 'remove'
  const isEditMode = workMode === 'edit'

  // Recalculate previews for watermark modes
  useEffect(() => {
    if (isRemoverMode) return
    const params = getActiveParams()
    const previewable = images.filter((i) => i.status !== 'processing')
    if (previewable.length === 0) return
    previewable.forEach(async (img) => {
      try {
        const preview = await generatePreview(img.dataUrl, params, 300)
        setPreviews((prev) => ({ ...prev, [img.id]: preview }))
      } catch { /* ignore */ }
    })
  }, [activeWatermarkType, textParams, imageParams, patternParams, images.length])

  // Fix Bug 3: Show processedDataUrl for done images
  const getDisplayUrl = useCallback((img) => {
    if (compareMode === 'original') return img.dataUrl
    if (img.status === 'done' && img.processedDataUrl) return img.processedDataUrl
    if (isRemoverMode || isEditMode) return img.processedDataUrl || img.dataUrl
    if (img.status === 'done' && img.processedDataUrl) return img.processedDataUrl
    return previews[img.id] || img.dataUrl
  }, [compareMode, previews, isRemoverMode, isEditMode])

  const handleCardClick = useCallback((img) => {
    setSelectedImageIdStore(img.id)
    if (isRemoverMode || isEditMode) setEditingImageId(img.id)
  }, [setSelectedImageIdStore, isRemoverMode, isEditMode])

  // Delete a box (remover mode)
  const handleDeleteBox = useCallback((e: React.MouseEvent, imgId: string, boxId: string) => {
    e.stopPropagation()
    setUserBboxes(imgId, (userBboxes[imgId] || []).filter(b => b.id !== boxId))
  }, [userBboxes, setUserBboxes])

  // Start dragging (remover mode)
  const handleBoxMouseDown = useCallback((e: React.MouseEvent, imgId: string, box: EditableBbox, imgW: number, imgH: number) => {
    e.preventDefault(); e.stopPropagation()
    setThumbDrag({ imgId, boxId: box.id, sx: e.clientX, sy: e.clientY, orig: { ...box }, imgW, imgH })
  }, [])

  useEffect(() => {
    if (!thumbDrag) return
    const onMove = (e: MouseEvent) => {
      const container = document.querySelector('.preview-card-images')
      if (!container) return
      const cr = container.getBoundingClientRect()
      const cw = cr.width, ch = cr.height
      const imgAspect = thumbDrag.imgW / thumbDrag.imgH
      let displayedW: number, displayedH: number
      if (imgAspect >= 1) { displayedW = cw; displayedH = cw / imgAspect }
      else { displayedH = ch; displayedW = ch * imgAspect }
      const dx = ((e.clientX - thumbDrag.sx) / displayedW) * thumbDrag.imgW
      const dy = ((e.clientY - thumbDrag.sy) / displayedH) * thumbDrag.imgH
      setUserBboxes(thumbDrag.imgId, (userBboxes[thumbDrag.imgId] || []).map(b =>
        b.id === thumbDrag.boxId ? {
          ...b,
          x1: thumbDrag.orig.x1 + dx, y1: thumbDrag.orig.y1 + dy,
          x2: thumbDrag.orig.x2 + dx, y2: thumbDrag.orig.y2 + dy,
        } : b
      ))
    }
    const onUp = () => setThumbDrag(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [thumbDrag, userBboxes, setUserBboxes])

  // Select OCR box in edit mode (click on text region in thumbnail)
  const handleOcrBoxClick = useCallback((e: React.MouseEvent, imgId: string, boxId: string) => {
    e.stopPropagation()
    const boxes = ocrResults[imgId] || []
    const box = boxes.find(b => b.id === boxId)
    if (box) {
      setEditParams({ selectedOcrId: boxId, newText: box.text })
    }
  }, [ocrResults, setEditParams])

  // Handle zoom: show processed result if available, else original
  const handleZoom = useCallback((e: React.MouseEvent, img: ImageItem) => {
    e.stopPropagation()
    // Get latest image data from store to avoid stale closure
    const latest = useAppStore.getState().images.find(i => i.id === img.id) || img
    const url = (latest.status === "done" && latest.processedDataUrl) ? latest.processedDataUrl : latest.dataUrl
    setViewerImgUrl(url)
  }, [])

  return (
    <>
      <div className='preview-area'>
        <div className='preview-area-header'>
          <div className='compare-toggle'>
            <span style={{ fontSize: 13, fontWeight: 500, marginRight: 8 }}>
              {isRemoverMode ? t.remover.detectionPreview : ''}
            </span>
            <button className={compareMode === 'original' ? 'active' : ''} onClick={() => setCompareMode('original')}>{t.common.original}</button>
            <button className={compareMode === 'processed' ? 'active' : ''} onClick={() => setCompareMode('processed')}>{t.common.watermarked}</button>
          </div>
          <button className='btn-outline' onClick={() => setShowExportDialog(true)}>
            <Download size={12} /> {t.common.export}
          </button>
        </div>

        <div className='preview-grid'>
          {images.map((img) => {
            const boxes = isRemoverMode ? (userBboxes[img.id] || []) : []
            const ocrBoxes = isEditMode ? (ocrResults[img.id] || []) : []
            const containerIsSquare = true
            const imgAspect = img.width / img.height
            let scaleW = 1, scaleH = 1, offX = 0, offY = 0
            if (imgAspect >= 1) {
              scaleH = 1 / imgAspect
              offY = (1 - scaleH) / 2 * 100
            } else {
              scaleW = imgAspect
              offX = (1 - scaleW) / 2 * 100
            }
            return (
              <div
                key={img.id}
                className={'preview-card' + (img.id === selectedImageId ? ' selected' : '') + (isRemoverMode ? ' has-det' : '') + (isEditMode ? ' has-ocr' : '')}
                onClick={() => handleCardClick(img)}
              >
                <div className='preview-card-images'>
                  {isRemoverMode ? (
                    <img src={getDisplayUrl(img)} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <>
                      <img src={img.dataUrl} alt={img.name} style={{ opacity: compareMode === 'original' ? 1 : 0 }} />
                      <img src={getDisplayUrl(img)} alt={img.name + ' wm'} style={{ opacity: compareMode === 'original' ? 0 : 1 }} />
                    </>
                  )}
                  {/* Remover mode: interactive red boxes */}
                  {isRemoverMode && boxes.map((box, bi) => {
                    const bl = offX + (box.x1 / img.width) * scaleW * 100
                    const bt = offY + (box.y1 / img.height) * scaleH * 100
                    const bw = ((box.x2 - box.x1) / img.width) * scaleW * 100
                    const bh = ((box.y2 - box.y1) / img.height) * scaleH * 100
                    return (
                      <div key={box.id || bi} className='det-thumb-box'
                        style={{ left: `${bl}%`, top: `${bt}%`, width: `${bw}%`, height: `${bh}%` }}
                        onMouseDown={(e) => handleBoxMouseDown(e, img.id, box, img.width, img.height)}>
                        <span className='det-thumb-x' onMouseDown={(e) => handleDeleteBox(e, img.id, box.id)}
                          onClick={(e) => e.stopPropagation()}><Trash2 size={8} /></span>
                      </div>
                    )
                  })}
                  {/* Edit mode: blue OCR boxes with text labels */}
                  {isEditMode && ocrBoxes.map((ocrBox) => {
                    const [x1, y1, x2, y2] = ocrBox.bbox
                    const bl = offX + (x1 / img.width) * scaleW * 100
                    const bt = offY + (y1 / img.height) * scaleH * 100
                    const bw = ((x2 - x1) / img.width) * scaleW * 100
                    const bh = ((y2 - y1) / img.height) * scaleH * 100
                    return (
                      <div key={ocrBox.id}
                        className={'ocr-thumb-box' + (editParams.selectedOcrId === ocrBox.id ? ' active' : '')}
                        style={{ left: `${bl}%`, top: `${bt}%`, width: `${bw}%`, height: `${bh}%` }}
                        onClick={(e) => handleOcrBoxClick(e, img.id, ocrBox.id)}>
                        <span className='ocr-thumb-label'>{ocrBox.text}</span>
                      </div>
                    )
                  })}
                  <div className='preview-card-zoom' onClick={(e) => handleZoom(e, img)}><Maximize2 size={14} /></div>
                </div>
                <div className='preview-card-footer'>
                  <span>{img.name}</span>
                  <span style={{ color: img.status === 'done' ? 'var(--success)' : 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                    {isRemoverMode ? `${boxes.length} box${boxes.length !== 1 ? 'es' : ''}`
                      : isEditMode ? `${ocrBoxes.length} text${ocrBoxes.length !== 1 ? 's' : ''}`
                      : (img.status === 'done' ? t.common.done : img.status === 'error' ? t.common.error : t.common.pending)}
                  </span>
                </div>
              </div>
            )
          })}
          {images.length === 0 && (
            <div className='empty-state'>
              <Image size={48} />
              <h3>{t.common.noImages}</h3>
              <p>{t.common.dropHint}</p>
            </div>
          )}
        </div>
      </div>

      {/* Detection Editor overlay (remover mode) */}
      {editingImageId && isRemoverMode && (
        <DetectionEditor key={'de_' + editingImageId + '_' + (userBboxes[editingImageId]?.length || 0)} imageId={editingImageId} onClose={() => setEditingImageId(null)} />
      )}

      {/* Image viewer overlay (all modes) */}
      {viewerImgUrl && (
        <div className='viewer-overlay' onClick={() => setViewerImgUrl(null)}>
          <button className='viewer-close' onClick={() => setViewerImgUrl(null)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img src={viewerImgUrl} alt='' onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
