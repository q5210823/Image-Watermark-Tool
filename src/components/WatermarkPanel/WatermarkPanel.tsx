import { useCallback, useRef } from 'react'
import { Type, Image, Grid3X3, Play, Plus, Trash2, Eye, EyeOff, GripVertical, Loader2 } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useTranslation } from '../../i18n/useTranslation'
import { applyLayers } from '../../utils/watermarkEngine'
import { TextWatermarkForm } from './TextWatermarkForm'
import { ImageWatermarkForm } from './ImageWatermarkForm'
import { PatternWatermarkForm } from './PatternWatermarkForm'
import { DEFAULT_TEXT_PARAMS, DEFAULT_IMAGE_PARAMS, DEFAULT_PATTERN_PARAMS } from '../../types'
import type { WatermarkParams } from '../../types'

export function WatermarkPanel() {
  const t = useTranslation()
  const layers = useAppStore((s) => s.layers)
  const activeLayerIndex = useAppStore((s) => s.activeLayerIndex)
  const setActiveLayerIndex = useAppStore((s) => s.setActiveLayerIndex)
  const addLayer = useAppStore((s) => s.addLayer)
  const removeLayer = useAppStore((s) => s.removeLayer)
  const updateLayer = useAppStore((s) => s.updateLayer)
  const toggleLayer = useAppStore((s) => s.toggleLayer)
  const images = useAppStore((s) => s.images)
  const updateImageStatus = useAppStore((s) => s.updateImageStatus)
  const isProcessing = useAppStore((s) => s.isProcessing)
  const setProcessing = useAppStore((s) => s.setProcessing)
  const setProcessingProgress = useAppStore((s) => s.setProcessingProgress)
  const getEnabledLayers = useAppStore((s) => s.getEnabledLayers)

  const activeLayer = layers[activeLayerIndex]

  const handleAddLayer = useCallback(() => {
    const types: WatermarkParams['type'][] = ['text', 'image', 'pattern']
    const defaults: Record<string, WatermarkParams> = {
      text: { ...DEFAULT_TEXT_PARAMS },
      image: { ...DEFAULT_IMAGE_PARAMS },
      pattern: { ...DEFAULT_PATTERN_PARAMS },
    }
    const nextType = types[layers.length % types.length]
    addLayer(defaults[nextType])
  }, [layers.length, addLayer])

  const handleProcessAll = useCallback(async () => {
    const pending = images.filter((i) => i.status === 'pending' || i.status === 'error')
    if (pending.length === 0) return
    setProcessing(true)
    const enabledLayers = getEnabledLayers()
    for (let i = 0; i < pending.length; i++) {
      const img = pending[i]
      setProcessingProgress({ current: i + 1, total: pending.length })
      updateImageStatus(img.id, 'processing')
      try {
        const result = await applyLayers(img.dataUrl, enabledLayers)
        updateImageStatus(img.id, 'done', result)
      } catch {
        updateImageStatus(img.id, 'error', null, 'Processing failed')
      }
    }
    setProcessing(false)
    setProcessingProgress({ current: 0, total: 0 })
  }, [images, getEnabledLayers, setProcessing, setProcessingProgress, updateImageStatus])

  return (
    <div className='watermark-panel'>
      <div className='watermark-panel-header'>
        <h3>{t.watermark.title}</h3>
      </div>

      {/* Layer list */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '8px 12px', maxHeight: 180, overflowY: 'auto' }}>
        {layers.map((layer, i) => (
          <div
            key={layer.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: i === activeLayerIndex ? 'var(--accent-muted)' : 'transparent',
              opacity: layer.enabled ? 1 : 0.4,
              marginBottom: 4,
            }}
            onClick={() => setActiveLayerIndex(i)}
          >
            {layer.params.type === 'text' && <Type size={14} />}
            {layer.params.type === 'image' && <Image size={14} />}
            {layer.params.type === 'pattern' && <Grid3X3 size={14} />}
            <span style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}>{layer.name}</span>
            <button
              className='btn-sm-icon'
              onClick={(e) => { e.stopPropagation(); toggleLayer(i) }}
              title={layer.enabled ? 'Disable' : 'Enable'}
              style={{ width: 20, height: 20 }}
            >
              {layer.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
            {layers.length > 1 && (
              <button
                className='btn-sm-icon'
                onClick={(e) => { e.stopPropagation(); removeLayer(i) }}
                style={{ width: 20, height: 20, color: 'var(--error)' }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        <button
          className='btn-secondary'
          onClick={handleAddLayer}
          style={{ marginTop: 6, fontSize: 'var(--font-size-xs)', padding: 6 }}
        >
          <Plus size={12} /> Add Layer
        </button>
      </div>

      {/* Parameter editor for active layer */}
      <div className='wm-params' key={activeLayer?.id || 'none'}>
        {activeLayer?.params.type === 'text' && (
          <TextWatermarkForm
            params={(activeLayer.params as any)}
            onChange={(p) => updateLayer(activeLayerIndex, p)}
          />
        )}
        {activeLayer?.params.type === 'image' && (
          <ImageWatermarkForm
            params={(activeLayer.params as any)}
            onChange={(p) => updateLayer(activeLayerIndex, p)}
          />
        )}
        {activeLayer?.params.type === 'pattern' && (
          <PatternWatermarkForm
            params={(activeLayer.params as any)}
            onChange={(p) => updateLayer(activeLayerIndex, p)}
          />
        )}
        {!activeLayer && <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>No layer selected</div>}
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