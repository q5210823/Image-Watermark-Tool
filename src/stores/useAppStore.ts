import { create } from 'zustand';
import type {
  ImageItem, WatermarkParams, WatermarkType,
  ExportSettings, PositionPreset,
  TextWatermarkParams, ImageWatermarkParams, PatternWatermarkParams,
} from '../types';
import {
  DEFAULT_TEXT_PARAMS, DEFAULT_IMAGE_PARAMS, DEFAULT_PATTERN_PARAMS,
} from '../types';

interface AppState {
  language: 'en' | 'zh';
  setLanguage: (lang: 'en' | 'zh') => void;
  // Images
  images: ImageItem[];
  addImages: (images: ImageItem[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  updateImageStatus: (id: string, status: ImageItem['status'], processedDataUrl?: string | null, error?: string) => void;
  reorderImages: (from: number, to: number) => void;

  // Watermark type
  activeWatermarkType: WatermarkType;
  setActiveWatermarkType: (type: WatermarkType) => void;

  // Watermark params
  textParams: TextWatermarkParams;
  setTextParams: (params: Partial<TextWatermarkParams>) => void;
  imageParams: ImageWatermarkParams;
  setImageParams: (params: Partial<ImageWatermarkParams>) => void;
  patternParams: PatternWatermarkParams;
  setPatternParams: (params: Partial<PatternWatermarkParams>) => void;

  getActiveParams: () => WatermarkParams;

  // Processing
  isProcessing: boolean;
  processingProgress: { current: number; total: number };
  setProcessing: (processing: boolean) => void;
  setProcessingProgress: (progress: { current: number; total: number }) => void;

  // Export
  exportSettings: ExportSettings;
  setExportSettings: (settings: Partial<ExportSettings>) => void;

  // UI
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

  activeWatermarkType: 'text',
  setActiveWatermarkType: (type) => set({ activeWatermarkType: type }),

  textParams: { ...DEFAULT_TEXT_PARAMS },
  setTextParams: (params) => set((s) => ({ textParams: { ...s.textParams, ...params } })),
  imageParams: { ...DEFAULT_IMAGE_PARAMS },
  setImageParams: (params) => set((s) => ({ imageParams: { ...s.imageParams, ...params } })),
  patternParams: { ...DEFAULT_PATTERN_PARAMS },
  setPatternParams: (params) => set((s) => ({ patternParams: { ...s.patternParams, ...params } })),

  getActiveParams: () => {
    const s = get();
    switch (s.activeWatermarkType) {
      case 'text': return s.textParams;
      case 'image': return s.imageParams;
      case 'pattern': return s.patternParams;
    }
  },

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

