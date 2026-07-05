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

_detector_module = None
def get_detector():
    global _detector_module
    if _detector_module is None:
        log.info('Loading WatermarkDetector...')
        from watermark_remover.detector import WatermarkDetector, create_corner_mask
        _detector_module = {'class': WatermarkDetector, 'corner': create_corner_mask}
    return _detector_module

# ─── API Routes ───────────────────────────────────────

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

# ─── New: Remove with custom bounding boxes ──────────

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

if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('REMOVER_PORT', '5178'))
    log.info(f'Starting server on port {port}')
    uvicorn.run(app, host='127.0.0.1', port=port, log_level='warning')
