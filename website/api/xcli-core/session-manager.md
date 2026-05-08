---
title: SessionManager
---

# SessionManager

管理命名会话，每个会话有独立的元数据和存储。

## API

```typescript
class SessionManager {
  createSession(id: string, meta: SessionMeta): void;
  getSession(id: string): SessionMeta | undefined;
  removeSession(id: string): void;
  listSessions(): SessionMeta[];
  clearAllSessions(): void;
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

// 删除会话
sessionManager.removeSession('my-session');

// 清空所有
sessionManager.clearAllSessions();
```

## SessionMeta

```typescript
interface SessionMeta {
  sessionId: string;
  createdAt: string;
  url?: string;
  metadata?: Record<string, unknown>;
}
```
