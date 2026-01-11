# Truth Lens 交互方案规范 (V5.0 - 布局修正版)

## 1. 核心视觉规范 (Visual Tokens)
*   **底色**: 纯白色 (#FFFFFF)，不透明。
*   **边框**: 1px Solid (#E2E8F0)。
*   **阴影**: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`。
*   **圆角**: 12px (Standard XL)。

## 2. 状态互斥逻辑 (State Management)
*   **IDLE**: 隐藏所有 UI。
*   **BUBBLE / ACTION_BAR / LOADING**: 渲染 Morphing 变形容器。
*   **PANEL**: **完全卸载** Morphing 容器，仅渲染 Analysis Panel。
    *   *目的*: 消除状态转换时产生的空白占位（幽灵横条）。

## 3. 分析面板布局 (Analysis Panel Layout)
*   **尺寸**: 固定宽度 420px，最大高度 480px。
*   **头部 (Header)**: 
    *   高度 48px，背景色 #F8FAFC。
    *   内边距: 0 16px。
    *   包含“Truth Lens 分析结论”与关闭按钮。
*   **内容区 (Content)**: 
    *   内边距: 20px。
    *   文字: 14px，行高 1.8，Slate-700 颜色。
    *   总结行: 16px Bold，Slate-900，下方留白 12px。

## 4. 逻辑细节
*   **锚点定位**: 面板顶部边缘与选中文本最后一行的底部对齐。
*   **防重现**: 关闭时必须 `removeAllRanges()`。
