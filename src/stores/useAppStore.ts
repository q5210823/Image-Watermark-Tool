import { create } from 'zustand';
import type {
  ImageItem, WatermarkParams, WatermarkType,
  ExportSettings, PositionPreset,
  TextWatermarkParams, ImageWatermarkParams, PatternWatermarkParams,
  WatermarkRemovalParams, DetectionBox, EditableBbox,
  WorkMode, OcrBox, EditWatermarkParams, TextStyle,
} from '../types';
import {
  DEFAULT_TEXT_PARAMS, DEFAULT_IMAGE_PARAMS, DEFAULT_PATTERN_PARAMS, DEFAULT_REMOVER_PARAMS, DEFAULT_EDIT_PARAMS,
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

  // Work mode: 'add' | 'edit' | 'remove'
  workMode: WorkMode;
  setWorkMode: (mode: WorkMode) => void;

  // Watermark type (for add mode)
  activeWatermarkType: WatermarkType | 'remover';
  setActiveWatermarkType: (type: WatermarkType | 'remover') => void;

  // Watermark params
  textParams: TextWatermarkParams;
  setTextParams: (params: Partial<TextWatermarkParams>) => void;
  imageParams: ImageWatermarkParams;
  setImageParams: (params: Partial<ImageWatermarkParams>) => void;
  patternParams: PatternWatermarkParams;
  setPatternParams: (params: Partial<PatternWatermarkParams>) => void;
  removerParams: WatermarkRemovalParams;
  setRemoverParams: (params: Partial<WatermarkRemovalParams>) => void;
  editParams: EditWatermarkParams;
  setEditParams: (params: Partial<EditWatermarkParams>) => void;

  getActiveParams: () => WatermarkParams;

  // Detection results for remover
  detectionResults: Record<string, DetectionBox[]>;
  setDetectionResults: (imageId: string, detections: DetectionBox[]) => void;
  clearDetectionResults: () => void;

  // OCR results for edit mode
  ocrResults: Record<string, OcrBox[]>;
  setOcrResults: (imageId: string, boxes: OcrBox[]) => void;
  clearOcrResults: () => void;

  // User-adjusted bboxes per image (for draggable preview)
  userBboxes: Record<string, EditableBbox[]>;
  setUserBboxes: (imageId: string, boxes: EditableBbox[]) => void;
  clearUserBboxes: () => void;

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

  workMode: 'add',
  setWorkMode: (mode) => set({ workMode: mode }),

  activeWatermarkType: 'text',
  setActiveWatermarkType: (type) => set({ activeWatermarkType: type }),

  textParams: { ...DEFAULT_TEXT_PARAMS },
  setTextParams: (params) => set((s) => ({ textParams: { ...s.textParams, ...params } })),
  imageParams: { ...DEFAULT_IMAGE_PARAMS },
  setImageParams: (params) => set((s) => ({ imageParams: { ...s.imageParams, ...params } })),
  patternParams: { ...DEFAULT_PATTERN_PARAMS },
  setPatternParams: (params) => set((s) => ({ patternParams: { ...s.patternParams, ...params } })),
  removerParams: { ...DEFAULT_REMOVER_PARAMS },
  setRemoverParams: (params) => set((s) => ({ removerParams: { ...s.removerParams, ...params } })),
  editParams: { ...DEFAULT_EDIT_PARAMS },
  setEditParams: (params) => set((s) => ({ editParams: { ...s.editParams, ...params } })),

  getActiveParams: () => {
    const s = get();
    switch (s.activeWatermarkType) {
      case 'text': return s.textParams;
      case 'image': return s.imageParams;
      case 'pattern': return s.patternParams;
      case 'remover': return s.removerParams;
    }
  },

  detectionResults: {},
  setDetectionResults: (imageId, detections) =>
    set((s) => ({ detectionResults: { ...s.detectionResults, [imageId]: detections } })),
  clearDetectionResults: () => set({ detectionResults: {} }),

  ocrResults: {},
  setOcrResults: (imageId, boxes) =>
    set((s) => ({ ocrResults: { ...s.ocrResults, [imageId]: boxes } })),
  clearOcrResults: () => set({ ocrResults: {} }),

  userBboxes: {},
  setUserBboxes: (imageId, boxes) =>
    set((s) => ({ userBboxes: { ...s.userBboxes, [imageId]: boxes } })),
  clearUserBboxes: () => set({ userBboxes: {} }),

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
