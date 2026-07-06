# WatermarkForge — 产品需求文档 (PRD)

> **项目代号**: WatermarkForge  
> **版本**: v2.0 (PRD 重构)  
> **日期**: 2026-07-05  
> **技术基底**: Vite + React + TypeScript (前端) + Python FastAPI (后端)  

---

## 1. 产品概述

### 1.1 产品定位

轻量级、本地化运行的桌面端批量水印处理工具。核心处理逻辑在本地完成，无需联网，保障用户图片隐私。

### 1.2 设计目标

- **本地优先**: 所有图像处理在用户设备上完成，不上传任何文件。
- **批量高效**: 支持同时导入成百上千张图片并统一施加/去除水印。
- **水印多样性**: 文本、图片(Logo)、图案(平铺/网格/对角线)三类水印。
- **所见即所得**: 实时预览网格，处理前 vs 处理后对比。
- **可扩展架构**: 为后续批量修改水印参数、编辑水印内容等高级功能预留扩展点。
- **多语言**: 内置中/英文界面切换。
- **AI 去水印**: 集成 YOLOv8 + LaMa 实现智能水印去除。

### 1.3 版本路线

| 版本 | 代号 | 主要功能 | 状态 |
|------|------|---------|------|
| v1.0 | MVP | 图片导入、文本/图片/图案水印、批量预览、ZIP 导出 | ✅ 已发布 |
| v1.01 | Bugfix | 修复文字缩小、导出乱码、编辑状态保持等 BUG | ✅ 已发布 |
| v1.02 | Remover | YOLO 检测 + LaMa 去水印、检测框编辑、批量去除 | ✅ 已发布 |
| v1.03 | Edit (P3) | 水印编辑：OCR 识别 + 样式分析 + 文字替换 | 📋 规划中 |

---

## 2. 当前技术架构

```
WatermarkForge 桌面应用

  +---------------------------+
  |     Vite 开发服务器        |
  |   (端口 5173)             |
  +-------------+-------------+
                | HTTP / REST
  +-------------+-------------+
  |     Python FastAPI 后端    |
  |   (端口 5178)             |
  |   - 水印去除 (YOLO + LaMa) |
  |   - 图像修复               |
  |   - 环境检测               |
  +-------------+-------------+
                |
  +-------------+-------------+
  |     Web 前端               |
  |   (React 19 + TypeScript) |
  |   - 拖拽导入界面            |
  |   - 水印参数面板            |
  |   - 实时预览网格            |
  |   - 检测框编辑              |
  |   - 导出管理               |
  |   - 中英文切换              |
  +---------------------------+
```

### 2.1 启动方式

用户通过 `start.bat` 一键启动，同时拉起两个服务：

```bat
python -m uvicorn server.remover_api:app --host 127.0.0.1 --port 5178
npx vite --host
```

### 2.2 核心依赖

| 层 | 技术选型 | 用途 |
|---|---|---|
| 前端框架 | React 19 + TypeScript | UI 渲染 |
| 打包工具 | Vite 8.x | 开发/构建 |
| 状态管理 | Zustand 5.x | 全局状态 |
| UI 图标 | Lucide React | 图标库 |
| 导出 | JSZip + FileSaver | ZIP 打包下载 |
| 后端框架 | Python FastAPI + uvicorn | REST API |
| AI 检测 | YOLOv8 (ultralytics) | 水印目标检测 |
| AI 修复 | LaMa (PyTorch TorchScript) | 图像修复 |
| 回退修复 | OpenCV inpainting | 快速修复 |

### 2.3 项目目录结构

