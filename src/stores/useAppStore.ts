import { create } from 'zustand';
import type {
  ImageItem, WatermarkParams, WatermarkType,
  ExportSettings, PositionPreset,
  TextWatermarkParams, ImageWatermarkParams, PatternWatermarkParams,
  WatermarkLayer,
} from '../types';
import {
  DEFAULT_TEXT_PARAMS, DEFAULT_IMAGE_PARAMS, DEFAULT_PATTERN_PARAMS,
} from '../types';

interface AppState {
  language: 'en' | 'zh';
  setLanguage: (lang: 'en' | 'zh') => void;
  images: ImageItem[];
  addImages: (images: ImageItem[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  updateImageStatus: (id: string, status: ImageItem['status'], processedDataUrl?: string | null, error?: string) => void;
  reorderImages: (from: number, to: number) => void;
  layers: WatermarkLayer[];
  activeLayerIndex: number;
  setActiveLayerIndex: (index: number) => void;
  addLayer: (params: WatermarkParams) => void;
  removeLayer: (index: number) => void;
  updateLayer: (index: number, params: Partial<WatermarkParams>) => void;
  toggleLayer: (index: number) => void;
  reorderLayer: (from: number, to: number) => void;
  getEnabledLayers: () => WatermarkLayer[];
  isProcessing: boolean;
  processingProgress: { current: number; total: number };
  setProcessing: (processing: boolean) => void;
  setProcessingProgress: (progress: { current: number; total: number }) => void;
  exportSettings: ExportSettings;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  selectedImageId: string | null;
  setSelectedImageId: (id: string | null) => void;
  showExportDialog: boolean;
  setShowExportDialog: (show: boolean) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  previewScale: number;
  setPreviewScale: (scale: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  images: [],
  addImages: (newImages) => set((s) => ({ images: [...s.images, ...newImages] })),
  removeImage: (id) => set((s) => ({ images: s.images.filter((i) => i.id !== id) })),
  clearImages: () => set({ images: [] }),
  updateImageStatus: (id, status, processedDataUrl, error) =>
    set((s) => ({
      images: s.images.map((i) =>
        i.id === id ? { ...i, status, processedDataUrl: processedDataUrl ?? i.processedDataUrl, error } : i
      ),
    })),
  reorderImages: (from, to) =>
    set((s) => {
      const arr = [...s.images];
      const [removed] = arr.splice(from, 1);
      arr.splice(to, 0, removed);
      return { images: arr };
    }),
  layers: [{ id: 'layer-1', enabled: true, name: 'Layer 1', params: { ...DEFAULT_TEXT_PARAMS } }],
  activeLayerIndex: 0,
  setActiveLayerIndex: (index) => set({ activeLayerIndex: index }),
  addLayer: (params) => set((s) => ({
    layers: [...s.layers, { id: 'layer-' + Date.now(), enabled: true, name: 'Layer ' + (s.layers.length + 1), params }],
    activeLayerIndex: s.layers.length,
  })),
  removeLayer: (index) => set((s) => {
    const arr = s.layers.filter((_, i) => i !== index);
    return { layers: arr, activeLayerIndex: Math.min(s.activeLayerIndex, arr.length - 1) };
  }),
  updateLayer: (index, params) => set((s) => ({
    layers: s.layers.map((l, i) => i === index ? { ...l, params: { ...l.params, ...params } as WatermarkParams } : l),
  })),
  toggleLayer: (index) => set((s) => ({
    layers: s.layers.map((l, i) => i === index ? { ...l, enabled: !l.enabled } : l),
  })),
  reorderLayer: (from, to) => set((s) => {
    const arr = [...s.layers];
    const [removed] = arr.splice(from, 1);
    arr.splice(to, 0, removed);
    return { layers: arr, activeLayerIndex: to };
  }),
  getEnabledLayers: () => get().layers.filter((l) => l.enabled),
  isProcessing: false,
  processingProgress: { current: 0, total: 0 },
  setProcessing: (processing) => set({ isProcessing: processing }),
  setProcessingProgress: (progress) => set({ processingProgress: progress }),
  exportSettings: { format: 'png', quality: 90, naming: { pattern: 'original' } },
  setExportSettings: (settings) => set((s) => ({ exportSettings: { ...s.exportSettings, ...settings } })),
  selectedImageId: null,
  setSelectedImageId: (id) => set({ selectedImageId: id }),
  showExportDialog: false,
  setShowExportDialog: (show) => set({ showExportDialog: show }),
  rightPanelOpen: true,
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  previewScale: 150,
  language: 'zh' as 'en' | 'zh',
  setPreviewScale: (scale) => set({ previewScale: scale }),
  setLanguage: (lang) => set({ language: lang }),
}));