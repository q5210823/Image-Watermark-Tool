import { useRef } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useTranslation } from '../../i18n/useTranslation'
import { readFileAsDataUrl } from '../../utils/fileUtils'

export function PatternWatermarkForm() {
  const t = useTranslation()
  const p = useAppStore((s) => s.patternParams)
  const set = useAppStore((s) => s.setPatternParams)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <div className='param-group'>
        <label className='param-label'>{t.watermark.patternStyle}</label>
        <select value={p.patternStyle} onChange={(e) => set({ patternStyle: e.target.value as any })}>
          <option value='grid'>{t.watermark.grid}</option>
          <option value='diagonal'>{t.watermark.diagonal}</option>
          <option value='tile'>{t.watermark.tile}</option>
        </select>
      </div>

      <div className='param-group'>
        <label className='param-label'>{t.watermark.opacity}: {p.opacity}%</label>
        <input type='range' min='0' max='100' value={p.opacity} onChange={(e) => set({ opacity: Number(e.target.value) })} />
      </div>

      {p.patternStyle === 'grid' && (
        <>
          <div className='param-group'>
            <label className='param-label'>{t.watermark.lineWidth}: {p.gridLineWidth}px</label>
            <input type='range' min='1' max='10' value={p.gridLineWidth} onChange={(e) => set({ gridLineWidth: Number(e.target.value) })} />
          </div>
          <div className='param-group'>
            <label className='param-label'>{t.watermark.color}</label>
            <div className='param-row'>
              <input type='color' value={p.gridColor} onChange={(e) => set({ gridColor: e.target.value })} />
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{p.gridColor}</span>
            </div>
          </div>
          <div className='param-group'>
            <label className='param-label'>{t.watermark.spacing}: {p.gridSpacing}px</label>
            <input type='range' min='20' max='300' value={p.gridSpacing} onChange={(e) => set({ gridSpacing: Number(e.target.value) })} />
          </div>
        </>
      )}

      {p.patternStyle === 'diagonal' && (
        <>
          <div className='param-group'>
            <label className='param-label'>{t.watermark.lineWidth}: {p.diagLineWidth}px</label>
            <input type='range' min='1' max='20' value={p.diagLineWidth} onChange={(e) => set({ diagLineWidth: Number(e.target.value) })} />
          </div>
          <div className='param-group'>
            <label className='param-label'>{t.watermark.color}</label>
            <div className='param-row'>
              <input type='color' value={p.diagColor} onChange={(e) => set({ diagColor: e.target.value })} />
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{p.diagColor}</span>
            </div>
          </div>
          <div className='param-group'>
            <label className='param-label'>{t.watermark.rotation}: {p.diagAngle}\u00B0</label>
            <input type='range' min='0' max='180' value={p.diagAngle} onChange={(e) => set({ diagAngle: Number(e.target.value) })} />
          </div>
          <div className='param-group'>
            <label className='param-label'>{t.watermark.spacing}: {p.diagSpacing}px</label>
            <input type='range' min='20' max='300' value={p.diagSpacing} onChange={(e) => set({ diagSpacing: Number(e.target.value) })} />
          </div>
        </>
      )}

      {p.patternStyle === 'tile' && (
        <>
          <div className='param-group'>
            <label className='param-label'>{t.watermark.logoImage}</label>
            <input ref={inputRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) {
                set({ tileDataUrl: await readFileAsDataUrl(file), tileName: file.name })
              }
            }} />
            {p.tileDataUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={p.tileDataUrl} alt='tile' style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }} />
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', flex: 1 }}>{p.tileName}</span>
                <button className='btn-sm-icon' onClick={() => set({ tileDataUrl: undefined, tileName: undefined })}>X</button>
              </div>
            ) : (
              <button className='btn-secondary' onClick={() => inputRef.current?.click()}>{t.watermark.selectTile}</button>
            )}
          </div>
          <div className='param-group'>
            <label className='param-label'>{t.watermark.spacing}: {p.tileSpacing || 0}px</label>
            <input type='range' min='0' max='100' value={p.tileSpacing || 0} onChange={(e) => set({ tileSpacing: Number(e.target.value) })} />
          </div>
        </>
      )}
    </div>
  )
}