```
J:\Save Edutor/
├── index.html                 # Vite 入口 HTML
├── start.bat                  # 启动脚本（前后端同时启动）
├── package.json               # 前端依赖
├── vite.config.ts             # Vite 配置
├── tsconfig.json              # TypeScript 配置
│
├── src/                       # 前端源码
│   ├── main.tsx               # React 入口
│   ├── App.tsx                # 主应用组件
│   │
│   ├── components/            # UI 组件
│   │   ├── common/
│   │   │   └── ErrorBoundary.tsx        # 错误边界
│   │   ├── ImportPanel/                 # 导入面板
│   │   │   └── ImportPanel.tsx
│   │   ├── WatermarkPanel/              # 水印配置面板
│   │   │   ├── WatermarkPanel.tsx        # Tab 切换容器
│   │   │   ├── TextWatermarkForm.tsx     # 文本水印表单
│   │   │   ├── ImageWatermarkForm.tsx    # 图片水印表单
│   │   │   ├── PatternWatermarkForm.tsx  # 图案水印表单
│   │   │   ├── WatermarkRemovalForm.tsx  # 去水印表单
│   │   │   └── index.ts
│   │   ├── PreviewGrid/                 # 预览网格
│   │   │   └── PreviewGrid.tsx
│   │   ├── ImageViewer/                 # 图片查看器+检测框编辑
│   │   │   ├── ImageViewer.tsx
│   │   │   └── DetectionEditor.tsx      # 可拖拽检测框
│   │   ├── ExportDialog/                # 导出对话框
│   │   │   └── ExportDialog.tsx
│   │   └── StatusBar/                   # 状态栏
│   │       ├── StatusBar.tsx
│   │       └── LanguageToggle.tsx       # 中英文切换
│   │
│   ├── stores/
│   │   └── useAppStore.ts               # Zustand 全局状态
│   │
│   ├── types/
│   │   └── index.ts                     # 类型定义
│   │
│   ├── utils/
│   │   ├── watermarkEngine.ts           # 前端 Canvas 水印渲染引擎
│   │   ├── watermarkRemover.ts          # 去水印 API 客户端
│   │   ├── fileUtils.ts                 # 文件工具函数
│   │   └── logger.ts                    # 前端日志
│   │
│   ├── i18n/
│   │   ├── index.ts                     # i18n 配置
│   │   ├── en.ts                        # 英文翻译
│   │   ├── zh.ts                        # 中文翻译
│   │   └── useTranslation.ts            # 翻译 Hook
│   │
│   └── styles/
│       ├── global.css                   # 全局样式
│       ├── designTokens.css             # 设计 Token
│       └── components.css               # 组件样式
│
├── server/                    # Python 后端
│   ├── remover_api.py         # FastAPI 主程序（6 个端点）
│   └── requirements.txt       # Python 依赖
│
├── logs/                      # 运行日志
│   └── python-api.log
│
├── dist/                      # 构建产物
├── node_modules/
└── public/
```

---

## 3. 功能需求 — P0: 添加水印 (Add Watermark) ✅ 已完成

### 3.1 F1: 图片导入

| 项 | 描述 |
|---|---|
| 拖拽导入 | 支持从文件管理器拖入文件夹或图片文件到应用窗口 |
| 文件选择器 | 通过系统对话框选择单张或多张图片 |
| 格式支持 | JPEG, PNG, WebP, BMP |
| 文件信息 | 导入后显示文件名、尺寸、格式、大小 |
| 状态标记 | 待处理 / 处理中 / 已完成 / 失败 四种状态标记 |

### 3.2 F2: 文本水印

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| 文本内容 | string | Watermark | 用户输入的水印文字 |
| 字体族 | select | Arial | 系统字体列表 |
| 字号 | number | 36 | px |
| 颜色 | color picker | #FFFFFF | |
| 透明度 | slider 0-100 | 70 | % |
| 旋转角度 | slider -180~180 | 0 | 度 |
| 阴影 | switch + config | off | 颜色、模糊半径、偏移 X/Y |
| 描边 | switch + config | off | 颜色、宽度 |
| 位置 | presets | bottom-right | 9 宫格预设位置 |
| 边距 | number | 20 | 距离边缘的 px |

### 3.3 F3: 图片水印 (Logo)

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| Logo 图片 | file picker | --- | PNG/JPEG/WebP，建议 PNG 透明背景 |
| 缩放比例 | slider 1-100 | 25 | 占原图宽度的百分比 |
| 透明度 | slider 0-100 | 70 | % |
| 混合模式 | select | normal | normal/multiply/screen/overlay/darken/lighten |
| 位置 | presets | bottom-right | 同文本水印 |
| 旋转 | slider -180~180 | 0 | 度 |

