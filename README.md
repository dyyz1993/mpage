# @dyyz1993/xpage

浏览器自动化引擎 — 基于 Playwright 的录制、回放、页面结构提取。

## 安装

```bash
npm install @dyyz1993/xpage
```

要求 Node.js >= 18.0.0。

## 核心能力

### 1. 页面命令（Page Commands）

统一的命令接口，所有操作通过 `(page, args) => Promise<result>` 调用：

| 命令 | 说明 | 参数 |
|------|------|------|
| `goto` | 导航到 URL | `url`, `waitUntil?`, `timeout?` |
| `goBack` | 后退 | — |
| `goForward` | 前进 | — |
| `reload` | 刷新页面 | — |
| `title` | 获取页面标题 | — |
| `url` | 获取当前 URL | — |
| `click` | 点击元素 | `selector`, `timeout?`, `force?` |
| `fill` | 填充输入框 | `selector`, `value`, `timeout?` |
| `type` | 逐字输入 | `selector`, `text`, `delay?` |
| `press` | 按键 | `selector`, `key` |
| `hover` | 悬停元素 | `selector`, `timeout?` |
| `scroll` | 滚动页面 | `selector?`, `x?`, `y?` |
| `select` | 选择下拉项 | `selector`, `value` |
| `check` | 勾选复选框 | `selector` |
| `waitForSelector` | 等待元素出现 | `selector`, `timeout?` |
| `query` | CSS 选择器查询 | `selector` |
| `find` | 按文本查找元素 | `text`, `tag?`, `exact?` |
| `html` | 获取 HTML | `selector?`, `clean?` |
| `text` | 获取文本内容 | `selector?` |
| `textContent` | 获取元素文本 | `selector` |
| `inputValue` | 获取输入值 | `selector` |
| `getAttribute` | 获取属性值 | `selector`, `name` |
| `structure` | 页面结构提取 | `selector?`, `maxDepth?` |
| `screenshot` | 截图保存到文件 | `path?`, `fullPage?` |
| `screenshotBase64` | 截图返回 Base64 | `fullPage?`, `type?` |
| `a11y` | 无障碍树提取 | `selector?`, `format?` |
| `snapshot` | ARIA 快照（Playwright 原生） | `selector?` |
| `evaluate` | 执行 JS 表达式 | `expression` |
| `evaluateRaw` | 执行异步 JS 脚本 | `script` |
| `wait` | 等待指定毫秒 | `timeout` |

命令别名：`findByText` → `find`，`waitForTimeout` → `wait`

**使用示例：**

```typescript
import { executePageCommand } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

const browser = await chromium.launch();
const page = await browser.newPage();

await executePageCommand(page, 'goto', { url: 'https://example.com' });

const { title } = await executePageCommand(page, 'title', {});
const { elements } = await executePageCommand(page, 'query', { selector: 'a' });
const { snapshot } = await executePageCommand(page, 'snapshot', { selector: 'body' });

await browser.close();
```

### 2. 录制器（RecorderController）

在真实浏览器中录制用户操作，生成结构化 YAML 产物。

```typescript
import { RecorderController } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
const recorder = new RecorderController(page);

// 开始录制
await recorder.start({ url: 'https://example.com', name: 'my-recording' });

// ... 用户手动操作浏览器 ...

// 停止录制，保存为 YAML
const { path, session } = await recorder.stop('./recordings/my-recording.yaml');
console.log(`录制了 ${session.events.length} 个事件，保存到 ${path}`);

// 查看录制状态
const status = recorder.getStatus();
// { isRecording: true, eventCount: 42, duration: 15000 }

await browser.close();
```

**支持的录制事件类型：**

鼠标（click / dblclick / contextmenu / mousemove / hover / scroll）、
键盘（keydown / keyup / input / change）、
焦点（focus / blur / select）、
导航（navigation / page_load / hash_change）、
DOM 变化（class_change / element_show / element_hide / dom_node_added / dom_node_removed）、
触摸（touchstart / touchend / swipe）、
文件上传（file_upload）、
新标签页（tab_open）等。

**录制产物结构（YAML）：**

```yaml
id: rec_1703001234567
name: my-recording
startUrl: https://example.com
startTime: 1703001234567
duration: 15000
viewport:
  width: 1280
  height: 720
events:
  - id: evt_001
    type: page_load
    timestamp: 0
    data:
      url: https://example.com
    pageState:
      url: https://example.com
      title: Example Domain
      readyState: complete
  - id: evt_002
    type: click
    timestamp: 2300
    selector: a[href="/more"]
    data:
      x: 450
      y: 320
```

### 3. 回放器（PlaybackEngine）

加载录制产物并自动回放，支持慢放、跳过延迟、断言验证。

