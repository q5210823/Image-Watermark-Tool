import { useRef } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { readFileAsDataUrl } from '../../utils/fileUtils'
import type { ImageWatermarkParams, PositionPreset } from '../../types'

const BLEND_MODES = ['normal','multiply','screen','overlay','darken','lighten']
const POSITIONS: { value: PositionPreset; label: string }[] = [
  { value: 'top-left', label: 'TL' }, { value: 'top-center', label: 'TC' }, { value: 'top-right', label: 'TR' },
  { value: 'center-left', label: 'CL' }, { value: 'center', label: 'C' }, { value: 'center-right', label: 'CR' },
  { value: 'bottom-left', label: 'BL' }, { value: 'bottom-center', label: 'BC' }, { value: 'bottom-right', label: 'BR' },
]

interface Props {
  params: ImageWatermarkParams;
  onChange: (params: Partial<ImageWatermarkParams>) => void;
}

export function ImageWatermarkForm({ params: p, onChange: set }: Props) {
  const t = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    set({ logoDataUrl: dataUrl, logoFileName: file.name })
  }

  return (
    <div>
      <div className='param-group'>
        <label className='param-label'>{t.watermark.logoImage}</label>
        <input ref={inputRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={handleLogoUpload} />
        {p.logoDataUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={p.logoDataUrl} alt='logo' style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }} />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', flex: 1 }}>{p.logoFileName}</span>
            <button className='btn-sm-icon' onClick={() => set({ logoDataUrl: null, logoFileName: '' })}>X</button>
          </div>
        ) : (
          <button className='btn-secondary' onClick={() => inputRef.current?.click()}>{t.watermark.selectLogo}</button>
        )}
      </div>

      <div className='param-group'>
        <label className='param-label'>{t.watermark.scale}: {p.scale}%</label>
        <input type='range' min='1' max='100' value={p.scale} onChange={(e) => set({ scale: Number(e.target.value) })} />
      </div>

      <div className='param-group'>
        <label className='param-label'>{t.watermark.opacity}: {p.opacity}%</label>
        <input type='range' min='0' max='100' value={p.opacity} onChange={(e) => set({ opacity: Number(e.target.value) })} />
      </div>

      <div className='param-group'>
        <label className='param-label'>{t.watermark.blendMode}</label>
        <select value={p.blendMode} onChange={(e) => set({ blendMode: e.target.value as any })}>
          {BLEND_MODES.map((m) => (<option key={m} value={m}>{m}</option>))}
        </select>
      </div>

      <div className='param-group'>
        <label className='param-label'>{t.watermark.rotation}: {p.rotation}°</label>
        <input type='range' min='-180' max='180' value={p.rotation} onChange={(e) => set({ rotation: Number(e.target.value) })} />
      </div>

      <div className='param-group'>
        <label className='param-label'>{t.watermark.position}</label>
        <div className='position-grid'>
          {POSITIONS.map((pos) => (
            <button key={pos.value} className={'position-btn' + (p.position.preset === pos.value ? ' active' : '')}
              onClick={() => set({ position: { ...p.position, preset: pos.value } })}>{pos.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}