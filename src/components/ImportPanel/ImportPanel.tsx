import { useCallback, useState, useRef } from 'react'
import { Upload, FolderOpen, X, Image } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { formatFileSize } from '../../utils/fileUtils'
import { useTranslation } from '../../i18n/useTranslation'

interface Props {
  onFilesSelected: (files: File[]) => void
  onClickImport: () => void
}

export function ImportPanel({ onFilesSelected, onClickImport }: Props) {
  const t = useTranslation()
  const [dragOver, setDragOver] = useState(false)
  const images = useAppStore((s) => s.images)
  const removeImage = useAppStore((s) => s.removeImage)
  const clearImages = useAppStore((s) => s.clearImages)
  const selectedImageId = useAppStore((s) => s.selectedImageId)
  const setSelectedImageId = useAppStore((s) => s.setSelectedImageId)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(true)
  }, [])
  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files))
    }
  }, [onFilesSelected])

  return (
    <div className='import-panel'>
      <div className='import-panel-header'>
        <span>{t.files.title}</span>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          {images.length}
        </span>
      </div>

      <div
        className={'import-dropzone' + (dragOver ? ' drag-over' : '')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={onClickImport}
      >
        <Upload size={32} />
        <div className='import-dropzone-title'>{t.common.dropHint}</div>
        
      </div>

      <div className='import-btn-row'>
        <button className='btn-secondary' onClick={onClickImport}>
          <Upload size={14} /> {t.common.import}
        </button>
        <button className='btn-secondary' onClick={clearImages}>
          <X size={14} /> {t.common.clear}
        </button>
      </div>

      <div className='file-list'>
        {images.map((img) => (
          <div
            key={img.id}
            className={'file-item' + (img.id === selectedImageId ? ' selected' : '')}
            onClick={() => setSelectedImageId(img.id)}
          >
            <img className='file-thumb' src={img.dataUrl} alt={img.name} />
            <div className='file-info'>
              <div className='file-name'>{img.name}</div>
              <div className='file-meta'>{img.width}x{img.height} {'|'} {formatFileSize(img.size)}</div>
            </div>
            <div className={'file-status ' + img.status} />
            <button
              className='file-remove'
              onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {images.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Image size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div style={{ fontSize: 'var(--font-size-sm)' }}>{t.common.noImages}</div>
          </div>
        )}
      </div>
    </div>
  )
}
