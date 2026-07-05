import { useState, useCallback, useEffect, useRef } from 'react'
import { Eraser, Loader2, AlertTriangle, CheckCircle2, Info, ScanSearch } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useTranslation } from '../../i18n/useTranslation'
import { checkEnv, detectWatermark, removeWithBbox } from '../../utils/watermarkRemover'
import { logger } from '../../utils/logger'

const MODULE = 'WatermarkRemovalForm'
let _bid = 0
function nid() { return `rb_${++_bid}` }

export function WatermarkRemovalForm() {
  const t = useTranslation()
  const p = useAppStore((s) => s.removerParams)
  const set = useAppStore((s) => s.setRemoverParams)
  const images = useAppStore((s) => s.images)
  const updateImageStatus = useAppStore((s) => s.updateImageStatus)
  const setDetections = useAppStore((s) => s.setDetectionResults)
  const userBboxes = useAppStore((s) => s.userBboxes)
  const setUserBboxes = useAppStore((s) => s.setUserBboxes)
  const selectedImageId = useAppStore((s) => s.selectedImageId)
  const isProcessing = useAppStore((s) => s.isProcessing)
  const setProcessing = useAppStore((s) => s.setProcessing)
  const setProcessingProgress = useAppStore((s) => s.setProcessingProgress)
  const hasDetected = useRef(false)

  const [envStatus, setEnvStatus] = useState<{ ready: boolean; checking: boolean; message: string }>({ ready: false, checking: false, message: '' })
  const [error, setError] = useState<string | null>(null)

  // Auto-detect on mount or when images change
  useEffect(() => {
    if (images.length === 0) { hasDetected.current = false; return }
    if (hasDetected.current) return
    const undetected = images.filter(i => !userBboxes[i.id] || userBboxes[i.id].length === 0)
    if (undetected.length === 0) { hasDetected.current = true; return }
    hasDetected.current = true
    autoDetect()
  }, [images.length])

  const autoDetect = useCallback(async () => {
    const target = images.filter((i) => i.status !== 'processing')
    if (target.length === 0) return
    for (const img of target) {
      try {
        const result = await detectWatermark(img.dataUrl, p)
        setDetections(img.id, result.detections)
        if (result.detections.length > 0) {
          setUserBboxes(img.id, result.detections.map(d => ({
            id: nid(), x1: d.bbox[0], y1: d.bbox[1], x2: d.bbox[2], y2: d.bbox[3],
            confidence: d.confidence, fallback: (d as any).fallback,
          })))
        }
      } catch { /* skip */ }
    }
  }, [images, p, setDetections, setUserBboxes])

  const handleCheckEnv = useCallback(async () => {
    setError(null); setEnvStatus({ ready: false, checking: true, message: '' })
    try {
      const env = await checkEnv()
      if (env.pythonAvailable && env.depsInstalled) {
        setEnvStatus({ ready: true, checking: false, message: env.modelCached ? t.remover.envReady : 'Model not cached' })
      } else {
        setEnvStatus({ ready: false, checking: false, message: `${t.remover.envMissing}: ${env.missingDeps.join(', ') || 'Unknown'}` })
      }
    } catch (err: any) {
      setEnvStatus({ ready: false, checking: false, message: err.message || 'Connection failed' })
      setError(err.message)
    }
  }, [t])

  const handleReDetect = useCallback(async () => {
    hasDetected.current = false
    setError(null)
    images.forEach(i => { setUserBboxes(i.id, []); setDetections(i.id, []) })
    const target = images.filter((i) => i.status !== 'processing')
    for (const img of target) {
      try {
        const result = await detectWatermark(img.dataUrl, p)
        setDetections(img.id, result.detections)
        if (result.detections.length > 0) {
          setUserBboxes(img.id, result.detections.map(d => ({
            id: nid(), x1: d.bbox[0], y1: d.bbox[1], x2: d.bbox[2], y2: d.bbox[3],
            confidence: d.confidence, fallback: (d as any).fallback,
          })))
        }
      } catch (err: any) { setError(`Detection failed: ${err.message}`) }
    }
  }, [images, p, setDetections, setUserBboxes])

  // Apply to All: copy boxes from the active/selected image to all others
  const handleApplyToAll = useCallback(() => {
    // Find source image: first try selectedImageId, then first image with boxes
    const srcImg = (selectedImageId && images.find(i => i.id === selectedImageId)) ||
                   images.find(i => (userBboxes[i.id] || []).length > 0)
    if (!srcImg) return
    const srcBoxes = userBboxes[srcImg.id]
    if (!srcBoxes || srcBoxes.length === 0) return
    images.forEach(img => {
      if (img.id !== srcImg.id) {
        setUserBboxes(img.id, srcBoxes.map(b => ({ ...b, id: nid() })))
      }
    })
    logger.info(MODULE, `Applied ${srcBoxes.length} box(es) from "${srcImg.name}" to all ${images.length} images`)
  }, [selectedImageId, images, userBboxes, setUserBboxes])

  const handleRemoveAll = useCallback(async () => {
    const target = images.filter((i) => i.status !== 'processing')
    if (target.length === 0) return
    setError(null); setProcessing(true)
    for (let i = 0; i < target.length; i++) {
      const img = target[i]
      setProcessingProgress({ current: i + 1, total: target.length })
      updateImageStatus(img.id, 'processing')
      try {
        const boxes = userBboxes[img.id] || []
        if (boxes.length > 0) {
          const resultUrl = await removeWithBbox(img.dataUrl, boxes.map(b => [b.x1, b.y1, b.x2, b.y2] as [number, number, number, number]), p)
          updateImageStatus(img.id, 'done', resultUrl)
        } else {
          updateImageStatus(img.id, 'error', null, 'No detection box')
        }
      } catch (err: any) {
        updateImageStatus(img.id, 'error', null, err.message || 'Removal failed')
      }
    }
    setProcessing(false); setProcessingProgress({ current: 0, total: 0 })
  }, [images, p, userBboxes, updateImageStatus, setProcessing, setProcessingProgress])

  const totalWithBoxes = images.filter(i => (userBboxes[i.id] || []).length > 0).length
  // Check if ANY image has boxes (for apply-to-all source)
  const anyBoxes = images.some(i => (userBboxes[i.id] || []).length > 0)

  return (
    <div>
      {error && (
        <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 'var(--font-size-xs)' }}>
          <AlertTriangle size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />{error}
        </div>
      )}

      {/* Env Check */}
      <div className='param-group'>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <button className={'btn-sm' + (envStatus.checking ? ' disabled' : '')} onClick={handleCheckEnv} disabled={envStatus.checking}>
            {envStatus.checking ? <Loader2 size={14} className='spin' /> : <Info size={14} />}
            {t.remover.envCheck}
          </button>
          {envStatus.ready && <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />}
          {!envStatus.ready && envStatus.message && !envStatus.checking && <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />}
        </div>
        {envStatus.message && <p style={{ fontSize: 'var(--font-size-xs)', color: envStatus.ready ? 'var(--success)' : 'var(--warning)', margin: 0 }}>{envStatus.message}</p>}
      </div>

      {/* Status */}
      <div className='param-group'>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', margin: 0 }}>
          {totalWithBoxes}/{images.length} with boxes
          {images.filter(i => i.status === 'done').length > 0 && ` · ${images.filter(i => i.status === 'done').length} done`}
        </p>
      </div>

      {/* Apply to All */}
      <div className='param-group'>
        <button className='btn-primary' onClick={handleApplyToAll}
          disabled={!anyBoxes || images.length < 2}
          style={{ width: '100%', background: 'var(--accent)', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
          {t.remover.applyToAll || 'Apply to All'} ({totalWithBoxes} source boxes)
        </button>
      </div>

      {/* Params */}
      <div className='param-group'>
        <label className='param-label'>{t.remover.confidence}: {Math.round(p.confidence * 100)}%</label>
        <input type='range' min='10' max='100' value={Math.round(p.confidence * 100)} onChange={(e) => set({ confidence: Number(e.target.value) / 100 })} />
      </div>
      <div className='param-group'>
        <label className='param-label'>{t.remover.padding}: {p.padding}px</label>
        <input type='range' min='0' max='50' value={p.padding} onChange={(e) => set({ padding: Number(e.target.value) })} />
      </div>
      <div className='param-group'>
        <label className='param-label'>{t.remover.method}</label>
        <select value={p.method} onChange={(e) => set({ method: e.target.value as 'lama' | 'opencv' })}>
          <option value='lama'>{t.remover.lama}</option>
          <option value='opencv'>{t.remover.opencv}</option>
        </select>
      </div>

      {/* Actions */}
      <div className='action-bar' style={{ flexDirection: 'column', gap: 8 }}>
        <button className='btn-outline' onClick={handleReDetect} disabled={isProcessing || images.length === 0} style={{ width: '100%' }}>
          <ScanSearch size={16} /> Re-detect
        </button>
        <button className='btn-primary' onClick={handleRemoveAll} disabled={isProcessing || images.length === 0 || totalWithBoxes === 0} style={{ width: '100%' }}>
          {isProcessing ? <Loader2 size={16} className='spin' /> : <Eraser size={16} />}
          {isProcessing ? t.remover.processing : t.remover.removeAll}
        </button>
      </div>
    </div>
  )
}
