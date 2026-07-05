# 去水印功能 --- 架构设计文档

> **项目代号**: WatermarkForge  
> **版本**: v2.0 (去水印模块)  
> **日期**: 2026-07-05  
> **核心引擎**: santifer/watermark-remover (YOLOv8 + LaMa)  
> **集成方式**: Tauri Rust 后端 → Python 子进程桥接

---

## 1. 系统架构总览

```
+------------------------------------------------------------+
|                    WatermarkForge 桌面应用                    |
|                        (Tauri v2)                          |
+------------------------------------------------------------+
|                                                             |
|  +--------------------+    +-----------------------------+  |
|  |    Web 前端         |    |     Rust 后端                |  |
|  |  (React + Vite)    |    |   (src-tauri/)              |  |
|  |                     |    |                             |  |
|  | - 去水印参数面板     | IPC | - 水印去除调度器              |  |
|  | - 检测区域预览       |<-->| - Python 子进程管理           |  |
|  | - 进度/状态反馈      |    | - 图像 I/O 中间层             |  |
|  | - 结果展示           |    | - ZIP 打包                  |  |
|  +--------------------+    +-------------+---------------+  |
|                                          |                  |
|                                 Python Subprocess           |
|                                          |                  |
|                             +------------v---------------+  |
|                             |  Python 去水印引擎           |  |
|                             |  (watermark_remover/)      |  |
|                             |                            |  |
|                             |  +----------------------+  |  |
|                             |  | YOLOv8 Detector     |  |  |
|                             |  | (ultralytics)       |  |  |
|                             |  +----------+-----------+  |  |
|                             |             |               |  |
|                             |  +----------v-----------+  |  |
|                             |  |  LaMa Inpainter      |  |  |
|                             |  | (PyTorch TorchScript)|  |  |
|                             |  +----------------------+  |  |
|                             |                            |  |
|                             |  +----------------------+  |  |
|                             |  |  OpenCV Inpainter    |  |  |
|                             |  |  (Fallback)          |  |  |
|                             |  +----------------------+  |  |
|                             +----------------------------+  |
+------------------------------------------------------------+
```

---

## 2. 模块职责

### 2.1 Web 前端层

| 组件 | 职责 |
|---|---|
| `WatermarkRemovalPanel` | 去水印参数配置表单 (新建) |
| `DetectionPreview` | 检测区域可视化叠加层 (新建) |
| `WatermarkPanel` | 扩展 Tab 切换: 新增「去水印」Tab (修改) |
| `PreviewGrid` | 支持去水印前后对比 (修改) |
| `StatusBar` | 显示 Python 环境检测状态 (修改) |

### 2.2 Rust 后端层 (Tauri)

| 模块 | 职责 |
|---|---|
| `remover_command` | Tauri Command: 接收前端去水印请求，调度 Python 子进程 |
| `python_bridge` | Python 子进程生命周期管理: 启动、通信、超时、清理 |
| `progress_emitter` | 通过 Tauri Event 向前端推送处理进度 |
| `image_io` | 临时文件管理: 保存输入图片、读取输出结果 |
| `env_checker` | Python 环境检测: 版本、依赖、模型缓存状态 |

### 2.3 Python 引擎层

| 模块 | 职责 |
|---|---|
| `watermark_remover/cli.py` | CLI 入口 (现有代码, 复用) |
| `watermark_remover/detector.py` | YOLOv8 检测 + 角标回退 (现有代码, 复用) |
| `watermark_remover/inpainter.py` | LaMa / OpenCV 修复 (现有代码, 复用) |
| `watermark_remover/batch.py` | 批量处理封装 (新增) |
| `watermark_remover/pipeline.py` | 检测→修复 流水线编排 (新增) |

---

## 3. 通信协议

### 3.1 Tauri Command (IPC)

```rust
// Rust: 注册给前端调用的 Command

#[tauri::command]
async fn remove_watermark(
    app: AppHandle,
    image_paths: Vec<String>,
    config: RemoverConfig,
) -> Result<Vec<String>, String>;

#[tauri::command]
async fn check_python_env(app: AppHandle) -> Result<EnvStatus, String>;

#[tauri::command]
async fn detect_watermark(
    app: AppHandle,
    image_path: String,
    config: RemoverConfig,
) -> Result<DetectionResult, String>;
```

### 3.2 参数结构

```typescript
// TypeScript: 前端发送给后端的配置

interface RemoverConfig {
  confidence: number;        // YOLO 置信度阈值 (0.0 - 1.0)
  padding: number;           // 检测框外扩像素
  method: 'lama' | 'opencv'; // 修复方法
  fallbackCorner: boolean;   // 是否启用角标回退
  corner: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  cornerWidth: number;       // 角标宽度比例 (0.0 - 1.0)
  cornerHeight: number;      // 角标高度比例 (0.0 - 1.0)
  forceCorner: boolean;      // 强制角标模式
}
```

