import { useState, useCallback, useRef } from 'react'
import { Save, Upload, FileJson, Trash2, Download } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useTranslation } from '../../i18n/useTranslation'
import type { WatermarkLayer } from '../../types'

interface PresetData {
  name: string;
  layers: WatermarkLayer[];
  version: string;
  createdAt: string;
}

export function PresetManager() {
  const t = useTranslation()
  const layers = useAppStore((s) => s.layers)
  const addLayer = useAppStore((s) => s.addLayer)
  const loadFileRef = useRef<HTMLInputElement>(null)
  const [presets, setPresets] = useState<{ name: string; data: PresetData }[]>(() => {
    try {
      const saved = localStorage.getItem('wm-presets')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const handleSavePreset = useCallback(() => {
    const name = prompt('Preset name:', 'My Preset ' + (presets.length + 1))
    if (!name) return
    const preset: PresetData = { name, layers, version: '1.0', createdAt: new Date().toISOString() }
    const updated = [...presets.filter((p) => p.name !== name), { name, data: preset }]
    setPresets(updated)
    localStorage.setItem('wm-presets', JSON.stringify(updated))
  }, [layers, presets])

  const handleLoadPreset = useCallback((preset: PresetData) => {
    // Replace current layers with preset layers
    preset.layers.forEach((layer, i) => {
      if (i > 0) addLayer(layer.params)
    })
    // The first layer can't be removed (min 1), so update it
    const store = useAppStore.getState()
    if (preset.layers.length > 0) {
      store.updateLayer(0, preset.layers[0].params)
    }
  }, [addLayer])

  const handleDeletePreset = useCallback((name: string) => {
    const updated = presets.filter((p) => p.name !== name)
    setPresets(updated)
    localStorage.setItem('wm-presets', JSON.stringify(updated))
  }, [presets])

  const handleExportPreset = useCallback(() => {
    const preset: PresetData = {
      name: 'Exported Preset',
      layers,
      version: '1.0',
      createdAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'watermark-preset.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [layers])

  const handleImportPreset = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const preset: PresetData = JSON.parse(text)
      if (preset.layers && preset.layers.length > 0) {
        handleLoadPreset(preset)
      }
    } catch (err) {
      alert('Invalid preset file')
    }
    if (loadFileRef.current) loadFileRef.current.value = ''
  }, [handleLoadPreset])

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '8px 12px' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <button className='btn-secondary' onClick={handleSavePreset} style={{ flex: 1, fontSize: 'var(--font-size-xs)', padding: 6 }}>
          <Save size={12} /> Save
        </button>
        <button className='btn-secondary' onClick={handleExportPreset} style={{ flex: 1, fontSize: 'var(--font-size-xs)', padding: 6 }}>
          <Download size={12} /> Export
        </button>
        <button className='btn-secondary' onClick={() => loadFileRef.current?.click()} style={{ flex: 1, fontSize: 'var(--font-size-xs)', padding: 6 }}>
          <Upload size={12} /> Import
        </button>
      </div>
      <input ref={loadFileRef} type='file' accept='.json' style={{ display: 'none' }} onChange={handleImportPreset} />
      {presets.length > 0 && (
        <div style={{ maxHeight: 100, overflowY: 'auto' }}>
          {presets.map((p) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' }}>
              <FileJson size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => handleLoadPreset(p.data)}
              >{p.name}</span>
              <button className='btn-sm-icon' onClick={() => handleDeletePreset(p.name)} style={{ width: 18, height: 18, color: 'var(--error)' }}>
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}