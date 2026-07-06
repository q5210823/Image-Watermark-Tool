export type WatermarkType = 'text' | 'image' | 'pattern';
export type PatternStyle = 'tile' | 'grid' | 'diagonal';
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';
export type ExportFormat = 'png' | 'jpeg' | 'webp';
export type ImageStatus = 'pending' | 'processing' | 'done' | 'error';

export type PositionPreset =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface Position {
  preset: PositionPreset;
  offsetX: number;
  offsetY: number;
}

export interface ShadowConfig {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface StrokeConfig {
  enabled: boolean;
  color: string;
  width: number;
}

export interface TextWatermarkParams {
  type: 'text';
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  shadow: ShadowConfig | null;
  stroke: StrokeConfig | null;
  position: Position;
  margin: number;
}

export interface ImageWatermarkParams {
  type: 'image';
  logoDataUrl: string | null;
  logoFileName: string;
  scale: number;
  opacity: number;
  blendMode: BlendMode;
  rotation: number;
  position: Position;
}

export interface PatternWatermarkParams {
  type: 'pattern';
  patternStyle: PatternStyle;
  tileDataUrl?: string;
  tileName?: string;
  tileScale?: number;
  tileSpacing?: number;
  gridLineWidth: number;
  gridColor: string;
  gridSpacing: number;
  diagLineWidth: number;
  diagColor: string;
  diagAngle: number;
  diagSpacing: number;
  opacity: number;
}

export type WatermarkParams = TextWatermarkParams | ImageWatermarkParams | PatternWatermarkParams | WatermarkRemovalParams;

export interface ImageItem {
  id: string;
  name: string;
  path: string;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
  format: string;
  status: ImageStatus;
  processedDataUrl: string | null;
  error?: string;
}

export interface NamingRule {
  pattern: 'original' | 'prefix' | 'sequence';
  prefix?: string;
  startIndex?: number;
}

export interface ExportSettings {
  format: ExportFormat;
  quality: number;
  naming: NamingRule;
}

export const DEFAULT_TEXT_PARAMS: TextWatermarkParams = {
  type: 'text',
  content: 'Watermark',
  fontFamily: 'Arial',
  fontSize: 36,
  color: '#FFFFFF',
  opacity: 70,
  rotation: 0,
  shadow: null,
  stroke: null,
  position: { preset: 'bottom-right', offsetX: 0, offsetY: 0 },
  margin: 20,
};

export const DEFAULT_IMAGE_PARAMS: ImageWatermarkParams = {
  type: 'image',
  logoDataUrl: null,
  logoFileName: '',
  scale: 25,
  opacity: 70,
  blendMode: 'normal',
  rotation: 0,
  position: { preset: 'bottom-right', offsetX: 0, offsetY: 0 },
};

export const DEFAULT_PATTERN_PARAMS: PatternWatermarkParams = {
  type: 'pattern',
  patternStyle: 'grid',
  gridLineWidth: 1,
  gridColor: '#FFFFFF',
  gridSpacing: 100,
  diagLineWidth: 2,
  diagColor: '#FFFFFF',
  diagAngle: 45,
  diagSpacing: 80,
  opacity: 30,
};

export type RemoverMethod = 'lama' | 'opencv';

export interface WatermarkRemovalParams {
  type: 'remover';
  confidence: number;
  padding: number;
  method: RemoverMethod;
  fallbackCorner: boolean;
  corner: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  cornerWidth: number;
  cornerHeight: number;
  forceCorner: boolean;
}

export const DEFAULT_REMOVER_PARAMS: WatermarkRemovalParams = {
  type: 'remover',
  confidence: 0.5,
  padding: 10,
  method: 'lama',
  fallbackCorner: true,
  corner: 'bottom-right',
  cornerWidth: 0.12,
  cornerHeight: 0.08,
  forceCorner: false,
};

export interface DetectionBox {
  bbox: [number, number, number, number];
  confidence: number;
  fallback?: boolean;
}

export interface DetectionResult {
  detections: DetectionBox[];
  usingFallback: boolean;
}
export interface EditableBbox {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  fallback?: boolean;
  locked?: boolean;
}

// ─── P3 Edit Watermark types ──────────────────────────
export type WorkMode = 'add' | 'edit' | 'remove';

export interface OcrBox {
  id: string;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  text: string;
  confidence: number;
}

export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  opacity: number;
  rotation: number;
  shadow: ShadowConfig | null;
  stroke: StrokeConfig | null;
}

export interface EditWatermarkParams {
  type: 'edit';
  ocrBoxes: OcrBox[];
  selectedOcrId: string | null;
  newText: string;
  style: TextStyle;
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 24,
  fontFamily: 'Arial',
  color: '#3A3A3A',
  opacity: 85,
  rotation: 0,
  shadow: { enabled: true, color: '#000000', blur: 3, offsetX: 2, offsetY: 2 },
  stroke: null,
};

export const DEFAULT_EDIT_PARAMS: EditWatermarkParams = {
  type: 'edit',
  ocrBoxes: [],
  selectedOcrId: null,
  newText: '',
  style: { ...DEFAULT_TEXT_STYLE },
};

export interface OcrDetectionResult {
  ocrBoxes: OcrBox[];
}

export interface TextStyleAnalysis {
  color: string;
  fontSize: number;
  opacity: number;
  hasShadow: boolean;
  hasStroke: boolean;
  rotation: number;
}
