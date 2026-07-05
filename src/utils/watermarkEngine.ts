import type { WatermarkParams, TextWatermarkParams, ImageWatermarkParams, PatternWatermarkParams, PositionPreset } from "../types";

function getPositionCoords(
  preset: PositionPreset, offsetX: number, offsetY: number, margin: number,
  imgW: number, imgH: number, wmW: number, wmH: number
): { x: number; y: number } {
  let x = 0, y = 0;
  const v = preset.split("-");
  const vert = v.length > 1 ? v[0] : "center";
  const horz = v.length > 1 ? v[1] : v[0];
  if (vert === "top") y = margin;
  else if (vert === "bottom") y = imgH - wmH - margin;
  else y = (imgH - wmH) / 2;
  if (horz === "left") x = margin;
  else if (horz === "right") x = imgW - wmW - margin;
  else x = (imgW - wmW) / 2;
  return { x: x + offsetX, y: y + offsetY };
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha / 100})`;
}

function applyBlendMode(ctx: CanvasRenderingContext2D, mode: string) {
  const modes: Record<string, GlobalCompositeOperation> = {
    normal: "source-over", multiply: "multiply", screen: "screen",
    overlay: "overlay", darken: "darken", lighten: "lighten",
  };
  ctx.globalCompositeOperation = modes[mode] || "source-over";
}

async function renderTextWatermark(
  ctx: CanvasRenderingContext2D, imgW: number, imgH: number, p: TextWatermarkParams
) {
  const fontSize = Math.min(p.fontSize, imgW * 0.15);
  ctx.font = `bold ${fontSize}px "${p.fontFamily}", sans-serif`;
  const metrics = ctx.measureText(p.content);
  const textW = metrics.width;
  const textH = fontSize;
  const pos = getPositionCoords(p.position.preset, p.position.offsetX, p.position.offsetY, p.margin, imgW, imgH, textW, textH);

  ctx.save();
  ctx.globalAlpha = p.opacity / 100;
  ctx.translate(pos.x + textW / 2, pos.y + textH / 2);
  ctx.rotate((p.rotation * Math.PI) / 180);
  ctx.translate(-(pos.x + textW / 2), -(pos.y + textH / 2));

  // Shadow
  if (p.shadow?.enabled) {
    ctx.shadowColor = p.shadow.color;
    ctx.shadowBlur = p.shadow.blur;
    ctx.shadowOffsetX = p.shadow.offsetX;
    ctx.shadowOffsetY = p.shadow.offsetY;
  }

  // Stroke
  if (p.stroke?.enabled) {
    ctx.strokeStyle = p.stroke.color;
    ctx.lineWidth = p.stroke.width;
    ctx.strokeText(p.content, pos.x, pos.y + fontSize - 4);
  }

  ctx.fillStyle = p.color;
  ctx.fillText(p.content, pos.x, pos.y + fontSize - 4);
  ctx.restore();
}

async function renderImageWatermark(
  ctx: CanvasRenderingContext2D, imgW: number, imgH: number, p: ImageWatermarkParams
) {
  if (!p.logoDataUrl) return;
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = p.logoDataUrl!;
  });

  const logoW = (imgW * p.scale) / 100;
  const logoH = (img.height / img.width) * logoW;
  const pos = getPositionCoords(p.position.preset, p.position.offsetX, p.position.offsetY, 10, imgW, imgH, logoW, logoH);

  ctx.save();
  ctx.globalAlpha = p.opacity / 100;
  applyBlendMode(ctx, p.blendMode);
  ctx.translate(pos.x + logoW / 2, pos.y + logoH / 2);
  ctx.rotate((p.rotation * Math.PI) / 180);
  ctx.drawImage(img, -logoW / 2, -logoH / 2, logoW, logoH);
  ctx.restore();
}

async function renderPatternWatermark(
  ctx: CanvasRenderingContext2D, imgW: number, imgH: number, p: PatternWatermarkParams
) {
  ctx.save();
  ctx.globalAlpha = p.opacity / 100;

  if (p.patternStyle === "grid") {
    ctx.strokeStyle = p.gridColor;
    ctx.lineWidth = p.gridLineWidth;
    for (let x = 0; x <= imgW; x += p.gridSpacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, imgH); ctx.stroke();
    }
    for (let y = 0; y <= imgH; y += p.gridSpacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(imgW, y); ctx.stroke();
    }
  } else if (p.patternStyle === "diagonal") {
    ctx.strokeStyle = p.diagColor;
    ctx.lineWidth = p.diagLineWidth;
    const rad = (p.diagAngle * Math.PI) / 180;
    const diag = Math.sqrt(imgW * imgW + imgH * imgH);
    for (let d = -diag; d < diag; d += p.diagSpacing) {
      ctx.beginPath();
      ctx.moveTo(d - diag, -diag);
      ctx.lineTo(d + diag, diag);
      ctx.stroke();
    }
  } else if (p.patternStyle === "tile" && p.tileDataUrl) {
    const tile = new Image();
    await new Promise<void>((resolve, reject) => {
      tile.onload = () => resolve();
      tile.onerror = reject;
      tile.src = p.tileDataUrl!;
    });
    const tw = tile.width;
    const th = tile.height;
    const spacing = p.tileSpacing || 0;
    for (let y = 0; y < imgH; y += th + spacing) {
      for (let x = 0; x < imgW; x += tw + spacing) {
        ctx.drawImage(tile, x, y, tw, th);
      }
    }
  }
  ctx.restore();
}

export async function applyWatermark(
  sourceDataUrl: string, params: WatermarkParams
): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = sourceDataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0);

  switch (params.type) {
    case "text":
      await renderTextWatermark(ctx, canvas.width, canvas.height, params as TextWatermarkParams);
      break;
    case "image":
      await renderImageWatermark(ctx, canvas.width, canvas.height, params as ImageWatermarkParams);
      break;
    case "pattern":
      await renderPatternWatermark(ctx, canvas.width, canvas.height, params as PatternWatermarkParams);
      break;
  }

  return canvas.toDataURL("image/png");
}

export async function generatePreview(
  sourceDataUrl: string, params: WatermarkParams, maxWidth: number = 400
): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = sourceDataUrl;
  });

  const scale = Math.min(1, maxWidth / img.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  switch (params.type) {
    case "text":
      await renderTextWatermark(ctx, canvas.width, canvas.height, params as TextWatermarkParams);
      break;
    case "image":
      await renderImageWatermark(ctx, canvas.width, canvas.height, params as ImageWatermarkParams);
      break;
    case "pattern":
      await renderPatternWatermark(ctx, canvas.width, canvas.height, params as PatternWatermarkParams);
      break;
  }
  return canvas.toDataURL("image/png");
}

export function canvasToBlob(dataUrl: string, format: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      c.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      }, "image/" + format, quality / 100);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}