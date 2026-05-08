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
| `OutputFormatter` | 输出格式化（JSON/表格/YAML 等多格式输出） |
| `HelpGenerator` | 帮助文本生成（自动从命令元数据生成 usage 文档） |
| `ScaffoldEngine` | 项目模板生成 |
| `ScopeRegistry` | 命令层级管理（定义 project → browser → page → element 层级） |
| `PluginStorage` | 插件持久化存储（每个插件独立的 key-value 存储） |
| `PluginInstallerRegistry` | 插件安装器注册表 |

## 核心接口

| 接口 | 用途 |
|------|------|
| `XCLIAPI` | 插件开发者面对的核心接口 |
| `SiteInstance` | 插件命名空间容器 |
| `CommandContext` | 命令执行上下文（含 page, storage, output） |
| `WorkerEntryPoint` | Worker 生命周期接口 |
| `CoreConfig` | CLI 配置 |
| `ScopeDefinition` | 层级定义 |
| `CommandResult` | 命令执行结果（success/data/tips/meta） |
| `StorageContext` | 插件存储上下文 |
| `OutputContext` | 输出控制上下文 |
| `RcConfig` | 用户配置文件结构 |

## 工具函数

### 命令结果

```typescript
import { ok, fail, withMeta, wrapResult, isCommandResult } from '@dyyz1993/xcli-core';
```

### Daemon 管理

```typescript
import { startDaemon, stopDaemon, isDaemonRunning, getDaemonStatus, killAllDaemon } from '@dyyz1993/xcli-core';
```

### 配置管理

```typescript
import {
  loadConfig, saveConfig, getConfigValue, setConfigValue,
  getEffectiveValue, getViewerHost, getChromiumPath, getDaemonPort,
  getViewerUrl, getAllConfigKeys,
} from '@dyyz1993/xcli-core';
```

### 参数解析

```typescript
import { parseArgs, mergeArgsWithDefaults, resolveShortOptions, coerceCliArgs } from '@dyyz1993/xcli-core';
```

### Agent Guard

```typescript
import {
  checkGuard, loadGuardConfig, clearGuardCache,
  addGuardRule, removeGuardRule, listGuardRules, setGuardIdentityKey,
} from '@dyyz1993/xcli-core';
```

### 验证器

```typescript
import { validateExecution, formatValidationReport } from '@dyyz1993/xcli-core';
```

### 输出

```typescript
import { generateTips, outputFormatter, helpGenerator } from '@dyyz1993/xcli-core';
```

## 下一步

- [Core 类](/api/xcli-core/core) — 主入口 API
- [PluginLoader](/api/xcli-core/plugin-loader) — 插件管理
- [SessionManager](/api/xcli-core/session-manager) — 会话管理
- [Daemon](/api/xcli-core/daemon) — 后台进程
- [WebSocket](/api/xcli-core/websocket) — 实时通信
- [ScaffoldEngine](/api/xcli-core/scaffold) — 脚手架
