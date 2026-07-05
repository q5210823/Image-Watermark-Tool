# WatermarkForge

<div align="center">
  <p><em>A lightweight, local-first batch watermarking tool built with Tauri v2 + React + Rust</em></p>
  <p><em>轻量级、本地优先的批量水印工具，基于 Tauri v2 + React + Rust</em></p>
</div>

---

## English

WatermarkForge is a desktop application for batch image watermarking. All processing happens locally on your machine — no files ever leave your computer.

### Features

**Version 1.0 — MVP**

- **Text Watermark**: Custom font, size, color, opacity, rotation, shadow, stroke, and 9-point positioning
- **Image Watermark (Logo)**: Upload your logo, adjustable scale, opacity, 6 blend modes, rotation
- **Pattern Watermark**: Grid lines, diagonal stripes, tile overlay with full customization
- **Batch Processing**: Import multiple images, apply watermarks in parallel, real-time progress tracking
- **Preview Grid**: Thumbnail grid with one-click Original / Watermarked comparison toggle
- **Export**: Single image download or ZIP batch export (PNG/JPEG/WebP)
- **Multi-language**: Built-in English and Chinese (中文) interface
- **Dark Theme**: Professional dark UI optimized for photo editing workflows

### Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Tauri v2 |
| Backend | Rust (planned) / Canvas API (current) |
| Frontend | React 19 + TypeScript + Vite |
| State | Zustand |
| Icons | Lucide React |
| Export | JSZip + FileSaver |

### Getting Started

```bash
# Clone the repository
git clone https://github.com/q5210823/Image-Watermark-Tool.git
cd Image-Watermark-Tool

# Install dependencies
npm install

# Start development server
npm run dev

# Or double-click start.bat (opens browser automatically)
```

### Project Structure

```
src/
  types/           # TypeScript type definitions
  stores/          # Zustand state management
  utils/           # File utilities & watermark engine (Canvas)
  i18n/            # Internationalization (en / zh)
  styles/          # Design tokens & component styles
  components/
    ImportPanel/   # Left sidebar — file list with drag & drop
    PreviewGrid/   # Center — thumbnail grid with before/after toggle
    WatermarkPanel/# Right panel — watermark parameter controls
    ExportDialog/  # Export configuration & download
    StatusBar/     # Bottom status bar with language toggle
    ImageViewer/   # Full-size image preview modal
```

### Architecture Notes

This MVP uses Canvas API for watermark rendering in the frontend. The architecture is designed for a future Rust backend (via Tauri IPC) that will provide native performance. The `WatermarkProcessor` trait is already defined in the PRD as an extension point.

---

## 中文

WatermarkForge 是一款桌面端批量图片水印工具。所有处理在本地完成，不上传任何文件，保障您的图片隐私。

### 功能特性

**版本 1.0 — MVP**

- **文本水印**: 自定义字体、大小、颜色、透明度、旋转、阴影、描边、9宫格定位
- **图片水印 (Logo)**: 上传 Logo，可调缩放/透明度/6种混合模式/旋转
- **图案水印**: 网格线、对角线条纹、平铺图案，完全自定义
- **批量处理**: 同时导入多张图片，并行渲染，实时进度追踪
- **预览网格**: 缩略图网格，一键切换原图/水印图对比
- **导出**: 单张下载或 ZIP 批量导出 (PNG/JPEG/WebP)
- **多语言**: 内置英文和中文界面，一键切换
- **暗色主题**: 专业暗色 UI，适合摄影后期工作流

### 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Tauri v2 |
| 后端 | Rust (计划中) / Canvas API (当前) |
| 前端 | React 19 + TypeScript + Vite |
| 状态管理 | Zustand |
| 图标 | Lucide React |
| 导出 | JSZip + FileSaver |

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/q5210823/Image-Watermark-Tool.git
cd Image-Watermark-Tool

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 或直接双击 start.bat（自动打开浏览器）
```

### 项目结构

```
src/
  types/           # TypeScript 类型定义
  stores/          # Zustand 全局状态
  utils/           # 文件工具 & 水印引擎 (Canvas)
  i18n/            # 国际化 (英文 / 中文)
  styles/          # 设计令牌 & 组件样式
  components/
    ImportPanel/   # 左侧栏 — 文件列表 & 拖拽导入
    PreviewGrid/   # 中央 — 缩略图网格 & 前后对比
    WatermarkPanel/# 右侧 — 水印参数控制面板
    ExportDialog/  # 导出配置 & 下载
    StatusBar/     # 底部状态栏 & 语言切换
    ImageViewer/   # 大图预览弹窗
```

### 架构说明

当前 MVP 版本使用前端 Canvas API 进行水印渲染。架构已为后续 Rust 后端 (通过 Tauri IPC) 预留扩展接口，届时可实现原生级性能。`WatermarkProcessor` trait 已在 PRD 中预先定义。

---

## License

MIT