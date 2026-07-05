import { useCallback, useRef } from 'react'
import { ImportPanel } from './components/ImportPanel/ImportPanel'
import { PreviewGrid } from './components/PreviewGrid/PreviewGrid'
import { WatermarkPanel } from './components/WatermarkPanel/WatermarkPanel'
import { StatusBar } from './components/StatusBar/StatusBar'
import { ExportDialog } from './components/ExportDialog/ExportDialog'
import { ImageViewer } from './components/ImageViewer/ImageViewer'
import { useAppStore } from './stores/useAppStore'
import { loadImageFiles, readFileAsDataUrl, getImageDimensions, generateId, formatFileSize } from './utils/fileUtils'
import type { ImageItem } from './types'
import './styles/components.css'

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addImages = useAppStore((s) => s.addImages)
  const showExportDialog = useAppStore((s) => s.showExportDialog)

  const handleFiles = useCallback(async (files: File[]) => {
    const imageFiles = await loadImageFiles(files as unknown as FileList)
    const items: ImageItem[] = []
    for (const file of imageFiles) {
      try {
        const [dataUrl, dims] = await Promise.all([
          readFileAsDataUrl(file),
          getImageDimensions(file),
        ])
        items.push({
          id: generateId(),
          name: file.name,
          path: file.name,
          dataUrl,
          width: dims.width,
          height: dims.height,
          size: file.size,
          format: file.type,
          status: 'pending',
          processedDataUrl: null,
        })
      } catch {
        // skip failed files
      }
    }
    if (items.length > 0) addImages(items)
  }, [addImages])

  const handleClickImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/jpeg,image/png,image/webp,image/bmp,image/tiff'
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files) handleFiles(Array.from(files))
    }
    input.click()
  }

  return (
    <div className='app-layout'>
      <div className='app-main'>
        <ImportPanel onFilesSelected={handleFiles} onClickImport={handleClickImport} />
        <PreviewGrid />
        <WatermarkPanel />
      </div>
      <StatusBar onClickExport={() => useAppStore.getState().setShowExportDialog(true)} />
      {showExportDialog && <ExportDialog />}
      <ImageViewer />
    </div>
  )
}
