# WatermarkForge / 水印工厂

<div align="center">
  <p><strong>A lightweight, local-first batch watermark tool — add watermarks, remove watermarks, all on your machine.</strong></p>
  <p><strong>轻量级本地批量水印工具 — 加水印、去水印，全部在本地完成，不上传任何文件。</strong></p>
</div>

---
<img width="1330" height="710" alt="image" src="https://github.com/user-attachments/assets/5732e0ef-83b8-4ed5-b415-dc4a7164b6fc" />
<img width="1330" height="710" alt="image" src="https://github.com/user-attachments/assets/37c3c92a-d44e-462c-be23-04db8f70689f" />


## English

### Features

#### Add Watermark
| Type | Options |
|------|---------|
| **Text** | Font, size, color, opacity, rotation, shadow, stroke, 9-point positioning |
| **Image (Logo)** | Upload image, scale, opacity, 6 blend modes, rotation |
| **Pattern** | Grid lines, diagonal stripes, tile overlays |

#### Remove Watermark
- **AI detection**: YOLO automatically locates watermark regions
- **Smart inpainting**: LaMa AI or OpenCV to fill removed areas
- **Manual adjustment**: Drag/resize detection boxes; apply same position to all images
- **Corner fallback**: Auto-detects common watermark positions

#### Batch Processing
- Import multiple images via drag & drop or file picker
- Real-time progress tracking
- Before / After preview toggle
- Export: single download or ZIP batch export (PNG/JPEG/WebP)

---

### Quick Start

**Prerequisites**: Node.js 18+, Python 3.10+, pip

`ash
# Clone & install
git clone https://github.com/q5210823/Image-Watermark-Tool.git
cd Image-Watermark-Tool
npm install
pip install -r server/requirements.txt

# Run (Option A): double-click start.bat
# Run (Option B): manual
python -m uvicorn server.remover_api:app --host 127.0.0.1 --port 5178
npx vite
# Open http://localhost:5173
`

> First run: YOLO + LaMa models (~200 MB) auto-download on first use.

---

### How to Use

**Add Watermark**: Import images → Right panel "Add Watermark" → Choose Text/Image/Pattern → Adjust params → "Process All" → "Export"

**Remove Watermark**: Import images → Right panel "Remove Watermark" → Check env → Detect → Adjust boxes → "Remove All" → Zoom to inspect → "Export"

**Tips**: Same-position watermarks? Detect on one image, adjust, click "Apply to All". Hover card + click zoom icon for full-size preview. Bottom-right toggles English/Chinese.

---

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 8 |
| State | Zustand |
| Watermark Rendering | HTML5 Canvas API |
| AI Detection | YOLOv8 |
| AI Inpainting | LaMa / OpenCV |
| Python API | FastAPI + uvicorn |
| Export | JSZip + FileSaver |

---

## 中文

### 功能特性

#### 加水印
| 类型 | 可选项 |
|------|--------|
| **文字水印** | 字体、大小、颜色、透明度、旋转、阴影、描边、9宫格定位 |
| **图片水印 (Logo)** | 上传Logo、缩放、透明度、6种混合模式、旋转 |
| **图案水印** | 网格线、对角线条纹、平铺图案 |

#### 去水印
- **AI检测**：YOLO自动定位水印区域
- **智能修复**：LaMa AI或OpenCV填充被移除区域
- **手动调整**：拖拽/缩放检测框；一键应用到全部图片
- **角落定位**：自动检测常见水印位置（右下角等）

#### 批量处理
- 拖拽或点击导入多张图片
- 实时进度追踪
- 原图/处理后 一键对比预览
- 导出：单张下载或ZIP批量导出 (PNG/JPEG/WebP)

---

### 快速开始

**环境要求**：Node.js 18+、Python 3.10+、pip

`ash
# 克隆并安装
git clone https://github.com/q5210823/Image-Watermark-Tool.git
cd Image-Watermark-Tool
npm install
pip install -r server/requirements.txt

# 启动（方式一）：双击 start.bat
# 启动（方式二）：手动启动
python -m uvicorn server.remover_api:app --host 127.0.0.1 --port 5178
npx vite
# 打开 http://localhost:5173
`

> 首次运行：YOLO + LaMa 模型（约200MB）会在首次使用时自动下载。

---

### 使用方法

**加水印**：导入图片 → 右侧选"加水印" → 选择文字/图片/图案 → 调整参数 → 点击"全部处理" → 点击"导出"

**去水印**：导入图片 → 右侧选"去水印" → 检测环境 → 点击检测 → YOLO自动框选水印 → 可拖拽调整选框 → 点击"全部去除" → 点击放大图标查看效果 → 导出

**小技巧**：
- 同一位置水印：先检测一张图，调整选框，点击"应用到全部图片"
- 放大查看：鼠标悬停图片卡片 → 点击放大图标
- 语言切换：右下角切换中/英文

---

### 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite 8 |
| 状态管理 | Zustand |
| 水印渲染 | HTML5 Canvas API |
| AI检测 | YOLOv8 |
| AI修复 | LaMa / OpenCV |
| Python API | FastAPI + uvicorn |
| 导出 | JSZip + FileSaver |

---

## License

MIT