```typescript
import { PlaybackEngine } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

const browser = await chromium.launch();
const page = await browser.newPage();

// 从文件加载
const player = await PlaybackEngine.fromFile(page, './recordings/my-recording.yaml');

// 回放
const result = await player.play({
  slowMo: 1,          // 延迟倍率（1 = 原速，2 = 两倍慢）
  noDelay: false,      // true = 忽略所有时间间隔
  stopOnError: true,   // true = 遇错停止
  onProgress: ({ current, total, event }) => {
    console.log(`[${current}/${total}] ${event.type}`);
  },
});

console.log(result);
// {
//   success: true,
//   duration: 15200,
//   eventsPlayed: 15,
//   totalEvents: 15,
//   errors: []
// }

await browser.close();
```

**回放内置能力：**

- 自动聚合连续 `mousemove` 为轨迹，模拟真实鼠标移动
- CDP 级键盘事件，确保 IME 输入兼容
- 支持 `waitBefore`（前置等待）和 `assertAfter`（后置断言）
- 等待条件：`element_visible` / `element_hidden` / `text_present` / `url_match` / `network_idle` / `timeout` 等
- 断言条件：`element_exists` / `element_visible` / `text_equals` / `text_contains` / `url_equals` 等

### 4. 结构提取（Structure Extractor）

提取页面语义布局树，自动识别导航区、搜索框、表单、列表、按钮组等。

```typescript
import { executePageCommand } from '@dyyz1993/xpage';

const { structure, yaml } = await executePageCommand(page, 'structure', {
  selector: 'body',
});
```

输出示例（YAML 格式）：

```yaml
- header [header]
  - nav [nav]
    - a {links: 3}
- main [main]
  - form {hasForm: true, inputs: 2, buttons: 1}
  - ul.search-results {links: 10}
- footer [footer]
```

### 5. 无障碍树（A11y Extractor）

提取页面的 accessibility tree，支持 YAML 和 JSON 两种格式。

```typescript
// 自定义 a11y 树（含 role / name / selector 层级）
const { snapshot } = await executePageCommand(page, 'a11y', {
  selector: 'main',
  format: 'yaml',
});

// Playwright 原生 ARIA snapshot（AI 友好）
const { snapshot } = await executePageCommand(page, 'snapshot', {
  selector: 'body',
});
```

## API 参考

### 命令执行

```typescript
// 服务端：直接在 Page 上执行命令
import { executePageCommand, getCommandHandler, hasCommand } from '@dyyz1993/xpage';

const handler = getCommandHandler('click');   // => CommandHandler | null
const exists = hasCommand('goto');             // => true
const result = await executePageCommand(page, 'click', { selector: '#btn' });
```

### 命令定义与解析

```typescript
import { commands, getCommandNames, parseArgsToRecord, parseCommandChain } from '@dyyz1993/xpage';

// 所有命令的 Zod schema 定义
commands['goto'].schema;         // z.object({ url: z.string(), ... })
commands['goto'].description;    // 'Navigate to URL'

// 获取所有命令名
getCommandNames();  // ['goto', 'click', 'fill', ...]

// 解析命令行参数
const args = parseArgsToRecord(['url=https://example.com', 'timeout=5000'], schema);

// 解析命令链（支持 && 和 || ）
const parsed = parseCommandChain('goto url=https://example.com && click selector=#btn');
```

### 客户端 IPC

```typescript
import { executeCommand, executePipeline, executeCommandChain, sendRequest } from '@dyyz1993/xpage';

// 单命令执行
const result = await executeCommand(sendRequest, 'goto', { url: 'https://example.com' });

// 管道执行（多命令顺序执行，前一个的输出作为上下文）
const result = await executePipeline(sendRequest, ['goto url=https://example.com', 'click selector=#btn']);

// 命令链（支持 && 和 || 语义）
const result = await executeCommandChain(sendRequest, 'goto url=x.com && click selector=#btn');
```

### Session 管理

```typescript
import {
  ensureStorage, getSessionPath, loadSessionInfo,
  saveSessionInfo, deleteSessionInfo, listSessions,
} from '@dyyz1993/xpage';
```

## 作为依赖使用

mpage 设计为底层库，供上层工具（如 xcli）集成：

```typescript
// 上层工具集成示例
import {
  executePageCommand,
  RecorderController,
  PlaybackEngine,
  commands,
  parseCommandChain,
} from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

class MyAutomationTool {
  private page: Page;

  async init() {
    const browser = await chromium.launch();
    this.page = await browser.newPage();
  }

  async runCommand(name: string, args: Record<string, unknown>) {
    return executePageCommand(this.page, name, args);
  }

  async startRecording(url: string) {
    const recorder = new RecorderController(this.page);
    await recorder.start({ url });
    return recorder;
  }

  async replay(filePath: string) {
    const player = await PlaybackEngine.fromFile(this.page, filePath);
    return player.play({ slowMo: 1 });
  }
}
```

## 开发

```bash
npm run typecheck   # 类型检查
npm run lint        # ESLint 检查
npm run build       # 构建（tsup）
npm test            # 运行测试
npm run validate    # typecheck + lint + build + test
```

## License

MIT