### 3.3 事件推送 (Tauri Event)

```typescript
// 前端监听的事件

interface ProgressEvent {
  type: 'progress';
  current: number;
  total: number;
  imageName: string;
}

interface DetectionEvent {
  type: 'detection';
  imageName: string;
  bboxes: Array<{ x1: number; y1: number; x2: number; y2: number; confidence: number }>;
  usingFallback: boolean;
}

interface StatusEvent {
  type: 'status';
  status: 'processing' | 'saving' | 'done' | 'error';
  message: string;
}
```

---

## 4. 处理流程

### 4.1 环境检测流程

```
用户点击「去水印」Tab
        ↓
Tauri 调用 check_python_env()
        ↓
Rust 后端:
  1. 检查 python3/python 是否在 PATH 中
  2. 检查 Python 版本 >= 3.10
  3. 检查必要包: torch, ultralytics, Pillow, opencv-python
  4. 检查 LaMa 模型缓存是否存在
        ↓
返回 EnvStatus:
  - python_available: boolean
  - python_version: string
  - deps_installed: boolean
  - model_cached: boolean
  - missing_deps: string[]
```

### 4.2 单张去除流程

```
用户配置参数 → 点击「检测」
        ↓
Tauri Command: detect_watermark(image_path, config)
        ↓
Rust 后端:
  1. 保存图片到临时目录
  2. 启动 Python 子进程:
     python -m watermark_remover detect <input> --confidence 0.5 --json
  3. 解析 JSON 输出 (检测框坐标)
  4. 返回 DetectionResult 给前端
        ↓
前端在图片上叠加绘制检测框 (半透明矩形)
用户确认或调整参数后点击「去除水印」
        ↓
Tauri Command: remove_watermark(image_paths, config)
        ↓
Rust 后端:
  1. 逐张处理图片
  2. 启动 Python 子进程:
     python -m watermark_remover batch <input_dir> <output_dir> [options]
  3. 通过 stdout 读取进度 (JSON Lines)
  4. 通过 Tauri Event 推送进度给前端
  5. 处理完成后，读取输出图片为 DataUrl
  6. 将结果写入 ImageItem.processedDataUrl
        ↓
前端更新预览网格
```

### 4.3 批量处理流程

```
用户选择多张图片 → 点击「全部处理」
        ↓
Rust 调度器:
  1. 创建临时输入/输出目录
  2. 将所有待处理图片复制到输入目录
  3. 启动单次 Python 进程:
     python -m watermark_remover batch <input_dir> <output_dir> [options]
  4. Python 进程按序处理，每完成一张输出 JSON Line:
     {"status": "done", "file": "img001.png", "time": 3.2}
  5. Rust 读取输出目录，加载处理后的图片
  6. 更新前端状态
```

---

## 5. Python 子进程管理

### 5.1 进程池策略

```rust
struct PythonBridge {
    // 复用 Python 进程 (保持热启动)
    process: Option<Child>,
    // 正在处理的图片队列
    queue: Vec<Job>,
    // 配置缓存
    last_config: RemoverConfig,
}
```

| 策略 | 说明 |
|---|---|
| **按需启动** | 每次调用启动新进程，完成后退出。简单可靠 |
| **进程复用** | 保持 Python 进程常驻，通过 stdin/stdout 通信。适合批量处理 |

### 5.2 超时控制

| 场景 | 超时时间 |
|---|---|
| 单张 LaMa 处理 | 120s |
| 单张 OpenCV 处理 | 30s |
| 批量处理 (每张) | 120s |
| 模型首次下载 | 300s |

### 5.3 错误处理

```rust
enum RemoverError {
    PythonNotFound,           // Python 未安装
    VersionMismatch(String),  // 版本不满足要求
    DepsMissing(Vec<String>), // 缺少依赖包
    ModelDownloadFailed,      // 模型下载失败
    ProcessTimeout,           // 处理超时
    ImageCorrupted(String),   // 图片损坏
    OutOfMemory,              // 内存不足
}
```

---

## 6. 文件结构 (新增/修改)

### 6.1 Rust 后端新增

```
src-tauri/src/
├── remover/
│   ├── mod.rs              # 模块导出
│   ├── commands.rs         # Tauri Command 定义
│   ├── bridge.rs           # Python 子进程管理
│   ├── env_checker.rs      # 环境检测
│   ├── progress.rs         # 进度推送
│   └── types.rs            # 类型定义 + 序列化
```

### 6.2 Python 引擎修改

