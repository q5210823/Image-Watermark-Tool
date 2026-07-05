# 批量水印工具 --- 产品需求文档 (PRD)

> **项目代号**: WatermarkForge  
> **版本**: v0.1 (草案)  
> **日期**: 2026-07-05  
> **技术基底**: Tauri v2 + Rust + React/TypeScript (Vite)

---

## 1. 产品概述

### 1.1 产品定位

轻量级、本地化运行的桌面端批量水印处理工具。核心处理逻辑在本地完成，无需联网，保障用户图片隐私。

### 1.2 设计目标

- **本地优先**: 所有图像处理在用户设备上完成，不上传任何文件。
- **批量高效**: 支持同时导入成百上千张图片并统一施加水印。
- **水印多样性**: 文本、图片(Logo)、图案(平铺/网格/对角线)三类水印。
- **所见即所得**: 实时预览网格，处理前 vs 处理后对比。
- **可扩展架构**: 为后续批量修改水印参数、批量去除水印等高级功能预留扩展点。
- **跨平台**: Windows / macOS / Linux 桌面端。

### 1.3 参考项目

| 项目 | 参考价值 |
|---|---|
| codieshiv/bulk-image-watermarking-tool | 功能参考: 文本/图片/图案水印的丰富定制选项、批量处理、预览网格、ZIP 导出 |
| gvoze32/digicamwm | 架构参考: Tauri v2 + Rust 后端 + Vite 前端、原生性能、跨平台打包 |
---

## 2. 技术架构

```
Windows 桌面应用 (Tauri v2)

  +---------------------------+
  |     Rust 后端              |
  |   (src-tauri/)             |
  |   - 图像编解码              |
  |   - 水印渲染引擎            |
  |   - ZIP 打包               |
  |   - 文件 I/O               |
  +-------------+-------------+
                | (IPC / Tauri Command)
  +-------------+-------------+
  |     Web 前端               |
  |   (React + Vite)          |
  |   - 拖拽导入界面            |
  |   - 水印参数面板            |
  |   - 实时预览网格            |
  |   - 导出管理               |
  +---------------------------+
```

Rust crates:
- **image** -- 图像编解码与像素操作
- **imageproc** -- 绘图、字体渲染、几何变换
- **ab_glyph** -- 字体加载与字形渲染
- **zip** -- ZIP 打包
- **serde** -- IPC 序列化

### 2.1 分层说明

| 层 | 技术选型 | 职责 |
|---|---|---|
| Shell | Tauri v2 | 窗口管理、系统菜单、文件对话框、原生拖拽、跨平台打包 |
| Rust 后端 | Rust + crates | 图像 IO、水印合成核心、批处理调度、ZIP 导出 |
| IPC 桥 | Tauri invoke + events | 前端调用后端命令、进度事件推送 |
| Web 前端 | React 18 + TypeScript + Vite | UI 渲染、用户交互、预览缩放、状态管理 |

### 2.2 扩展性设计 (面向未来)

- **插件化水印处理器**: 定义 WatermarkProcessor trait，每种水印类型实现该 trait。后续添加批量修改水印或去水印只需新增 trait 实现。
- **Pipeline 架构**: 批处理采用责任链模式 (WatermarkPipeline)，可串联多个处理步骤。为后续增加水印修改、格式转换、缩放等工作流做准备。
- **配置序列化**: 水印参数以 JSON Schema 持久化，支持预设保存/加载，也为后续批量修改提供标准接口。

```rust
// 扩展点示意 (Rust trait)
pub trait WatermarkProcessor: Send + Sync {
    fn name(&self) -> &str;
    fn process(&self, image: &mut DynamicImage, params: &WatermarkParams) -> Result<()>;
}
```
---

## 3. 功能需求

### 3.1 P0 --- 核心必达 (MVP)

#### F1: 图片导入

| 项 | 描述 |
|---|---|
| 拖拽导入 | 支持从文件管理器拖入文件夹或图片文件到应用窗口 |
| 文件选择器 | 通过系统对话框选择单张或多张图片 |
| 格式支持 | JPEG, PNG, WebP, BMP, TIFF |
| 文件信息 | 导入后显示文件名、尺寸、格式、大小 |
| 状态标记 | 已处理/未处理/失败 三种状态标记 |

