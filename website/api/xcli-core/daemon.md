---
title: Daemon
---

# Daemon

常驻后台进程，管理 Worker 池。

## DaemonManager API

```typescript
class DaemonManager {
  start(config: DaemonConfig): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getStatus(): DaemonStatus;
}
```

## DaemonConfig

```typescript
interface DaemonConfig {
  configDir: string;
  workerEntryPath: string;
  maxWorkers?: number;       // 默认 10
  heartbeatInterval?: number; // 默认 10000ms
  requestTimeout?: number;   // 默认 30000ms
  basePort?: number;         // 默认 8054
}
```

## 工具函数

```typescript
import { startDaemon, stopDaemon, isDaemonRunning, getDaemonStatus } from '@dyyz1993/xcli-core';

await startDaemon({ port: 9222, workerCount: 3 });
const running = await isDaemonRunning({ configDir: '/path' });
const status = await getDaemonStatus({ configDir: '/path' });
await stopDaemon();
```

## 进程模型

```
┌──────────────────────────────────────────┐
│            Daemon (主进程)                 │
│  ┌──────────┐  ┌──────────────────────┐  │
│  │ HTTP RPC │  │   WebSocket Server   │  │
│  │ :8054    │  │   (事件推送)          │  │
│  └─────┬────┘  └──────────┬───────────┘  │
│  ┌─────┴──────────────────┴───────────┐  │
│  │         WorkerManager              │  │
│  │  ┌─────────┐ ┌─────────┐          │  │
│  │  │Worker 1 │ │Worker 2 │  ...     │  │
│  │  └─────────┘ └─────────┘          │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

## WorkerEntryPoint

Worker 必须实现的接口：

```typescript
interface WorkerEntryPoint {
  init(ctx: WorkerContext): Promise<void>;
  execute(method: string, params: Record<string, unknown>): Promise<unknown>;
  destroy(): Promise<void>;
}
```

## WorkerContext

```typescript
interface WorkerContext {
  sessionId: string;
  sessionName: string;
  config: Record<string, unknown>;
  ipc: {
    send(type: string, payload: unknown): void;
    onMessage(handler: (msg: IPCMessage) => void): void;
  };
}
```
