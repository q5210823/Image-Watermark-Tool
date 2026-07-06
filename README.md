# WatermarkForge / ????

<div align="center">
  <p><strong>A lightweight, local-first batch watermark tool ? add watermarks, remove watermarks, all on your machine.</strong></p>
  <p><strong>??????????? ? ????????????????????????</strong></p>
  <br>
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/Python-3.11-3776AB?logo=python" alt="Python 3.11" />
    <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT" />
  </p>
</div>

---

## Features

### Add Watermark
| Type | Options |
|------|---------|
| **Text** | Font, size, color, opacity, rotation, shadow, stroke, 9-point positioning |
| **Image (Logo)** | Upload image, scale, opacity, 6 blend modes, rotation |
| **Pattern** | Grid lines, diagonal stripes, tile overlays |

### Remove Watermark
- **AI detection**: YOLO automatically locates watermark regions
- **Smart inpainting**: LaMa AI or OpenCV to fill removed areas
- **Manual adjustment**: Drag/resize detection boxes; apply same position to all images
- **Corner fallback**: Auto-detects common watermark positions

### Batch Processing
- Import multiple images via drag & drop or file picker
- Real-time progress tracking
- Before / After preview toggle
- Export: single download or ZIP batch export (PNG/JPEG/WebP)

---

## Quick Start

### Prerequisites
- **Node.js** 18+ & npm
- **Python** 3.10+ with pip
- Recommended: 4 GB+ RAM (for AI model)

### 1. Install

```bash
git clone https://github.com/q5210823/Image-Watermark-Tool.git
cd Image-Watermark-Tool

# Frontend dependencies
npm install

# Python backend dependencies
pip install -r server/requirements.txt
```

> First run: YOLO + LaMa models (~200 MB) auto-download on first use.

### 2. Run

**Option A** ? Double-click `start.bat` (opens browser automatically)

**Option B** ? Manual:
```bash
# Terminal 1: Python backend
python -m uvicorn server.remover_api:app --host 127.0.0.1 --port 5178

# Terminal 2: Frontend
npx vite

# Open http://localhost:5173
```

---

## How to Use

### Add Watermark
```
1. Drag images or click import area
2. Right panel: select "Add Watermark" tab
3. Choose type: Text / Image / Pattern
4. Adjust parameters (color, size, opacity, etc.)
5. Click "Process All"
6. Click "Export" to download
```

### Remove Watermark
```
1. Drag images or click import area
2. Right panel: select "Remove Watermark" tab
3. Click "Check Environment" to verify backend
4. Click "Detect" ? YOLO finds watermark regions
5. Adjust boxes: drag to move, resize handles, delete unwanted
6. (Optional) Click "Apply to All" to copy box positions
7. Click "Remove All" ? AI inpaints each region
8. Click zoom icon on any card to see result full-size
9. Click "Export" to download
```

### Tips
- Same-position watermarks: Detect on one image, adjust box, click "Apply to All"
- Zoom to inspect: Hover image card, click zoom icon for full-size preview
- Language: Bottom-right corner toggle between English / Chinese

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 8 |
| State | Zustand |
| Watermark Rendering | HTML5 Canvas API |
| AI Detection | YOLOv8 (via watermark-remover) |
| AI Inpainting | LaMa (big-lama model) |
| Fallback Inpainting | OpenCV Telea / NS |
| Python API | FastAPI + uvicorn |
| Export | JSZip + FileSaver |

---

## Project Structure

```
Image-Watermark-Tool/
  server/
    remover_api.py      # Python API (detect, remove)
    requirements.txt    # Python dependencies
  src/
    components/
      ImportPanel/     # Left: file import
      PreviewGrid/     # Center: image grid + zoom
      WatermarkPanel/  # Right: watermark controls
      ImageViewer/     # Detection box editor
      ExportDialog/    # Export UI
      StatusBar/       # Bottom: language toggle
    stores/            # Zustand state
    utils/             # Watermark engine, API client, logger
    i18n/              # en.ts / zh.ts
    styles/            # CSS design system
    types/             # TypeScript definitions
  logs/                # Python API logs
  start.bat            # One-click launcher
```

---

## License

MIT
