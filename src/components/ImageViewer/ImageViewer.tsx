import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export function ImageViewer() {
  const images = useAppStore((s) => s.images)
  const selectedId = useAppStore((s) => s.selectedImageId)
  const setSelectedId = useAppStore((s) => s.setSelectedImageId)
  // We use a simple modal when clicking the image in preview - for MVP just close on overlay click
  const [viewerImg, setViewerImg] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewerImg(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!viewerImg) return null

  return (
    <div className='viewer-overlay' onClick={() => setViewerImg(null)}>
      <img src={viewerImg} alt='preview' />
    </div>
  )
}

// Export a helper to open the viewer from other components
export let openImageViewer: (dataUrl: string) => void = () => {}

// Re-export a setter via module augmentation pattern - simple approach:
// We expose a global setter for now. In production use context/zustand.
export function setImageViewer(fn: (url: string) => void) {
  openImageViewer = fn
}
