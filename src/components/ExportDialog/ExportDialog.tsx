import { useState, useCallback } from 'react'
import { Download, FileDown, Archive, X } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { canvasToBlob } from '../../utils/watermarkEngine'
import type { ExportFormat } from '../../types'
import { useTranslation } from '../../i18n/useTranslation'

export function ExportDialog() {
  const t = useTranslation()
  const images = useAppStore((s) => s.images)
  const setShowExportDialog = useAppStore((s) => s.setShowExportDialog)
  const exportSettings = useAppStore((s) => s.exportSettings)
  const setExportSettings = useAppStore((s) => s.setExportSettings)
  const [exporting, setExporting] = useState(false)

  const doneImages = images.filter((i) => i.status === 'done' && i.processedDataUrl)

  const handleExportSingle = useCallback(async (img: (typeof images)[0]) => {
    if (!img.processedDataUrl) return
    const blob = await canvasToBlob(img.processedDataUrl, exportSettings.format, exportSettings.quality)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const baseName = img.name.replace(/\\.[^.]+$/, '')
    a.href = url
    a.download = baseName + '.' + exportSettings.format
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [exportSettings])

  const handleExportAll = useCallback(async () => {
    if (doneImages.length === 0) return
    setExporting(true)
    try {
      // Using JSZip for the real ZIP, fallback to sequential download
      const JSZip = (await import('jszip')).default
      const { saveAs } = await import('file-saver')
      const zip = new JSZip()

      for (const img of doneImages) {
        if (!img.processedDataUrl) continue
        const blob = await canvasToBlob(img.processedDataUrl, exportSettings.format, exportSettings.quality)
        const baseName = img.name.replace(/\\.[^.]+$/, '')
        zip.file(baseName + '.' + exportSettings.format, blob)
      }

      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, 'watermarked-images.zip')
    } catch (err) {
      console.error('Export failed:', err)
    }
    setExporting(false)
  }, [doneImages, exportSettings])

  return (
    <div className='dialog-overlay' onClick={() => setShowExportDialog(false)}>
      <div className='dialog' onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>{t.export_.title}</h2>
          <button className='btn-sm-icon' onClick={() => setShowExportDialog(false)}><X size={16} /></button>
        </div>

        <div className='param-group'>
          <label className='param-label'>{t.export_.format}</label>
          <select value={exportSettings.format} onChange={(e) => setExportSettings({ format: e.target.value as ExportFormat })}>
            <option value='png'>PNG</option>
            <option value='jpeg'>JPEG</option>
            <option value='webp'>WebP</option>
          </select>
        </div>

        {(exportSettings.format === 'jpeg' || exportSettings.format === 'webp') && (
          <div className='param-group'>
            <label className='param-label'>{t.export_.quality}: {exportSettings.quality}%</label>
            <input type='range' min='1' max='100' value={exportSettings.quality} onChange={(e) => setExportSettings({ quality: Number(e.target.value) })} />
          </div>
        )}

        <div className='param-group'>
          <label className='param-label'>{t.export_.naming}</label>
          <select value={exportSettings.naming.pattern} onChange={(e) => setExportSettings({ naming: { ...exportSettings.naming, pattern: e.target.value as any } })}>
            <option value='original'>{t.export_.originalName}</option>
            <option value='prefix'>{t.export_.prefixName}</option>
            <option value='sequence'>{t.export_.sequenceName}</option>
          </select>
        </div>

        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 16 }}>
          {doneImages.length} of {images.length} {t.export_.imagesReady}
        </div>

        <div className='dialog-actions'>
          <button className='btn-secondary' onClick={() => setShowExportDialog(false)}>{t.common.cancel}</button>
          <button className='btn-primary' onClick={handleExportAll} disabled={doneImages.length === 0 || exporting}>
            <Archive size={16} /> {exporting ? '{t.common.processing}' : '{t.export_.zipExport}'}
          </button>
        </div>

        {doneImages.length > 0 && (
          <div style={{ marginTop: 16, maxHeight: 200, overflowY: 'auto' }}>
            <label className='param-label' style={{ marginBottom: 8 }}>{t.common.download}</label>
            {doneImages.map((img) => (
              <div key={img.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <img src={img.processedDataUrl!} alt='' style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, background: 'var(--bg-elevated)' }} />
                <span style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{img.name}</span>
                <button className='btn-sm-icon' onClick={() => handleExportSingle(img)} title={t.common.download}>
                  <FileDown size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


