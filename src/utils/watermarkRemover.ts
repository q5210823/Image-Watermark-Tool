import type { WatermarkRemovalParams, DetectionBox, OcrBox, TextStyleAnalysis, TextStyle } from '../types';
import { logger } from './logger';

const MODULE = 'watermarkRemover';
const API_BASE = 'http://127.0.0.1:5178/api';

export async function checkEnv(): Promise<{
  pythonAvailable: boolean;
  depsInstalled: boolean;
  modelCached: boolean;
  missingDeps: string[];
}> {
  logger.debug(MODULE, 'checkEnv: calling API');
  try {
    const res = await fetch(`${API_BASE}/env`, { signal: AbortSignal.timeout(30000) });
    const data = await res.json();
    logger.debug(MODULE, 'checkEnv result', data);
    return data;
  } catch (err: any) {
    logger.error(MODULE, `checkEnv failed: ${err.message}`, err);
    return { pythonAvailable: false, depsInstalled: false, modelCached: false, missingDeps: [err.message || 'Server not running'] };
  }
}

export async function detectWatermark(
  imageDataUrl: string,
  params: WatermarkRemovalParams
): Promise<{ detections: DetectionBox[]; usingFallback: boolean }> {
  logger.debug(MODULE, 'detectWatermark: preparing request');
  const blob = dataUrlToBlob(imageDataUrl);
  const form = new FormData();
  form.append('file', blob, 'image.png');
  form.append('confidence', String(params.confidence));
  form.append('padding', String(params.padding));
  form.append('fallbackCorner', String(params.fallbackCorner));
  form.append('corner', params.corner);
  form.append('cornerWidth', String(params.cornerWidth));
  form.append('cornerHeight', String(params.cornerHeight));
  form.append('forceCorner', String(params.forceCorner));

  try {
    logger.debug(MODULE, 'detectWatermark: sending request');
    const res = await fetch(`${API_BASE}/detect`, { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    logger.debug(MODULE, `detectWatermark: ${data.detections.length} detections, fallback=${data.usingFallback}`);
    return data;
  } catch (err: any) {
    logger.error(MODULE, `detectWatermark failed: ${err.message}`, err);
    throw err;
  }
}

export async function removeWatermark(
  imageDataUrl: string,
  params: WatermarkRemovalParams
): Promise<string> {
  logger.debug(MODULE, 'removeWatermark: preparing request');
  const blob = dataUrlToBlob(imageDataUrl);
  const form = new FormData();
  form.append('file', blob, 'image.png');
  form.append('confidence', String(params.confidence));
  form.append('padding', String(params.padding));
  form.append('method', params.method);
  form.append('fallbackCorner', String(params.fallbackCorner));
  form.append('corner', params.corner);
  form.append('cornerWidth', String(params.cornerWidth));
  form.append('cornerHeight', String(params.cornerHeight));
  form.append('forceCorner', String(params.forceCorner));

  try {
    logger.debug(MODULE, 'removeWatermark: sending request (may take 5-30s for LaMa)');
    const res = await fetch(`${API_BASE}/remove`, { method: 'POST', body: form, signal: AbortSignal.timeout(180000) });
    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown');
      throw new Error(`API error ${res.status}: ${errText}`);
    }
    const blobOut = await res.blob();
    logger.debug(MODULE, `removeWatermark: received ${blobOut.size} bytes`);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read result blob'));
      reader.readAsDataURL(blobOut);
    });
  } catch (err: any) {
    logger.error(MODULE, `removeWatermark failed: ${err.message}`, err);
    throw err;
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)![1];
  const bytes = atob(parts[1]);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function removeWithBbox(
  imageDataUrl: string,
  bboxes: Array<[number, number, number, number]>,
  params: WatermarkRemovalParams
): Promise<string> {
  logger.debug(MODULE, `removeWithBbox: ${bboxes.length} boxes, method=${params.method}`);
  const blob = dataUrlToBlob(imageDataUrl);
  const form = new FormData();
  form.append('file', blob, 'image.png');
  form.append('bboxes', JSON.stringify(bboxes));
  form.append('padding', String(params.padding));
  form.append('method', params.method);

  try {
    const res = await fetch(`${API_BASE}/remove-bbox`, { method: 'POST', body: form, signal: AbortSignal.timeout(180000) });
    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown');
      throw new Error(`API error ${res.status}: ${errText}`);
    }
    const blobOut = await res.blob();
    logger.debug(MODULE, `removeWithBbox: received ${blobOut.size} bytes`);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read result blob'));
      reader.readAsDataURL(blobOut);
    });
  } catch (err: any) {
    logger.error(MODULE, `removeWithBbox failed: ${err.message}`, err);
    throw err;
  }
}

// ─── P3: Edit Watermark API ──────────────────────

/**
 * OCR detect: call /api/detect with mode='text' to detect text regions
 */
export async function ocrDetect(
  imageDataUrl: string,
): Promise<{ ocrBoxes: OcrBox[] }> {
  logger.debug(MODULE, 'ocrDetect: calling API');
  const blob = dataUrlToBlob(imageDataUrl);
  const form = new FormData();
  form.append('file', blob, 'image.png');
  form.append('mode', 'text');

  try {
    const res = await fetch(`${API_BASE}/detect?mode=text`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    logger.debug(MODULE, `ocrDetect: ${data.ocrBoxes?.length || 0} texts detected`);
    const boxes = (data.ocrBoxes || []).map((b: any, i: number) => ({
      ...b,
      id: b.id || `ocr_${Date.now()}_${i}`,
    }));
    return { ocrBoxes: boxes };
  } catch (err: any) {
    logger.error(MODULE, `ocrDetect failed: ${err.message}`, err);
    throw err;
  }
}

/**
 * Analyze text style in a specific bounding box
 */
export async function analyzeTextStyle(
  imageDataUrl: string,
  bbox: [number, number, number, number],
): Promise<TextStyleAnalysis> {
  logger.debug(MODULE, 'analyzeTextStyle: calling API');
  const blob = dataUrlToBlob(imageDataUrl);
  const form = new FormData();
  form.append('file', blob, 'image.png');
  form.append('bbox', JSON.stringify(bbox));

  try {
    const res = await fetch(`${API_BASE}/analyze-text-style`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    logger.debug(MODULE, 'analyzeTextStyle result', data);
    return data;
  } catch (err: any) {
    logger.error(MODULE, `analyzeTextStyle failed: ${err.message}`, err);
    return { color: '#000000', fontSize: 24, opacity: 85, hasShadow: false, hasStroke: false, rotation: 0 };
  }
}

/**
 * Edit text in image: replaces old text with new text using inpainting + Pillow rendering
 */
export async function editText(
  imageDataUrl: string,
  edits: Array<{
    bbox: [number, number, number, number];
    new_text: string;
    style: TextStyle;
  }>,
): Promise<string> {
  logger.debug(MODULE, `editText: ${edits.length} edits`);
  const blob = dataUrlToBlob(imageDataUrl);
  const form = new FormData();
  form.append('file', blob, 'image.png');
  form.append('edits', JSON.stringify(edits));

  try {
    const res = await fetch(`${API_BASE}/edit-text`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(180000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown');
      throw new Error(`API error ${res.status}: ${errText}`);
    }
    const blobOut = await res.blob();
    logger.debug(MODULE, `editText: received ${blobOut.size} bytes`);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read result blob'));
      reader.readAsDataURL(blobOut);
    });
  } catch (err: any) {
    logger.error(MODULE, `editText failed: ${err.message}`, err);
    throw err;
  }
}
