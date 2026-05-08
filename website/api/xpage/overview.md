---
title: xpage API 概览
---

# @dyyz1993/xpage API 概览

`@dyyz1993/xpage` 是基于 Playwright 的浏览器自动化引擎库。

## 核心导出

### 命令执行

```typescript
import {
  executePageCommand,
  getCommandHandler,
  hasCommand,
  executeCommandChain,
} from '@dyyz1993/xpage';
```

| 函数 | 用途 |
|------|------|
| `executePageCommand(page, name, args)` | 执行单个页面命令 |
| `getCommandHandler(name)` | 获取命令处理函数 |
| `hasCommand(name)` | 检查命令是否存在 |
| `executeCommandChain(page, input, options?)` | 执行命令链 |

### 命令定义与解析

```typescript
import {
  commands,
  getCommandNames,
  parseArgsToRecord,
  parseCommandChain,
} from '@dyyz1993/xpage';
```

### 录制与回放

```typescript
import { RecorderController, PlaybackEngine } from '@dyyz1993/xpage';
```

### 会话管理

```typescript
import {
  ensureStorage,
  getSessionPath,
  loadSessionInfo,
  saveSessionInfo,
  deleteSessionInfo,
  listSessions,
} from '@dyyz1993/xpage';
```

## 页面命令一览

### 导航

`goto` `goBack` `goForward` `reload` `title` `url`

### 交互

`click` `fill` `type` `press` `hover` `scroll` `select` `check` `dblclick`

### 查询

`query` `find` `html` `text` `textContent` `inputValue` `getAttribute`

### 等待

`waitForSelector` `wait`

### 截图

`screenshot` `screenshotBase64`

### 结构与无障碍

`structure` `a11y` `snapshot`

### 执行

`evaluate` `evaluateRaw`

## 类型

```typescript
interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
}

interface ChainExecutionResult {
  success: boolean;
  steps: StepResult[];
  totalDuration: number;
}

interface RecordedEvent {
  type: string;
  selector: string;
  tagName: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface RecordingSession {
  id: string;
  name: string;
  startUrl: string;
  startTime: string;
  duration: number;
  events: RecordedEvent[];
}
```

## 下一步

- [命令执行](/api/xpage/execute) — 详细的命令执行 API
- [录制器](/api/xpage/recorder) — RecorderController API
- [回放引擎](/api/xpage/player) — PlaybackEngine API
- [全部命令](/api/xpage/commands) — 完整命令参考
