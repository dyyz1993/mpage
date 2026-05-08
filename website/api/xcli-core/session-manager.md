---
title: SessionManager
---

# SessionManager

管理命名会话，每个会话有独立的元数据和存储。

## API

```typescript
class SessionManager {
  createSession(name: string, config: Record<string, unknown>): SessionMeta;
  getSession(name: string): SessionMeta | undefined;
  destroySession(name: string): SessionMeta | undefined;
  listSessions(): SessionMeta[];
  clearAll(): void;
}
```

## 使用示例

```typescript
import { SessionManager } from '@dyyz1993/xcli-core';

const sessionManager = new SessionManager();

// 创建会话
const session = sessionManager.createSession('my-session', {
  url: 'https://example.com',
  dbType: 'sqlite',
});

// 获取会话
const s = sessionManager.getSession('my-session');

// 列出所有会话
const all = sessionManager.listSessions();

// 销毁会话
sessionManager.destroySession('my-session');

// 清空所有
sessionManager.clearAll();
```

## SessionMeta

```typescript
interface SessionMeta {
  id: string;
  name: string;
  config: Record<string, unknown>;
}
```

## Session Archive

会话归档功能用于持久化和检索历史命令记录。

```typescript
import {
  saveArchive,
  loadArchive,
  listArchives,
  searchArchives,
  diffArchives,
  appendCommandToArchive,
  configureArchiveStore,
} from '@dyyz1993/xcli-core';
```

| 函数 | 用途 |
|------|------|
| `saveArchive(sessionName, entries)` | 保存会话归档 |
| `loadArchive(sessionName)` | 加载归档 |
| `listArchives()` | 列出所有归档 |
| `searchArchives(query)` | 搜索归档 |
| `diffArchives(name1, name2)` | 比较两个归档差异 |
| `appendCommandToArchive(sessionName, entry)` | 追加命令到归档 |
| `configureArchiveStore(config)` | 配置归档存储 |

### Archive 类型

```typescript
interface CommandArchiveEntry {
  command: string;
  args: Record<string, unknown>;
  timestamp: number;
  result?: unknown;
}

interface SessionArchive {
  sessionName: string;
  entries: CommandArchiveEntry[];
  outline?: OutlineEntry[];
  createdAt: string;
  updatedAt: string;
}

interface ArchiveStoreConfig {
  baseDir?: string;
  maxEntries?: number;
  compression?: boolean;
}

interface ToolCallRecord {
  tool: string;
  input: Record<string, unknown>;
  output?: unknown;
  timestamp: number;
}

interface OutlineEntry {
  level: number;
  title: string;
  commandIndex: number;
}
```