#### F2: 文本水印

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| 文本内容 | string | Watermark | 用户输入的水印文字 |
| 字体族 | select | Microsoft YaHei | 系统字体列表 + 自定义 TTF/OTF 导入 |
| 字号 | number | 36 | px |
| 颜色 | color picker | #FFFFFF | |
| 透明度 | slider 0-100 | 70 | |
| 旋转角度 | slider -180~180 | 0 | 度 |
| 阴影 | switch + config | off | 颜色、模糊半径、偏移 X/Y |
| 描边 | switch + config | off | 颜色、宽度 |
| 位置 | presets + free | bottom-right | 9宫格预设 + 拖拽微调 |
| 边距 | number | 20 | 距离边缘的 px |

#### F3: 图片水印 (Logo)

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| Logo 图片 | file picker | --- | PNG/JPEG/WebP，建议 PNG 透明背景 |
| 缩放比例 | slider 1-100 | 25 | 占原图宽度的百分比 |
| 透明度 | slider 0-100 | 70 | |
| 混合模式 | select | normal | normal / multiply / screen / overlay / darken / lighten |
| 位置 | presets + free | bottom-right | 同文本水印 |
| 旋转 | slider -180~180 | 0 | |

#### F4: 图案水印

| 类型 | 参数 | 说明 |
|---|---|---|
| 平铺 (Tile) | 图案文件、间距、透明度、缩放 | 用一个小图案平铺覆盖整个图片 |
| 网格 (Grid) | 线宽、颜色、透明度、间距 | 绘制规则网格线 |
| 对角线 (Diagonal) | 线宽、颜色、透明度、角度、间距 | 对角线条纹覆盖 |

#### F5: 批量处理引擎

| 项 | 描述 |
|---|---|
| 并行处理 | Rust 后端 Rayon 并行处理，充分利用多核 CPU |
| 进度反馈 | Tauri event 实时推送处理进度 (当前 / 总数) |
| 取消操作 | 处理中允许取消，已处理的保留 |
| 错误处理 | 单图失败不影响整体，错误日志可查看 |
| 队列管理 | 支持调整处理顺序、移除图片 |

#### F6: 预览网格

| 项 | 描述 |
|---|---|
| 排列 | 缩略图网格展示，可调节缩略图大小 |
| 对比模式 | 每张卡片显示原图和处理后缩略图，悬停或点击切换 |
| 缩放查看 | 点击缩略图弹出大图预览，支持缩放和平移 |
| 实时更新 | 调节水印参数时，当前选中图片的预览异步更新 (Debounce 300ms) |

#### F7: 导出

| 项 | 描述 |
|---|---|
| 单张导出 | 右键/点击单张图片 -> 选择保存路径 -> 导出 |
| 批量 ZIP | 一键打包所有处理后图片为 ZIP |
| 格式选择 | 导出时可选输出格式 (JPEG/PNG/WebP) |
| 质量设置 | JPEG/WebP 质量 slider 1-100 |
| 命名规则 | 保留原名 / 统一前缀 / 序号递增 |
| 覆盖策略 | 提示/自动重命名/跳过 |

### 3.2 P1 --- 重要功能 (1-2 版本内)

| 功能 | 说明 |
|---|---|
| 预设管理 | 保存/加载/分享水印配置预设 (JSON 文件) |
| 水印叠加 | 同时叠加多个水印 (如文本 + Logo + 图案) |
| EXIF 保留 | 导出时选择是否保留原图 EXIF 信息 |
| 批量重命名 | 更丰富的命名模板: {日期}_{序号}_{原文件名} |
| DPI/尺寸保持 | 确保导出的 DPI 和像素尺寸与原始文件一致 |
| 暗/亮主题 | 系统跟随 + 手动切换 |
| 多语言 | 中/英文界面 |

### 3.3 P2 --- 远期扩展

| 功能 | 说明 |
|---|---|
| 批量修改水印 | 对已处理的图片: 导入新参数，重新渲染并替换 |
| 批量去水印 | 基于 AI / 传统算法的水印去除 (功能开关，本地运行) |
| 批处理脚本 | 定义自动工作流: 导入->水印->缩放->格式转换->导出 |
| 命令行模式 | 无 GUI 下通过 CLI 参数执行批处理 (headless) |
| 文件夹监控 | 监听文件夹新增文件并自动施加水印 |
---

## 4. 用户界面设计

### 4.1 布局结构

