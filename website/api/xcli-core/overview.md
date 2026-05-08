---
title: xcli-core API 概览
---

# @dyyz1993/xcli-core API 概览

`@dyyz1993/xcli-core` 是领域无关的插件化 CLI 开发框架。

## 核心类

| 类 | 用途 |
|---|------|
| `Core` | CLI 入口，命令路由，参数解析 |
| `PluginLoader` | 插件加载/卸载/热重载 |
| `SessionManager` | 命名会话管理 |
| `DaemonManager` | 后台进程管理 |
| `WorkerManager` | Worker 进程池 |
| `WSServer` / `WSClient` | WebSocket 通信 |
| `OutputFormatter` | 输出格式化 |
| `HelpGenerator` | 帮助文本生成 |
| `ScaffoldEngine` | 项目模板生成 |
| `ScopeRegistry` | 命令层级管理 |

## 核心接口

| 接口 | 用途 |
|------|------|
| `XCLIAPI` | 插件开发者面对的核心接口 |
| `SiteInstance` | 插件命名空间容器 |
| `CommandContext` | 命令执行上下文 |
| `WorkerEntryPoint` | Worker 生命周期接口 |
| `CoreConfig` | CLI 配置 |
| `ScopeDefinition` | 层级定义 |

## 工具函数

```typescript
import { ok, fail, withMeta } from '@dyyz1993/xcli-core';
import { startDaemon, stopDaemon, isDaemonRunning, getDaemonStatus } from '@dyyz1993/xcli-core';
import { loadConfig, saveConfig, getConfigValue } from '@dyyz1993/xcli-core';
```

## 下一步

- [Core 类](/api/xcli-core/core) — 主入口 API
- [PluginLoader](/api/xcli-core/plugin-loader) — 插件管理
- [SessionManager](/api/xcli-core/session-manager) — 会话管理
- [Daemon](/api/xcli-core/daemon) — 后台进程
- [WebSocket](/api/xcli-core/websocket) — 实时通信
- [ScaffoldEngine](/api/xcli-core/scaffold) — 脚手架
