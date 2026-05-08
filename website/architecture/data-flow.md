---
title: 数据流
---

# 数据流

## 命令执行流

```
User → CLI → Router → Executor → Browser Manager → Playwright → Browser
                                                                      │
User ← Formatted Output ← Router ← ExecutionResult ← Executor ←─────┘
```

## 录制流程

```
User → Recorder → Browser → Page → Events → Storage
                                        │
User → Recording File ← Recorder ←─────┘
```

## 回放流程

```
User → PlaybackEngine → File System (YAML) → Parse Events
                                                │
User → PlaybackResult ← PlaybackEngine ← Execute Events ← Browser
```

## Daemon 请求流程

```
Client → HTTP RPC (:8054) → Daemon → WorkerManager → Worker.execute()
                                                              │
Client ← JSON Response ← Daemon ← WorkerManager ←────────────┘
```

## WebSocket 事件推送

```
Worker → IPC → Daemon → WS Server → WS Client (实时通知)
```

## WorkerEntryPoint 生命周期

```
Daemon (主进程)                    Worker (子进程)
──────────────                    ────────────
fork() ─────────────────────────> 进程启动
await worker.init(ctx)  ────────> init(): 初始化资源
await worker.execute()  ────────> execute(): 执行业务（可多次）
await worker.destroy()  ────────> destroy(): 释放资源
```