```
+-----------------------------------+
| [菜单栏]  文件 | 预设 | 工具 | 帮助  |
+----------+------------------------+
|          |                        |
| 左侧面板  |     中央预览区          |
| (260px)  | (缩略图网格/大图预览)    |
|          |                        |
| +------+ |  +---+ +---+ +---+    |
| | 文件  | |  |原 | |处 | |原 |    |
| | 列表  | |  |图 | |理 | |图 |    |
| |+拖拽  | |  |   | |后 | |   |    |
| |导入区 | |  +---+ +---+ +---+    |
| +------+ |                        |
|          |                        |
| +------+ |                        |
| | 水印  | |                        |
| | 参数  | |                        |
| | 面板  | |                        |
| |(收起) | |                        |
| +------+ |                        |
+----------+------------------------+
| 状态栏: 已导入 12 | 待处理 8 | 完成 4 | [导出] |
+-----------------------------------+
```

### 4.2 关键交互流程

1. 导入 -> 拖拽文件夹到窗口左侧区域(或点击导入按钮)
2. 选择水印类型 -> 右侧参数面板显示对应控件
3. 调参 -> 中央选中图片实时更新效果
4. 全部应用 -> 点击[应用到全部]将当前参数应用到所有图片
5. 批量处理 -> 点击[开始处理]，后端并行渲染，进度条实时更新
6. 预览+对比 -> 处理完成后网格展示 before/after
7. 导出 -> 选择单张或 ZIP，配置格式/质量/命名 -> 完成

---

## 5. 数据结构

### 5.1 水印参数 (核心数据模型)

```typescript
type WatermarkType = "text" | "image" | "pattern";

type PositionPreset =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

interface Position {
  preset: PositionPreset;
  offsetX: number;
  offsetY: number;
}

interface TextWatermarkParams {
  type: "text";
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  shadow: { enabled: boolean; color: string; blur: number; offsetX: number; offsetY: number; } | null;
  stroke: { enabled: boolean; color: string; width: number; } | null;
  position: Position;
  margin: number;
}

interface ImageWatermarkParams {
  type: "image";
  logoPath: string;
  scale: number;
  opacity: number;
  blendMode: BlendMode;
  rotation: number;
  position: Position;
}

interface PatternWatermarkParams {
  type: "pattern";
  patternStyle: "tile" | "grid" | "diagonal";
  tileImage?: string;
  tileSpacing?: number;
  gridLineWidth?: number;
  gridColor?: string;
  gridSpacing?: number;
  diagLineWidth?: number;
  diagColor?: string;
  diagAngle?: number;
  diagSpacing?: number;
  opacity: number;
}

type WatermarkParams = TextWatermarkParams | ImageWatermarkParams | PatternWatermarkParams;

interface Preset {
  id: string;
  name: string;
  description: string;
  watermarks: WatermarkParams[];
  createdAt: string;
}
```

### 5.2 IPC 命令接口 (Rust)

```rust
// 导入图片
async fn import_images(paths: Vec<String>) -> Result<Vec<ImageInfo>>;

// 处理单张图片
async fn process_image(input: String, output: String, params: WatermarkParams) -> Result<()>;

// 批量处理
async fn process_all(images: Vec<BatchItem>, params: WatermarkParams, out_dir: String) -> Result<BatchResult>;

// 导出 ZIP
async fn export_zip(files: Vec<String>, output: String, format: ExportFormat, quality: u8) -> Result<String>;

// 生成预览
async fn generate_preview(input: String, params: WatermarkParams) -> Result<String>;

// 取消处理
async fn cancel_processing() -> Result<()>;
```
---

## 6. 非功能需求

### 6.1 性能

| 指标 | 要求 |
|---|---|
| 单图处理 | 4000x3000 图片加文本水印 <= 500ms |
| 批量吞吐 | 100 张 2000x2000 图片 <= 60s |
| 预览响应 | 调节参数后预览更新 <= 1s (Debounce 300ms + 渲染 <= 700ms) |
| 内存占用 | 处理 100 张 20MB 图片峰值 <= 1GB |
| 启动时间 | 冷启动 <= 3s |

### 6.2 安全

- 所有图像处理在本地完成，零网络请求
- 导入图片仅读取不修改原文件
- 输出路径由用户明确指定，不会覆盖用户文件
- 支持沙箱文件对话框 (Tauri 安全策略)

### 6.3 可用性

- 支持导入文件夹包含子文件夹(递归/不递归选项)
- 大图片自动缩放到适合预览的大小
- 处理进度通过系统通知提示
- 错误消息可理解且提供操作建议

### 6.4 兼容性

