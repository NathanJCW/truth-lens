# Truth Lens - 开发文档

## 🎯 核心实现逻辑

### 1. 数据流设计

```
用户划词（前端）
    ↓
Content Script 监听 mouseup 事件
    ↓
防抖 300ms（防止频繁触发）
    ↓
验证文本长度 >= 10 字符
    ↓
显示悬浮窗 + "立即验证" 按钮
    ↓
用户点击按钮
    ↓
POST /api/analyze { text, context }
    ↓
后端并行搜索（Tavily）
  - 支持证据: "${text} 证实 支持 官方"
  - 反对证据: "${text} 辟谣 质疑 反对"
    ↓
构建 Prompt + 调用 DeepSeek V3
    ↓
流式返回分析结果（Vercel AI SDK）
    ↓
前端实时展示（逐字输出）
```

---

## 🔧 关键技术细节

### 1. DeepSeek API 配置

```typescript
// apps/web/lib/ai-config.ts
import { createOpenAI } from '@ai-sdk/openai';

export const deepseek = createOpenAI({
  name: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',  // 关键：DeepSeek 端点
});
```

**注意**:
- DeepSeek 兼容 OpenAI 格式，使用 `@ai-sdk/openai` 即可
- `baseURL` 必须指向 `https://api.deepseek.com`
- 模型名称为 `deepseek-chat` (V3)

---

### 2. Prompt 工程

```typescript
// apps/web/lib/prompts.ts
export const ANALYSIS_PROMPT = `你是一个专业的事实核查助手...

## 输出要求
请以 JSON 格式输出分析结果（请务必返回有效的 JSON，不要添加额外的 markdown 标记）：

{
  "conclusion": "真实|存疑|误导|虚假",
  "confidence": 85,
  "reasoning": "详细的推理过程（300字以内）",
  "sources": [...]
}
`;
```

**关键点**:
1. **明确输出格式**: 要求返回纯 JSON，避免 DeepSeek 添加 markdown 代码块
2. **中文优先**: 所有 Prompt 使用中文，符合目标用户语境
3. **温度参数**: 设置 `temperature: 0.3`，降低随机性

---

### 3. 流式响应处理

#### 后端实现
```typescript
// apps/web/app/api/analyze/route.ts
const result = await streamText({
  model: getAnalysisModel(),
  prompt,
  temperature: 0.3,
  maxTokens: 2000,
});

return result.toTextStreamResponse();  // 返回纯文本流
```

#### 前端接收
```typescript
// apps/extension/content.tsx
const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  setResult(prev => prev + chunk);  // 实时追加
}
```

---

### 4. 防抖优化

```typescript
let debounceTimer: NodeJS.Timeout

const handleMouseUp = () => {
  clearTimeout(debounceTimer)
  
  debounceTimer = setTimeout(() => {
    // 300ms 后才触发
    const text = window.getSelection()?.toString().trim()
    if (text && text.length >= 10) {
      setIsVisible(true)
    }
  }, 300)
}
```

**目的**: 防止用户快速多次划词导致频繁弹窗。

---

## 🎨 UI 设计规范

### 颜色系统
```css
/* 主色调 */
--primary: #4F46E5 (indigo-600)
--primary-dark: #4338CA (indigo-700)

/* 渐变背景 */
background: linear-gradient(to right, #4F46E5, #7C3AED);

/* 玻璃拟态 */
background: rgba(255, 255, 255, 0.8);
backdrop-filter: blur(12px);
```

### 动画效果
```typescript
<motion.div
  initial={{ opacity: 0, scale: 0.95, y: -10 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95, y: -10 }}
>
```

**特点**:
- 流畅的淡入淡出（opacity）
- 微妙的缩放效果（scale）
- 轻微的位移（y 轴）

---

## 🧪 测试建议

### 单元测试（TODO）
```typescript
// 测试 Tavily 搜索
describe('searchTavily', () => {
  it('should return results for valid query', async () => {
    const results = await searchTavily('test query');
    expect(results).toBeInstanceOf(Array);
  });
});
```

### E2E 测试场景
1. **正常流程**: 划词 → 点击验证 → 查看结果
2. **文本过短**: 划词 < 10 字符 → 不弹窗
3. **API 失败**: 断网状态 → 显示友好错误提示
4. **快速划词**: 300ms 内多次划词 → 只触发一次

---

## 🚨 常见坑点

### 1. Vercel AI SDK 版本兼容性
- **问题**: 不同版本的流式响应格式不同
- **解决**: 锁定 `ai@latest` 版本，使用 `toTextStreamResponse()`

### 2. DeepSeek JSON 输出不稳定
- **问题**: 有时会返回带 markdown 的 JSON（如 \`\`\`json ... \`\`\`）
- **解决**: 在 Prompt 中明确要求"不要添加 markdown 标记"

### 3. CORS 问题（生产环境）
- **问题**: 浏览器插件跨域访问后端 API 被阻止
- **解决**: 
  ```typescript
  // next.config.mjs
  async headers() {
    return [{
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
      ],
    }];
  }
  ```

### 4. Chrome Extension Manifest V3 限制
- **问题**: 无法直接在 Content Script 中使用 `import`
- **解决**: Plasmo 自动处理，但需注意 `host_permissions` 配置

---

## 📊 性能优化建议

### 1. 搜索结果缓存
```typescript
const cache = new Map<string, TavilyResult[]>();

export async function searchTavily(query: string) {
  const cacheKey = query.toLowerCase();
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }
  
  const results = await fetch(...);
  cache.set(cacheKey, results);
  return results;
}
```

### 2. 请求防抖（已实现）
- 300ms 延迟触发
- 避免频繁 API 调用

### 3. 流式传输优化
- 使用 `toTextStreamResponse()` 而非 `toAIStreamResponse()`
- 减少前端解析复杂度

---

## 🔐 安全最佳实践

### 1. API Key 保护
```bash
# ❌ 错误做法
const API_KEY = "sk-xxxxx"  # 硬编码在代码中

# ✅ 正确做法
const API_KEY = process.env.DEEPSEEK_API_KEY  # 环境变量
```

### 2. 输入验证
```typescript
// 长度限制
if (text.length < 10 || text.length > 1000) {
  return new Response('文本长度异常', { status: 400 });
}

// 敏感词过滤（TODO）
if (containsSensitiveWords(text)) {
  return new Response('包含敏感内容', { status: 400 });
}
```

### 3. 请求频率限制（TODO）
```typescript
// 建议使用 upstash/ratelimit
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),  // 每分钟 10 次
});
```

---

## 📝 Git 提交规范

```bash
# 功能开发
feat: 添加历史记录功能

# Bug 修复
fix: 修复流式响应解析错误

# 文档更新
docs: 更新 README 安装说明

# 代码重构
refactor: 优化 Prompt 结构

# 性能优化
perf: 添加搜索结果缓存
```

---

## 🎓 学习资源

- [Vercel AI SDK 文档](https://sdk.vercel.ai/docs)
- [DeepSeek API 文档](https://platform.deepseek.com/api-docs/)
- [Plasmo 官方文档](https://docs.plasmo.com/)
- [Tavily API 文档](https://docs.tavily.com/)

---

## 💬 联系方式

有问题或建议？欢迎提交 Issue！