### 3.4 F4: 图案水印

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| 图案样式 | select | grid | tile(平铺)/grid(网格)/diagonal(对角线) |
| 平铺图片 | file picker | --- | tile 模式: 用户上传平铺用图片 |
| 网格线宽 | number | 1 | grid 模式: 网格线像素宽度 |
| 网格颜色 | color picker | #FFFFFF | grid 模式 |
| 网格间距 | number | 100 | grid 模式: 网格线间距 |
| 对角线线宽 | number | 2 | diagonal 模式 |
| 对角线颜色 | color picker | #FFFFFF | diagonal 模式 |
| 对角线角度 | number | 45 | diagonal 模式: 倾斜角度 |
| 对角线间距 | number | 80 | diagonal 模式 |
| 透明度 | slider 0-100 | 30 | % |

### 3.5 F5: 批量预览

- **网格布局**: 缩略图网格展示所有导入图片
- **前后对比**: 每张图片显示"处理前"vs"处理后"双栏对比
- **实时更新**: 调整水印参数时实时刷新预览
- **缩放控制**: 用户可调节网格缩略图尺寸

### 3.6 F6: 导出

| 功能 | 说明 |
|---|---|
| 单张下载 | 点击单张图片的下载按钮 |
| ZIP 打包 | 一键打包所有已处理图片 |
| 格式选择 | PNG / JPEG / WebP |
| 质量控制 | JPEG/WebP 质量滑块 (1-100) |
| 命名规则 | 原文件名 / 前缀+原文件名 / 序列号 |

### 3.7 前端水印渲染引擎

所有水印渲染在前端通过 Canvas 完成，无需后端参与：

- 文本水印：Canvas fillText + shadow + strokeText
- 图片水印：Canvas drawImage + globalCompositeOperation
- 图案水印：Canvas 循环绘制 + 变换矩阵

```typescript
// watermarkEngine.ts — 核心渲染入口
function applyTextWatermark(ctx, image, params: TextWatermarkParams): void
function applyImageWatermark(ctx, image, imgLogo, params: ImageWatermarkParams): void
function applyPatternWatermark(ctx, image, params: PatternWatermarkParams): void
function applyAllWatermarks(ctx, image, text, image, pattern): void
```

---

## 4. 功能需求 — P2: 去水印 (Watermark Removal) ✅ 已完成

### 4.1 功能概述

集成 `watermark-remover` (YOLOv8 + LaMa) 作为后端引擎，实现批量去除图片水印功能。用户选择图片后，通过 AI 自动检测水印区域并智能修复。

### 4.2 用户流程

```
导入图片 → 选择「去水印」Tab → 配置参数 → 自动检测 → 预览/调整检测框 → 批量去除 → 导出结果
```

### 4.3 F7: 水印检测

| 项 | 描述 |
|---|---|
| 自动检测 | YOLOv8 模型自动识别图片中的水印区域 |
| 区域标注 | 在预览图中用半透明红色矩形框标出检测到的水印位置 |
| 置信度调节 | 用户可调节 YOLO 检测阈值 (0.0 - 1.0)，默认 0.5 |
| 手动修正 | 支持用户拖拽调整检测框位置和大小、删除多余检测框 |
| 角标回退 | YOLO 未检测到时，自动使用角落区域作为水印位置 |
| 放大编辑 | 点击预览图放大后支持精确框选操作 |
| 应用到全部 | 将用户调整后的框选位置批量应用到所有图片 |

### 4.4 F8: 图像修复

| 项 | 描述 |
|---|---|
| LaMa 修复 | 默认使用 LaMa (PyTorch) 进行高精度图像修复 |
| OpenCV 回退 | 可选 OpenCV inpainting (更快但质量较低) |
| 模型缓存 | LaMa 模型 (~200MB) 首次运行时自动下载并缓存 |
| 区域扩展 | 支持 padding 参数，扩展检测区域周边像素 |

### 4.5 F9: 去水印参数面板

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| 检测置信度 | slider 0-100 | 50 | YOLO 检测阈值 (映射为 0.0-1.0) |
| 检测区域扩展 | number | 10 | 检测框外扩像素 |
| 修复方法 | select | lama | lama (高质量) / opencv (快速) |
| 启用角标回退 | toggle | true | YOLO 未命中时使用角标 |
| 角标位置 | select | bottom-right | 回退使用的角落 |
| 角标宽度比例 | slider 0-50% | 12% | 角标区域占图片宽度比例 |
| 角标高度比例 | slider 0-50% | 8% | 角标区域占图片高度比例 |
| 强制角标模式 | toggle | false | 跳过 YOLO，直接使用角标 |