```
watermark_remover/
├── __init__.py             # (修改) 导出新模块
├── __main__.py             # (修改) 支持新子命令
├── cli.py                  # (修改) 添加 batch 命令
├── detector.py             # (复用) 无修改
├── inpainter.py            # (复用) 无修改
├── batch.py                # (新增) 批量处理逻辑
└── pipeline.py             # (新增) 检测→修复流水线
```

### 6.3 前端新增/修改

```
src/
├── components/
│   ├── WatermarkPanel/
│   │   ├── WatermarkPanel.tsx        # (修改) 新增【去水印】Tab
│   │   ├── TextWatermarkForm.tsx      # (无修改)
│   │   ├── ImageWatermarkForm.tsx     # (无修改)
│   │   ├── PatternWatermarkForm.tsx   # (无修改)
│   │   └── WatermarkRemovalForm.tsx   # (新增) 去水印参数表单
│   ├── RemovalPreview/
│   │   ├── RemovalPreview.tsx         # (新增) 检测区域可视化
│   │   └── DetectionOverlay.tsx       # (新增) Canvas 叠加层
│   └── PreviewGrid/
│       └── PreviewGrid.tsx           # (修改) 支持去水印前后对比
├── stores/
│   └── useAppStore.ts                # (修改) 新增去水印相关状态
├── utils/
│   ├── watermarkEngine.ts            # (无修改)
│   └── watermarkRemover.ts           # (新增) 前端→Tauri IPC 封装
├── i18n/
│   ├── en.ts                         # (修改) 新增去水印翻译
│   └── zh.ts                         # (修改) 新增去水印翻译
└── types/
    └── index.ts                      # (修改) 新增去水印类型定义
```

---

## 7. 参数默认值

```typescript
export const DEFAULT_REMOVER_PARAMS: RemoverParams = {
  type: 'remover',
  confidence: 0.5,          // YOLO 置信度
  padding: 10,              // 检测框外扩像素
  method: 'lama',           // 修复方法: lama | opencv
  fallbackCorner: true,     // 启用角标回退
  corner: 'bottom-right',   // 角标位置
  cornerWidth: 0.12,        // 角标宽度比例
  cornerHeight: 0.08,       // 角标高度比例
  forceCorner: false,       // 强制角标
};
```

---

## 8. 依赖与安装

### 8.1 用户安装流程

```
1. 确保已安装 Python 3.10+
2. 打开终端执行: pip install watermark-remover
3. 首次使用去水印功能时，自动下载 LaMa 模型 (~200MB)
4. 应用内提供「环境检测」按钮，引导用户完成安装
```

### 8.2 自动检测与引导

```
┌──────────────────────────────────────┐
│  Python 环境检测结果                   │
│                                      │
│  ✅ Python 3.11.5  (C:\Python311)    │
│  ✅ watermark-remover 已安装          │
│  ❌ LaMa 模型未缓存                    │
│                                      │
│  [立即下载模型 (200MB)]               │
└──────────────────────────────────────┘
```

### 8.3 requirements.txt (Python 引擎)

```
torch>=2.0.0
torchvision>=0.15.0
ultralytics>=8.0.0
simple-lama-inpainting>=0.1.0
Pillow>=9.0.0
opencv-python>=4.7.0
numpy>=1.24.0
click>=8.0.0
```

---

## 9. 安全与隐私

| 方面 | 说明 |
|---|---|
| **数据本地化** | 所有图片处理在用户本地完成，不上传任何数据 |
| **模型本地化** | YOLO 和 LaMa 模型存储在本地缓存，无需联网推理 |
| **临时文件清理** | Rust 后端在处理完成后清理临时目录 |
| **子进程隔离** | Python 子进程以低权限运行，限制文件系统访问范围 |
| **内存保护** | 大图自动分块处理 (v2.1+)，防止 OOM |

---

## 10. 性能目标

| 场景 | 目标 | 测量条件 |
|---|---|---|
| 环境检测 | ≤2s | Python 已安装，依赖齐全 |
| YOLO 检测 (单张) | ≤3s | 1920×1080 图片 |
| LaMa 修复 (单张) | ≤15s | 1920×1080 图片, CPU |
| OpenCV 修复 (单张) | ≤2s | 1920×1080 图片 |
| 批量 10 张 (LaMa) | ≤180s | 含进度反馈 |
| 模型首次下载 | ≤300s | 50Mbps 网络连接 |

---

## 11. 版本规划

| 版本 | 功能 |
|---|---|
| v2.0 | 基础去水印: YOLO 检测 + LaMa/OpenCV 修复 + 角标回退 |
| v2.1 | 手动修正检测区域 + 大图分块处理 + 自定义模型导入 |
| v2.2 | 多轮修复 + 参数预设保存/加载 |
| v3.0 | 视频去水印 (帧序列处理) |

---
