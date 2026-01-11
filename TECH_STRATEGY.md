# Truth Lens 技术方案 (Technical Strategy) - V1.0

## 1. 架构概览 (Architecture)
- **核心框架**: React (Plasmo Content Script 模式)。
- **动效引擎**: `framer-motion` (负责所有形态转换和布局动画)。
- **样式方案**: Tailwind CSS + CSS Variables (注入 Shadow DOM)。
- **状态管理**: React `useState` + `useReducer` (管理复杂交互状态机)。

## 2. 状态机设计 (State Machine)
我们将交互划分为五个离散状态，确保逻辑清晰：
1. `IDLE`: 初始状态，无选中文本。
2. `BUBBLE`: 选中文本后，显示 36px 圆形 Logo。
3. `ACTION_BAR`: 鼠标移入 BUBBLE 后，平滑展开显示“分析/关闭”按钮。
4. `LOADING`: 点击分析后，Action Bar 进入加载态。
5. `PANEL`: 数据返回，展开分析面板。

## 3. 关键技术实现

### 3.1 形态转换 (Morphing Action Bar)
- **技术实现**: 利用 Framer Motion 的 `layout` 属性。
- **核心代码逻辑**:
  ```tsx
  <motion.div 
    layout 
    initial={{ borderRadius: "9999px" }}
    animate={{ width: isExpanded ? "180px" : "36px" }}
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
  >
    {isExpanded ? <FullMenu /> : <LogoOnly />}
  </motion.div>
  ```
- **优势**: 自动计算圆角和尺寸补间，性能优于直接修改 CSS 属性。

### 3.2 智能定位 (Smart Positioning)
- **算法**: 
  1. 获取 `window.getSelection().getRangeAt(0).getBoundingClientRect()`。
  2. 计算初始坐标 `(rect.left + rect.width/2, rect.top)`。
  3. **边界检测**: 检查 `(x + action_bar_width/2)` 是否超过 `window.innerWidth`，若超过则向左偏移；检查 `(y - action_bar_height)` 是否小于 0，若小于则显示在文本下方。

### 3.3 样式隔离 (Shadow DOM)
- **方案**: 继续沿用 Plasmo 的 `getStyle` 机制。
- **优化**: 在 `style.css` 中定义一组 `--tl-primary`, `--tl-glass-bg` 等变量，方便在行内样式中引用，保持设计一致性。

### 3.4 流式数据处理 (Streaming)
- **逻辑**: 封装 `useStreamingAnalysis` 自定义 hook，处理 `ReadableStream` 的读取与解码。
- **打字机效果**: 使用 Framer Motion 的 `AnimatePresence` 或简单的文字切片显示，确保视觉上的平滑。

## 4. 性能与安全性
- **防抖 (Debounce)**: 对 `mouseup` 事件进行 150ms 延迟，防止由于点击产生的误触发。
- **内存泄漏**: 在 `useEffect` 的清理函数中严格移除 `mousedown` 和 `mouseup` 监听。
- **Z-Index**: 强制使用 `2147483647` 顶层层级。

## 5. 待解决技术难点 (Open Questions)
- 在某些具有 `overflow: hidden` 或复杂 `iframe` 的网页中，定位可能需要从 `absolute` 切换到 `fixed` (相对于 viewport)。