### 4.6 后端 API 端点

| 端点 | 方法 | 功能 |
|---|---|---|
| `/api/health` | GET | 服务健康检查 |
| `/api/env` | GET | Python 环境检测 |
| `/api/model-health` | GET | LaMa 模型状态检查 |
| `/api/detect` | POST | YOLO 检测水印区域，返回检测框坐标 |
| `/api/remove` | POST | 自动检测并去除水印，返回已修复图片 |
| `/api/remove-bbox` | POST | 使用自定义检测框去除水印 |

### 4.7 技术约束

| 约束项 | 说明 |
|---|---|
| Python 版本 | 需要系统安装 Python 3.10+ |
| 依赖安装 | 需要 `pip install watermark-remover` 及依赖 |
| 模型下载 | LaMa 模型 (~200MB) 首次使用时自动下载 |
| 运行环境 | 强制 CPU 模式 |
| 内存需求 | 建议 ≥8GB RAM |

---

## 5. 功能需求 — P3: 编辑水印 (Edit Watermark) 📋 规划中

### 5.1 功能概述

新增**编辑水印**工作模式，与"添加水印"、"去除水印"并列。用户可选中图片中的现有文字水印，修改其内容和样式，由后端完成"去除原文字 + 渲染新文字"的完整流程。

### 5.2 用户流程

```
切换到「编辑水印」Tab → 导入/选择图片 → 自动 OCR 检测 → 选中文字框 → 自动分析样式 → 修改文字/样式 → 预览效果 → 应用到当前/全部 → 导出
```

### 5.3 F10: 文字检测 (OCR)

| 项 | 描述 |
|---|---|
| 检测引擎 | PaddleOCR 替代 YOLO，返回文字内容 + 位置 |
| 检测模式 | `POST /api/detect {mode:\'text\'}` 复用现有端点 |
| 返回信息 | OCR 框坐标、识别文字内容、置信度 |
| 预览标注 | 蓝色检测框（区别于去水印的红色），框上显示文字标签 |
| 交互操作 | 双击文字框进入编辑状态 |

### 5.4 F11: 样式自动分析

| 项 | 描述 |
|---|---|
| 分析端点 | `POST /api/analyze-text-style` |
| 自动提取 | 颜色、字体大小、透明度、阴影、描边 |
| 手动覆盖 | 用户可在面板中手动调整任何样式参数 |

### 5.5 F12: 文字编辑与渲染

| 项 | 描述 |
|---|---|
| 编辑端点 | `POST /api/edit-text` — 后端 Pipeline: Inpaint + Pillow 渲染 |
| 内容修改 | 用户修改文字内容（如日期水印改为新值） |
| 样式调整 | 颜色、字体、大小、透明度、阴影、描边、旋转 |
| 实时预览 | 前端 Canvas 快速渲染（<50ms 延迟） |
| 最终渲染 | 后端 Pillow 高质量渲染（抗锯齿、边缘羽化） |

### 5.6 F13: 批量编辑

| 项 | 描述 |
|---|---|
| 批量端点 | `POST /api/batch-edit-text` |
| 模板匹配 | 基于相对坐标 + 正则匹配，自动定位同类水印 |
| 应用全部 | 将第一张图的编辑操作应用到文件夹内所有匹配图片 |

### 5.7 新增后端 API

| 端点 | 方法 | 功能 |
|---|---|---|
| `/api/detect?mode=text` | POST | PaddleOCR 检测文字区域和内容 |
| `/api/analyze-text-style` | POST | 分析文字区域视觉样式 |
| `/api/edit-text` | POST | 去除原文字 + 渲染新文字 |
| `/api/batch-edit-text` | POST | 批量编辑文字水印 |

### 5.8 新增/改造前端组件

| 组件 | 变更 |
|---|---|
| `WatermarkPanel` | 新增第五个 Tab「编辑水印」 |
| `TextEditForm` | 新增：文字编辑参数面板 |
| `DetectionEditor` | 改造：支持蓝色检测框、双击编辑、文字标签浮层 |
| `watermarkEngine.ts` | 新增 `previewTextEdit()` 前端实时预览 |
| `watermarkRemover.ts` | 新增 `editText()` / `analyzeTextStyle()` API 客户端 |

