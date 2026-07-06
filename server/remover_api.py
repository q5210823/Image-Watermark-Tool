import os, json, sys, logging, traceback
from pathlib import Path
from io import BytesIO
from typing import Optional

os.environ['CUDA_VISIBLE_DEVICES'] = ''
os.environ['YOLO_VERBOSE'] = 'false'

log_dir = Path(__file__).resolve().parent.parent / 'logs'
log_dir.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[logging.FileHandler(log_dir / 'python-api.log', encoding='utf-8'), logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger('remover_api')
log.info('Starting Watermark Remover API Server')

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI(title='Watermark Remover API')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

# ������ Text Detection for Edit Watermark (P3) ��������������������
# Uses the existing YOLO watermark detector to locate text regions
# User provides text manually; no OCR needed

def fallback_ocr_boxes(image):
    '''When PaddleOCR is not available, return empty list'''
    return []

def extract_text_style(image, bbox):
    '''Extract text style from the bbox region using basic pixel analysis'''
    import numpy as np
    from PIL import Image
    x1, y1, x2, y2 = [int(v) for v in bbox]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(image.size[0], x2), min(image.size[1], y2)
    region = np.array(image.crop((x1, y1, x2, y2)).convert('RGB'))
    if region.size == 0:
        return {'color': '#000000', 'fontSize': 24, 'opacity': 85, 'hasShadow': False, 'hasStroke': False, 'rotation': 0}
    # Average color (excluding potential background)
    avg_color = region.mean(axis=(0, 1)).astype(int)
    color_hex = f'#{avg_color[0]:02x}{avg_color[1]:02x}{avg_color[2]:02x}'
    # Estimate font size from region height
    font_size = max(8, min(120, bbox[3] - bbox[1]))
    return {'color': color_hex, 'fontSize': font_size, 'opacity': 85, 'hasShadow': False, 'hasStroke': False, 'rotation': 0}

def render_text_on_image(image, bbox, text, style):
    '''Render text on image using Pillow'''
    from PIL import ImageDraw, ImageFont
    import os
    x1, y1, x2, y2 = [int(v) for v in bbox]
    draw = ImageDraw.Draw(image)
    font_size = max(10, min(style.get('fontSize', 24), (y2 - y1) * 2))
    # Try to load font
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except (IOError, OSError):
        try:
            font = ImageFont.truetype("C:\Windows\Fonts\msyh.ttc", font_size)
        except (IOError, OSError):
            font = ImageFont.load_default()
    # Parse color
    color_str = style.get('color', '#000000')
    if color_str.startswith('#'):
        r = int(color_str[1:3], 16)
        g = int(color_str[3:5], 16)
        b = int(color_str[5:7], 16)
    else:
        r, g, b = 0, 0, 0
    # Calculate center of bbox
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    opacity = style.get('opacity', 85) / 100.0
    rotation = style.get('rotation', 0)
    # Get text size
    bbox_text = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox_text[2] - bbox_text[0], bbox_text[3] - bbox_text[1]
    tx = cx - tw / 2
    ty = cy - th / 2
    # Shadow
    shadow = style.get('shadow')
    if shadow and shadow.get('enabled'):
        sc = shadow.get('color', '#000000')
        if sc.startswith('#'):
            sr = int(sc[1:3], 16); sg = int(sc[3:5], 16); sb = int(sc[5:7], 16)
        else:
            sr, sg, sb = 0, 0, 0
        sox = shadow.get('offsetX', 2)
        soy = shadow.get('offsetY', 2)
        draw.text((tx + sox, ty + soy), text, fill=(sr, sg, sb, int(255 * opacity)), font=font)
    # Stroke
    stroke = style.get('stroke')
    if stroke and stroke.get('enabled'):
        sc = stroke.get('color', '#FFFFFF')
        if sc.startswith('#'):
            sr = int(sc[1:3], 16); sg = int(sc[3:5], 16); sb = int(sc[5:7], 16)
        else:
            sr, sg, sb = 255, 255, 255
        sw = max(1, stroke.get('width', 1))
        draw.text((tx, ty), text, fill=(sr, sg, sb, int(255 * opacity)), font=font,
                  stroke_width=sw, stroke_fill=(sr, sg, sb))
    # Main text
    draw.text((tx, ty), text, fill=(r, g, b, int(255 * opacity)), font=font)
    return image

# ������ Detector ��������������������������������������������������������������������������
_detector_module = None
def get_detector():
    global _detector_module
    if _detector_module is None:
        log.info('Loading WatermarkDetector...')
        from watermark_remover.detector import WatermarkDetector, create_corner_mask
        _detector_module = {'class': WatermarkDetector, 'corner': create_corner_mask}
    return _detector_module

# ������ API Routes ������������������������������������������������������������������������������

@app.get('/api/health')
async def health():
    return {'status': 'ok'}

@app.get('/api/env')
async def check_env():
    result = {'pythonAvailable': True, 'pythonVersion': f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}', 'depsInstalled': False, 'modelCached': False, 'missingDeps': []}
    try:
        from watermark_remover import WatermarkDetector, WatermarkInpainter
        result['depsInstalled'] = True
    except ImportError as e:
        result['missingDeps'].append(str(e))
    try:
        import torch.hub as hub
        model_path = os.path.join(hub.get_dir(), 'checkpoints', 'big-lama.pt')
        result['modelCached'] = os.path.exists(model_path)
    except: pass
    return result

@app.get('/api/model-health')
async def model_health():
    import torch
    model_path = os.path.expanduser('~/.cache/torch/hub/checkpoints/big-lama.pt')
    result = {'exists': os.path.exists(model_path), 'valid': False, 'size': 0}
    if result['exists']:
        result['size'] = os.path.getsize(model_path)
        try:
            torch.jit.load(model_path, map_location=torch.device('cpu'))
            result['valid'] = True
        except Exception:
            result['valid'] = False
    return result

@app.post('/api/detect')
async def detect_watermark(
    file: UploadFile = File(...),
    mode: str = Form('watermark'),
    confidence: float = Form(0.5),
    padding: int = Form(10),
    fallbackCorner: bool = Form(True),
    corner: str = Form('bottom-right'),
    cornerWidth: float = Form(0.12),
    cornerHeight: float = Form(0.08),
    forceCorner: bool = Form(False),
):
    from PIL import Image
    contents = await file.read()
    image = Image.open(BytesIO(contents)).convert('RGB')
    detections = []
    using_fallback = False
    if not forceCorner:
        try:
            detector_cls = get_detector()['class']
            detector = detector_cls(confidence=confidence)
            detections_raw = detector.detect(image)
            detections = [{'bbox': d['bbox'], 'confidence': round(d['confidence'], 3)} for d in detections_raw]
        except Exception as e:
            log.warning(f'YOLO failed: {e}')
    if not detections and fallbackCorner:
        using_fallback = True
        mask = get_detector()['corner'](image.size, corner=corner, width_ratio=cornerWidth, height_ratio=cornerHeight, padding=padding)
        import numpy as np
        mask_np = np.array(mask)
        ys, xs = np.where(mask_np > 0)
        if len(xs) > 0 and len(ys) > 0:
            detections = [{'bbox': [float(xs.min()), float(ys.min()), float(xs.max()), float(ys.max())], 'confidence': 0.0, 'fallback': True}]
    # If mode is 'text', use YOLO detections as text region boxes
    # User provides replacement text manually - no OCR needed
    if mode == 'text':
        ocr_boxes = []
        img_w, img_h = image.size
        img_area = img_w * img_h
        for d in detections:
            bbox = d["bbox"]
            box_w = bbox[2] - bbox[0]
            box_h = bbox[3] - bbox[1]
            box_area = box_w * box_h
            # If box covers >85% of image, it's the whole watermark - use corner fallback
            if box_area > img_area * 0.85:
                # Use corner-based boxes instead
                corners_to_check = ['bottom-right', 'bottom-left', 'top-right', 'top-left']
                for cn in corners_to_check:
                    mask = get_detector()['corner'](image.size, corner=cn, width_ratio=cornerWidth, height_ratio=cornerHeight, padding=padding)
                    import numpy as np
                    mask_np = np.array(mask)
                    ys, xs = np.where(mask_np > 0)
                    if len(xs) > 0 and len(ys) > 0:
                        ocr_boxes.append({
                            "bbox": [float(xs.min()), float(ys.min()), float(xs.max()), float(ys.max())],
                            "text": "",
                            "confidence": d.get("confidence", 0),
                            "fallback": True
                        })
                log.info(f"Text mode: box too large ({box_area/img_area*100:.0f}%), using corner fallback, got {len(ocr_boxes)} boxes")
                break
            ocr_boxes.append({
                "bbox": bbox,
                "text": "",
                "confidence": d.get("confidence", 0),
                "fallback": d.get("fallback", False)
            })
        if ocr_boxes:
            log.info(f"Text mode: returned {len(ocr_boxes)} boxes")
        else:
            log.info("Text mode: no boxes found")
        return {"ocrBoxes": ocr_boxes, "usingFallback": len(ocr_boxes) == 0}
    
    return {'detections': detections, 'usingFallback': using_fallback}

@app.post('/api/remove')
async def remove_watermark(
    file: UploadFile = File(...),
    confidence: float = Form(0.5),
    padding: int = Form(10),
    method: str = Form('lama'),
    fallbackCorner: bool = Form(True),
    corner: str = Form('bottom-right'),
    cornerWidth: float = Form(0.12),
    cornerHeight: float = Form(0.08),
    forceCorner: bool = Form(False),
):
    from PIL import Image
    from watermark_remover.detector import WatermarkDetector as WD, create_corner_mask
    contents = await file.read()
    image = Image.open(BytesIO(contents)).convert('RGB')
    mask = None
    if not forceCorner:
        try:
            detector = WD(confidence=confidence)
            detections = detector.detect(image)
            if detections:
                mask = detector.create_mask(image.size, detections, padding)
        except: pass
    if mask is None and fallbackCorner:
        mask = create_corner_mask(image.size, corner=corner, width_ratio=cornerWidth, height_ratio=cornerHeight, padding=padding)
    elif mask is None:
        raise HTTPException(400, 'No watermark detected')
    log.info(f'Inpainting with {method.upper()}...')
    try:
        from watermark_remover.inpainter import WatermarkInpainter as WI
        inpainter = WI(method=method)
        result = inpainter.inpaint(image, mask)
    except Exception as e:
        log.warning(f'LaMa failed ({e}), falling back to OpenCV')
        from watermark_remover.inpainter import WatermarkInpainter as WI
        inpainter = WI(method='opencv')
        result = inpainter.inpaint(image, mask)
    buf = BytesIO()
    result.save(buf, format='PNG')
    buf.seek(0)
    return StreamingResponse(buf, media_type='image/png')

# ������ New: Remove with custom bounding boxes ��������������������

@app.post('/api/remove-bbox')
async def remove_watermark_bbox(
    file: UploadFile = File(...),
    bboxes: str = Form('[]'),
    padding: int = Form(10),
    method: str = Form('lama'),
):
    '''Remove watermark using custom bounding boxes (no auto-detection).
    bboxes: JSON array of [x1,y1,x2,y2] coordinates.'''
    from PIL import Image, ImageDraw
    bbox_list = json.loads(bboxes)
    log.info(f'Remove-bbox: file={file.filename}, bboxes={bbox_list}, method={method}, pad={padding}')
    contents = await file.read()
    image = Image.open(BytesIO(contents)).convert('RGB')
    mask = Image.new('L', image.size, 0)
    draw = ImageDraw.Draw(mask)
    for bbox in bbox_list:
        x1, y1, x2, y2 = bbox
        x1 = max(0, x1 - padding); y1 = max(0, y1 - padding)
        x2 = min(image.size[0], x2 + padding); y2 = min(image.size[1], y2 + padding)
        draw.rectangle([x1, y1, x2, y2], fill=255)
    log.info(f'Inpainting with {method.upper()}...')
    try:
        from watermark_remover.inpainter import WatermarkInpainter as WI
        result = WI(method=method).inpaint(image, mask)
    except Exception as e:
        log.warning(f'LaMa failed ({e}), falling back to OpenCV')
        from watermark_remover.inpainter import WatermarkInpainter as WI
        result = WI(method='opencv').inpaint(image, mask)
    buf = BytesIO()
    result.save(buf, format='PNG')
    buf.seek(0)
    return StreamingResponse(buf, media_type='image/png')

# ������ P3: Edit Watermark Endpoints ����������������������������������������

@app.post('/api/analyze-text-style')
async def analyze_text_style(
    file: UploadFile = File(...),
    bbox: str = Form('[]'),
):
    '''Analyze text style in a given bounding box region.'''
    from PIL import Image
    contents = await file.read()
    image = Image.open(BytesIO(contents)).convert('RGB')
    bbox_list = json.loads(bbox)
    log.info(f'analyze-text-style: file={file.filename}, bbox={bbox_list}')
    style = extract_text_style(image, bbox_list)
    return style

@app.post('/api/edit-text')
async def edit_text_endpoint(
    file: UploadFile = File(...),
    edits: str = Form('[]'),
):
    '''Edit text in image: inpaint old text region, then render new text.'''
    from PIL import Image
    edits_list = json.loads(edits)
    log.info(f'edit-text: file={file.filename}, {len(edits_list)} edit(s)')
    contents = await file.read()
    # Read original image from file bytes (fresh copy)
    original = Image.open(BytesIO(contents)).convert('RGB')
    image = original.copy()
    # Process each edit
    for edit in edits_list:
        bbox = edit.get('bbox', [0, 0, 100, 30])
        new_text = edit.get('new_text', '')
        style = edit.get('style', {})
        if not new_text:
            continue
        # Step 1: Inpaint the original bbox area (remove old text)
        x1, y1, x2, y2 = [int(v) for v in bbox]
        x1 = max(0, x1); y1 = max(0, y1)
        x2 = min(image.size[0], x2); y2 = min(image.size[1], y2)
        pad = 5
        x1p = max(0, x1 - pad); y1p = max(0, y1 - pad)
        x2p = min(image.size[0], x2 + pad); y2p = min(image.size[1], y2 + pad)
        # Use OpenCV inpainting for the bbox region
        try:
            import cv2
            import numpy as np
            img_np = np.array(image)
            mask = np.zeros(image.size[::-1], dtype=np.uint8)
            mask[y1p:y2p, x1p:x2p] = 255
            inpainted = cv2.inpaint(img_np, mask, 3, cv2.INPAINT_TELEA)
            image = Image.fromarray(inpainted).convert('RGB')
        except Exception as e:
            log.warning(f'Inpaint failed ({e}), skipping inpaint')
        # Step 2: Render new text
        image = render_text_on_image(image, bbox, new_text, style)
    # Return result
    buf = BytesIO()
    image.save(buf, format='PNG')
    buf.seek(0)
    return StreamingResponse(buf, media_type='image/png')

@app.post('/api/batch-edit-text')
async def batch_edit_text(
    file: UploadFile = File(...),
    edits: str = Form('[]'),
    apply_all: bool = Form(False),
):
    '''Batch edit text - same as edit-text but with metadata for batch operations.'''
    return await edit_text_endpoint(file, edits)

if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('REMOVER_PORT', '5178'))
    log.info(f'Starting server on port {port}')
    uvicorn.run(app, host='127.0.0.1', port=port, log_level='warning')
