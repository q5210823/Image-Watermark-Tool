import { useCallback, useEffect, useState } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { ocrDetect, analyzeTextStyle, editText } from '../../utils/watermarkRemover'
import { previewTextEdit } from '../../utils/watermarkEngine'
import { useTranslation } from '../../i18n/useTranslation'
import { Loader2, Search, Check, RefreshCw } from 'lucide-react'
import type { OcrBox, TextStyle } from '../../types'
import { DEFAULT_TEXT_STYLE } from '../../types'

export function TextEditForm() {
  const t = useTranslation()
  const images = useAppStore((s) => s.images)
  const ocrResults = useAppStore((s) => s.ocrResults)
  const setOcrResults = useAppStore((s) => s.setOcrResults)
  const editParams = useAppStore((s) => s.editParams)
  const setEditParams = useAppStore((s) => s.setEditParams)
  const isProcessing = useAppStore((s) => s.isProcessing)
  const setProcessing = useAppStore((s) => s.setProcessing)
  const updateImageStatus = useAppStore((s) => s.updateImageStatus)
  const selectedImageId = useAppStore((s) => s.selectedImageId)

  const [detecting, setDetecting] = useState(false)
  const [applying, setApplying] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const selectedOcrBox = editParams.selectedOcrId
    ? editParams.ocrBoxes.find((o) => o.id === editParams.selectedOcrId) || null
    : null

  // Handle detect all
  const handleDetectAll = useCallback(async () => {
    setDetecting(true)
    const toProcess = images.filter((i) => i.status !== 'processing')
    for (const img of toProcess) {
      try {
        const result = await ocrDetect(img.dataUrl)
        setOcrResults(img.id, result.ocrBoxes)
      } catch {
        setOcrResults(img.id, [])
      }
    }
    setDetecting(false)
  }, [images, setOcrResults])

  // Handle detect single
  const handleDetectSingle = useCallback(async (imageId: string) => {
    const img = images.find((i) => i.id === imageId)
    if (!img) return
    setDetecting(true)
    try {
      const result = await ocrDetect(img.dataUrl)
      setOcrResults(imageId, result.ocrBoxes)
      // Auto-select first OCR box
      if (result.ocrBoxes.length > 0) {
        const box = result.ocrBoxes[0]
        setEditParams({ selectedOcrId: box.id, newText: box.text })
        // Auto-analyze style
        try {
          const analysis = await analyzeTextStyle(img.dataUrl, box.bbox)
          const style: TextStyle = {
            ...DEFAULT_TEXT_STYLE,
            color: analysis.color,
            fontSize: analysis.fontSize,
            opacity: analysis.opacity,
            shadow: analysis.hasShadow ? DEFAULT_TEXT_STYLE.shadow : null,
            stroke: analysis.hasStroke ? { enabled: true, color: '#FFFFFF', width: 1 } : null,
            rotation: analysis.rotation,
          }
          setEditParams({ style })
        } catch { /* use defaults */ }
      }
    } catch {
      setOcrResults(imageId, [])
    }
    setDetecting(false)
  }, [images, setOcrResults, setEditParams])

  // Select OCR box
  const handleSelectBox = useCallback(async (box: OcrBox) => {
    setEditParams({ selectedOcrId: box.id, newText: box.text })
    // Auto-analyze style for selected box
    const img = images.find((i) => i.id === selectedImageId)
    if (img) {
      try {
        const analysis = await analyzeTextStyle(img.dataUrl, box.bbox)
        const style: TextStyle = {
          ...DEFAULT_TEXT_STYLE,
          color: analysis.color,
          fontSize: analysis.fontSize,
          opacity: analysis.opacity,
          shadow: analysis.hasShadow ? DEFAULT_TEXT_STYLE.shadow : null,
          stroke: analysis.hasStroke ? { enabled: true, color: '#FFFFFF', width: 1 } : null,
          rotation: analysis.rotation,
        }
        setEditParams({ style })
      } catch { /* use defaults */ }
    }
  }, [images, selectedImageId, setEditParams])

  // Update preview when text or style changes
  useEffect(() => {
    if (!selectedOcrBox || !selectedImageId) {
      setPreviewUrl(null)
      return
    }
    const img = images.find((i) => i.id === selectedImageId)
    if (!img) return
    const timer = setTimeout(async () => {
      try {
        const url = await previewTextEdit(
          img.dataUrl,
          editParams.newText || selectedOcrBox.text,
          editParams.style,
          selectedOcrBox.bbox,
          400,
        )
        setPreviewUrl(url)
      } catch {
        setPreviewUrl(null)
      }
    }, 200) // debounce
    return () => clearTimeout(timer)
  }, [selectedOcrBox, editParams.newText, editParams.style, selectedImageId, images])

  // Apply edit to current image
  const handleApply = useCallback(async () => {
    if (!selectedOcrBox || !selectedImageId) return
    const img = images.find((i) => i.id === selectedImageId)
    if (!img) return
    setApplying(true)
    updateImageStatus(selectedImageId, 'processing')
    try {
      const result = await editText(img.dataUrl, [{
        bbox: selectedOcrBox.bbox,
        new_text: editParams.newText || selectedOcrBox.text,
        style: editParams.style,
      }])
      updateImageStatus(selectedImageId, 'done', result)
    } catch {
      updateImageStatus(selectedImageId, 'error', null, 'Edit failed')
    }
    setApplying(false)
  }, [selectedOcrBox, selectedImageId, images, editParams, updateImageStatus])

  // Apply to all
  const handleApplyAll = useCallback(async () => {
    if (!selectedOcrBox) return
    setApplying(true)
    const toProcess = images.filter((i) => i.status !== 'processing')
    for (let i = 0; i < toProcess.length; i++) {
      const img = toProcess[i]
      updateImageStatus(img.id, 'processing')
      try {
        // Use the same bbox relative coordinates for all images
        const result = await editText(img.dataUrl, [{
          bbox: selectedOcrBox.bbox,
          new_text: editParams.newText || selectedOcrBox.text,
          style: editParams.style,
        }])
        updateImageStatus(img.id, 'done', result)
      } catch {
        updateImageStatus(img.id, 'error', null, 'Edit failed')
      }
    }
    setApplying(false)
  }, [selectedOcrBox, images, editParams, updateImageStatus])

  const currentBoxes = selectedImageId ? ocrResults[selectedImageId] || [] : []

  return (
    <div className='text-edit-form'>
      {/* Detect buttons */}
      <div className='action-bar' style={{ marginBottom: 12 }}>
        <button className='btn-outline' onClick={handleDetectAll} disabled={detecting || images.length === 0}>
          {detecting ? <Loader2 size={14} className='spin' /> : <Search size={14} />}
          {t.edit.detectAll}
        </button>
        <button className='btn-outline' onClick={() => selectedImageId && handleDetectSingle(selectedImageId)}
          disabled={detecting || !selectedImageId}>
          <RefreshCw size={14} />
          {t.edit.detect}
        </button>
      </div>

      {/* OCR results */}
      {currentBoxes.length > 0 && (
        <div className='ocr-box-list'>
          <div className='ocr-box-list-title'>
            {currentBoxes.length} {t.edit.textsFound}
          </div>
          {currentBoxes.map((box) => (
            <div
              key={box.id}
              className={'ocr-box-item' + (editParams.selectedOcrId === box.id ? ' active' : '')}
              onClick={() => handleSelectBox(box)}
            >
              <span className='ocr-box-text'>{box.text}</span>
              <span className='ocr-box-conf'>{Math.round(box.confidence * 100)}%</span>
              {editParams.selectedOcrId === box.id && <Check size={12} />}
            </div>
          ))}
        </div>
      )}

      {currentBoxes.length === 0 && !detecting && (
        <div className='empty-hint' style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
          {t.edit.noTexts}
        </div>
      )}

      {/* Edit panel (shown when a box is selected) */}
      {selectedOcrBox && (
        <div className='edit-params'>
          <div className='form-group'>
            <label>{t.edit.selectedText}</label>
            <input
              type='text'
              className='form-input'
              value={selectedOcrBox.text}
              readOnly
              style={{ opacity: 0.6, fontSize: 12 }}
            />
          </div>
          <div className='form-group'>
            <label>{t.edit.newText}</label>
            <input
              type='text'
              className='form-input'
              value={editParams.newText}
              onChange={(e) => setEditParams({ newText: e.target.value })}
              placeholder={selectedOcrBox.text}
            />
          </div>

          <div className='form-divider' />
          <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>{t.edit.styleAuto}</label>

          <div className='form-group'>
            <label>{t.edit.color}</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type='color'
                className='form-input' style={{ width: 40, height: 30, padding: 2 }}
                value={editParams.style.color}
                onChange={(e) => setEditParams({ style: { ...editParams.style, color: e.target.value } })}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{editParams.style.color}</span>
            </div>
          </div>

          <div className='form-group'>
            <label>{t.edit.font}</label>
            <select
              className='form-input'
              value={editParams.style.fontFamily}
              onChange={(e) => setEditParams({ style: { ...editParams.style, fontFamily: e.target.value } })}
            >
              <option value='Arial'>Arial</option>
              <option value='Microsoft YaHei'>Microsoft YaHei</option>
              <option value='SimHei'>SimHei</option>
              <option value='Times New Roman'>Times New Roman</option>
              <option value='Courier New'>Courier New</option>
              <option value='Verdana'>Verdana</option>
            </select>
          </div>

          <div className='form-group'>
            <label>{t.edit.size}: {editParams.style.fontSize}px</label>
            <input
              type='range' min='8' max='120'
              className='form-input'
              value={editParams.style.fontSize}
              onChange={(e) => setEditParams({ style: { ...editParams.style, fontSize: Number(e.target.value) } })}
            />
          </div>

          <div className='form-group'>
            <label>{t.edit.opacity}: {editParams.style.opacity}%</label>
            <input
              type='range' min='0' max='100'
              className='form-input'
              value={editParams.style.opacity}
              onChange={(e) => setEditParams({ style: { ...editParams.style, opacity: Number(e.target.value) } })}
            />
          </div>

          <div className='form-group'>
            <label>{t.edit.rotation}: {editParams.style.rotation}°</label>
            <input
              type='range' min='-180' max='180'
              className='form-input'
              value={editParams.style.rotation}
              onChange={(e) => setEditParams({ style: { ...editParams.style, rotation: Number(e.target.value) } })}
            />
          </div>

          <div className='form-group'>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type='checkbox'
                checked={!!editParams.style.shadow}
                onChange={(e) => setEditParams({
                  style: {
                    ...editParams.style,
                    shadow: e.target.checked
                      ? { enabled: true, color: '#000000', blur: 3, offsetX: 2, offsetY: 2 }
                      : null,
                  },
                })}
              />
              {t.edit.shadow}
            </label>
          </div>

          <div className='form-group'>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type='checkbox'
                checked={!!editParams.style.stroke}
                onChange={(e) => setEditParams({
                  style: {
                    ...editParams.style,
                    stroke: e.target.checked
                      ? { enabled: true, color: '#FFFFFF', width: 1 }
                      : null,
                  },
                })}
              />
              {t.edit.stroke}
            </label>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className='edit-preview'>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Preview</label>
              <img src={previewUrl} alt='preview' style={{ width: '100%', borderRadius: 4, border: '1px solid var(--border)' }} />
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className='action-bar' style={{ marginTop: 12 }}>
        <button className='btn-primary' onClick={handleApply}
          disabled={applying || !selectedOcrBox}>
          {applying ? <Loader2 size={14} className='spin' /> : <Check size={14} />}
          {t.edit.apply}
        </button>
        <button className='btn-outline' onClick={handleApplyAll}
          disabled={applying || !selectedOcrBox || images.length <= 1}>
          {t.edit.applyToAll}
        </button>
      </div>
    </div>
  )
}
