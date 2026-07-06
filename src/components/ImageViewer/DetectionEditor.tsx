import { useState, useCallback, useRef, useEffect } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import type { EditableBbox } from '../../types'

let _bid = 0
function nid() { return `b_${++_bid}` }

interface Props {
  imageId: string;
  onClose: () => void;
}

export function DetectionEditor({ imageId, onClose }: Props) {
  const images = useAppStore((s) => s.images)
  const userBboxes = useAppStore((s) => s.userBboxes)
  const setUserBboxes = useAppStore((s) => s.setUserBboxes)
  const setSelectedImageId = useAppStore((s) => s.setSelectedImageId)
  const workMode = useAppStore((s) => s.workMode)

  const img = images.find(i => i.id === imageId)
  const boxes = userBboxes[imageId] || []

  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [drag, setDrag] = useState<{ id: string; type: 'move' | 'resize'; handle?: string; sx: number; sy: number; orig: EditableBbox } | null>(null)

  const isEditMode = workMode === 'edit'

  const getImgOffset = useCallback(() => {
    const cr = containerRef.current?.getBoundingClientRect()
    const ir = imgRef.current?.getBoundingClientRect()
    if (!cr || !ir || !img) return { ox: 0, oy: 0, scx: 1, scy: 1 }
    return {
      ox: ir.left - cr.left,
      oy: ir.top - cr.top,
      scx: ir.width / img.width,
      scy: ir.height / img.height,
    }
  }, [img, loaded])

  useEffect(() => { setSelectedImageId(imageId) }, [imageId, setSelectedImageId])

  const updateBox = useCallback((boxId: string, upd: Partial<EditableBbox>) => {
    setUserBboxes(imageId, boxes.map(b => b.id === boxId ? { ...b, ...upd } : b))
  }, [imageId, boxes, setUserBboxes])

  const addBox = useCallback(() => {
    if (!img) return
    const w = img.width * 0.2, h = img.height * 0.1
    setUserBboxes(imageId, [...boxes, { id: nid(), x1: img.width - w - 10, y1: img.height - h - 10, x2: img.width - 10, y2: img.height - 10, confidence: 1 }])
  }, [img, imageId, boxes, setUserBboxes])

  const removeBox = useCallback((boxId: string) => {
    setUserBboxes(imageId, boxes.filter(b => b.id !== boxId))
  }, [imageId, boxes, setUserBboxes])

  const handleMouseDown = useCallback((e: React.MouseEvent, boxId: string) => {
    e.preventDefault(); e.stopPropagation()
    if (!img) return
    const box = boxes.find(b => b.id === boxId)
    if (!box) return
    const target = e.target as HTMLElement
    const isHandle = !!target.closest('.det-handle')
    const dir = target.getAttribute('data-dir') || ''
    setDrag({ id: boxId, type: isHandle ? 'resize' : 'move', handle: dir, sx: e.clientX, sy: e.clientY, orig: { ...box } })
  }, [img, boxes])

  useEffect(() => {
    if (!drag || !img || !imgRef.current || !containerRef.current) return
    const { scx, scy } = getImgOffset()
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - drag.sx) / scx
      const dy = (e.clientY - drag.sy) / scy
      const o = drag.orig
      if (drag.type === 'move') {
        updateBox(drag.id, { x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy })
      } else {
        const h = drag.handle || 'se'
        let { x1, y1, x2, y2 } = o
        if (h.includes('e')) x2 = o.x2 + dx; if (h.includes('w')) x1 = o.x1 + dx
        if (h.includes('s')) y2 = o.y2 + dy; if (h.includes('n')) y1 = o.y1 + dy
        updateBox(drag.id, { x1, y1, x2, y2 })
      }
    }
    const onUp = () => setDrag(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [drag, img, updateBox, getImgOffset])

  if (!img) return null

  const { ox, oy, scx, scy } = getImgOffset()

  return (
    <div className='det-editor-overlay' onClick={onClose}>
      <div className='det-editor-toolbar'>
        <span style={{ color: '#fff', fontSize: 13 }}>{img.name} ({img.width}&times;{img.height}) {boxes.length} box(es)</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {!isEditMode && (
            <button className='det-editor-btn' onClick={(e) => { e.stopPropagation(); addBox() }}><Plus size={14} /> Add Box</button>
          )}
          <button className='det-editor-btn' onClick={(e) => { e.stopPropagation(); onClose() }}>Done &#10003;</button>
        </div>
      </div>
      <div className='det-editor-body' ref={containerRef} onClick={(e) => e.stopPropagation()}>
        <img ref={imgRef} src={img.dataUrl} alt='' draggable={false} className='det-editor-img'
          onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} />
        {loaded && boxes.map(box => {
          const l = ox + box.x1 * scx, t = oy + box.y1 * scy
          const w = (box.x2 - box.x1) * scx, h = (box.y2 - box.y1) * scy
          return (
            <div key={box.id}
              className={'det-box' + (isEditMode ? ' edit-mode' : '')}
              style={{ left: l, top: t, width: w, height: h }}
              onMouseDown={(e) => handleMouseDown(e, box.id)}>
              <span className='det-box-label'>{isEditMode ? 'Edit' : `${Math.round(box.confidence * 100)}%`}</span>
              {!isEditMode && (
                <span className='det-box-x' onMouseDown={(e) => { e.stopPropagation(); removeBox(box.id) }}><Trash2 size={10} /></span>
              )}
              <span className='det-handle nw' data-dir='nw' /><span className='det-handle ne' data-dir='ne' />
              <span className='det-handle sw' data-dir='sw' /><span className='det-handle se' data-dir='se' />
              <span className='det-handle n' data-dir='n' /><span className='det-handle s' data-dir='s' />
              <span className='det-handle w' data-dir='w' /><span className='det-handle e' data-dir='e' />
            </div>
          )
        })}
      </div>
    </div>
  )
}