---

## 6. 扩展性设计

### 6.1 工作模式架构

三种工作模式并列，共享导入、预览、导出流程：

```
+-------------------------------------+
|          WatermarkForge               |
+-------------------------------------+
|  [添加水印]  [编辑水印]  [去除水印]   |
+----------+----------+---------------+
|  文本     |  OCR 检测 |  YOLO 检测    |
|  图片     |  样式分析  |  LaMa 修复    |
|  图案     |  文字替换  |  角标回退     |
|  预览     |  实时预览  |  框选编辑     |
|  导出     |  批量应用  |  批量去除     |
+----------+----------+---------------+
```

### 6.2 前后端分工原则

- **前端负责**: 用户交互、参数配置、实时预览、导出打包
- **后端负责**: AI 检测 (YOLO/PaddleOCR)、图像修复 (LaMa/OpenCV)、高质量渲染 (Pillow)

### 6.3 未来扩展

| 功能 | 路线图 | 预估版本 |
|---|---|---|
| 批量修改水印参数（预设管理） | 独立功能 | v1.1 |
| 视频去水印（帧序列处理） | 架构预留 | v2.0 |
| 自定义 YOLO 模型导入 | 去水印增强 | v1.1 |
| 水印参数预设保存/加载 | 添加水印增强 | v1.1 |
| 多轮修复 | 去水印增强 | v1.2 |

---

## 7. 版本历史

| 版本 | 日期 | 变更内容 |
|---|---|---|
| v1.0 | 2026-07 | MVP 版本：文本/图片/图案水印 + 批量预览 + ZIP 导出 |
| v1.01 | 2026-07 | Bug 修复：文字缩小、导出乱码、编辑状态保持 |
| v1.02 | 2026-07 | 去水印功能：YOLOv8 + LaMa + 检测框编辑 + 批量去除 |
| v1.03 | 📋 规划 | 编辑水印功能：OCR + 样式分析 + 文字替换 |

---

## 8. 界面设计原则

### 8.1 布局

```
+------+----------------------+------+
|      |                      |      |
| 导入  |    预览网格 /         | 水印  |
| 面板  |    图片查看器         | 参数  |
|      |                      | 面板  |
|      |                      |      |
+------+----------------------+------+
|            状态栏                    |
+------------------------------------+
```

- **左侧**: 图片导入面板（文件列表 + 导入按钮）
- **中央**: 预览网格（缩略图网格 / 单图放大查看）
- **右侧**: 水印参数配置面板（Tab 切换不同水印类型）
- **底部**: 状态栏（进度、缩放、中英文切换、导出按钮）

### 8.2 设计风格

- **颜色主题**: 深色背景 + 紫色系强调色 (#7C3AED / #8B5CF6)
- **卡片风格**: 圆角卡片，轻微阴影，层次分明
- **响应式**: 面板可折叠，预览网格自适应缩放

---

## 9. 日志与调试

### 9.1 前端日志

日志文件存储路径: `logs/frontend-*.log`

### 9.2 后端日志

日志文件存储路径: `logs/python-api.log`

```python
# server/remover_api.py 内置 logging 配置
log_dir = Path('logs/')
log_file = log_dir / 'python-api.log'
```

---

## 10. 多语言

内置中/英文界面，通过右下角切换按钮实时切换：

| 语言 | 文件 | 覆盖范围 |
|---|---|---|
| 英文 | `src/i18n/en.ts` | 全部 UI 文本 |
| 中文 | `src/i18n/zh.ts` | 全部 UI 文本 |

---

## 11. 构建与部署

### 11.1 开发环境

```bash
# 后端
cd server
pip install -r requirements.txt
python remover_api.py     # 启动后端 :5178

# 前端（另一个终端）
npm install
npm run dev              # 启动前端 :5173
```

### 11.2 一键启动

```bash
# Windows
start.bat                # 同时启动前端 + 后端 + 打开浏览器
```

### 11.3 生产构建

```bash
npm run build            # 输出到 dist/
npm run preview          # 预览构建产物
```

---