| 平台 | 最低版本 |
|---|---|
| Windows | Windows 10 1809+ (x64) |
| macOS | macOS 11 Big Sur+ (Intel & Apple Silicon) |
| Linux | 支持 AppImage / deb / rpm |

---

## 7. 里程碑规划

| 阶段 | 周期 | 交付物 |
|---|---|---|
| M1 - 原型 | 第 1-2 周 | Tauri 脚手架 + Rust 单图文本水印 + 基础 UI 框架 + 拖拽导入 |
| M2 - MVP | 第 3-4 周 | 三类水印完整 + 批量处理引擎 + 预览网格 + 单张/ZIP 导出 |
| M3 - 增强 | 第 5-6 周 | 水印叠加、预设管理、多主题、多语言、性能优化 |
| M4 - 扩展 | 第 7-8 周 | 批量修改水印、去水印(实验性)、CLI 模式、稳定性测试 |

---

## 8. 竞品对比

| 特性 | WatermarkForge | 市面在线工具 | PhotoShop 动作 | 脚本方案 |
|---|---|---|---|---|
| 本地化 | 完全离线 | 需上传 | 本地 | 本地 |
| 批量处理 | 原生并行 | 依赖网络 | 需配置 | 需写脚本 |
| 水印类型 | 文本/图片/图案 | 通常仅文本+图片 | 全功能 | 取决于脚本 |
| 实时预览 | 网格对比 | 单张预览 | 有 | 无 |
| 使用门槛 | 低 (GUI) | 低 | 中-高 | 高 |
| 成本 | 免费 | 免费/付费订阅 | 付费 | 免费 |
| 扩展性 | 插件架构预留 | 封闭 | 动作扩展 | 灵活 |

---

## 9. 技术风险与应对

| 风险 | 影响 | 应对方案 |
|---|---|---|
| Rust 图像库对中文渲染支持不足 | 中文水印无法正常渲染 | 使用 imageproc + ab_glyph 加载系统中文 TTF 字体 |
| 大图批量处理内存不足 | OOM 崩溃 | 分批处理 + 流式读写 + 内存池控制 |
| Tauri v2 API 变动 | 构建失败 | 锁定 Tauri 版本，跟踪 changelog |
| 混合模式实现复杂 | 效果与 PhotoShop 不一致 | 优先实现 normal/multiply/screen，参照 SVG 合成规范 |
| 去水印功能质量不达预期 | 用户失望 | 初期标记为实验性功能(Beta)，提供显式免责说明 |

---

## 10. 附录

### A. 目录结构规划

```
watermark-forge/
  src/                          # 前端 React 代码
    components/                 # UI 组件
      ImportPanel/
      PreviewGrid/
      WatermarkPanel/
        TextWatermark.tsx
        ImageWatermark.tsx
        PatternWatermark.tsx
      ExportDialog/
      StatusBar/
    hooks/                      # 自定义 hooks
    stores/                     # 状态管理
    types/                      # TypeScript 类型
    i18n/                       # 国际化
    App.tsx
  src-tauri/                    # Rust 后端
    src/
      main.rs                   # 入口 + Tauri 命令注册
      processor/                # 水印处理模块
        mod.rs
        text.rs
        image.rs
        pattern.rs
        pipeline.rs
      export/                   # 导出模块
      io/                       # 文件 I/O
      types.rs                  # 共享数据类型
    Cargo.toml
    tauri.conf.json
  package.json
  vite.config.ts
  README.md
```

### B. 扩展设计: 水印处理器 trait (Rust)

```rust
/// 所有水印处理器必须实现的接口
#[async_trait]
pub trait WatermarkProcessor: Send + Sync {
    fn id(&self) -> &str;
    fn display_name(&self) -> &str;

    async fn process(
        &self,
        image: &mut DynamicImage,
        params: &WatermarkParams,
        ctx: &ProcessingContext,
    ) -> Result<ProcessingResult, ProcessingError>;

    async fn preview(
        &self,
        image: &DynamicImage,
        params: &WatermarkParams,
    ) -> Result<Vec<u8>, ProcessingError>;
}

pub struct ProcessorRegistry {
    processors: HashMap<String, Box<dyn WatermarkProcessor>>,
}

impl ProcessorRegistry {
    pub fn register(&mut self, processor: Box<dyn WatermarkProcessor>) {
        self.processors.insert(processor.id().to_string(), processor);
    }
}
```

---

> **本文档为初期草案，后续将根据开发实践和用户反馈持续迭代。**