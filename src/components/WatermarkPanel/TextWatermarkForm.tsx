import { useTranslation } from '../../i18n/useTranslation'
import type { TextWatermarkParams, PositionPreset } from '../../types'

const POSITIONS: { value: PositionPreset; label: string }[] = [
  { value: 'top-left', label: 'TL' }, { value: 'top-center', label: 'TC' }, { value: 'top-right', label: 'TR' },
  { value: 'center-left', label: 'CL' }, { value: 'center', label: 'C' }, { value: 'center-right', label: 'CR' },
  { value: 'bottom-left', label: 'BL' }, { value: 'bottom-center', label: 'BC' }, { value: 'bottom-right', label: 'BR' },
]

interface Props {
  params: TextWatermarkParams;
  onChange: (params: Partial<TextWatermarkParams>) => void;
}

export function TextWatermarkForm({ params: p, onChange: set }: Props) {
  const t = useTranslation()

  return (
    <div>
      <div className='param-group'>
        <label className='param-label'>{t.watermark.content}</label>
        <input type='text' value={p.content} onChange={(e) => set({ content: e.target.value })} />
      </div>

      <div className='param-group'>
        <label className='param-label'>{t.watermark.font}</label>
        <div className='param-row'>
          <select value={p.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
            <option value='Arial'>Arial</option>
            <option value='Verdana'>Verdana</option>
            <option value='Georgia'>Georgia</option>
            <option value='Times New Roman'>Times New Roman</option>
            <option value='Courier New'>Courier New</option>
            <option value='Microsoft YaHei'>Microsoft YaHei</option>
            <option value='SimHei'>SimHei</option>
            <option value='Noto Sans SC'>Noto Sans SC</option>
          </select>
        </div>
      </div>

      <div className='param-group'>
        <label className='param-label'>{t.watermark.size}: {p.fontSize}px</label>
        <input type='range' min='12' max='200' value={p.fontSize} onChange={(e) => set({ fontSize: Number(e.target.value) })} />
      </div>

      <div className='param-group'>
        <label className='param-label'>{t.watermark.color}</label>
        <div className='param-row'>
          <input type='color' value={p.color} onChange={(e) => set({ color: e.target.value })} />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{p.color}</span>
        </div>
      </div>

      <div className='param-group'>
        <label className='param-label'>{t.watermark.opacity}: {p.opacity}%</label>
        <input type='range' min='0' max='100' value={p.opacity} onChange={(e) => set({ opacity: Number(e.target.value) })} />
      </div>

      <div className='param-group'>
        <label className='param-label'>{t.watermark.rotation}: {p.rotation}°</label>
        <input type='range' min='-180' max='180' value={p.rotation} onChange={(e) => set({ rotation: Number(e.target.value) })} />
      </div>

      <div className='param-group'>
        <div className='switch-row'>
          <span className='param-label'>{t.watermark.shadow}</span>
          <div className={'switch' + (p.shadow?.enabled ? ' active' : '')} onClick={() => set({ shadow: p.shadow?.enabled ? null : { enabled: true, color: '#000000', blur: 4, offsetX: 2, offsetY: 2 } })} />
        </div>
      </div>

      <div className='param-group'>
        <div className='switch-row'>
          <span className='param-label'>{t.watermark.stroke}</span>
          <div className={'switch' + (p.stroke?.enabled ? ' active' : '')} onClick={() => set({ stroke: p.stroke?.enabled ? null : { enabled: true, color: '#000000', width: 2 } })} />
        </div>
      </div>

      <div className='param-group'>
        <label className='param-label'>{t.watermark.position}</label>
        <div className='position-grid'>
          {POSITIONS.map((pos) => (
            <button
              key={pos.value}
              className={'position-btn' + (p.position.preset === pos.value ? ' active' : '')}
              onClick={() => set({ position: { ...p.position, preset: pos.value } })}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      <div className='param-group'>
        <label className='param-label'>{t.watermark.margin}: {p.margin}px</label>
        <input type='range' min='0' max='100' value={p.margin} onChange={(e) => set({ margin: Number(e.target.value) })} />
      </div>
    </div>
  )
}