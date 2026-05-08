---
title: xcli-core 快速开始
---

# xcli-core 快速开始

## 什么是 xcli-core？

`@dyyz1993/xcli-core` 是一个**领域无关的插件化 CLI 开发框架**，让你可以用 TypeScript 快速构建功能完整的命令行工具。

**核心价值：**

- 零配置参数校验（Zod schema 驱动）
- 插件热加载（jiti 运行时编译 TypeScript）
- 进程隔离（Daemon + Worker 架构）
- 领域无关（可用于浏览器、数据库、API 等任何场景）

## 最简 CLI

```typescript
#!/usr/bin/env node
import { Core } from '@dyyz1993/xcli-core';

const app = new Core({
  name: 'my-cli',
  version: '0.1.0',
  description: '我的第一个 xcli 工具',
  configDirName: '.my-cli',
  envPrefix: 'MY_CLI',
  pluginDirs: ['./plugins'],
});

await app.run(process.argv.slice(2));
```

## 技术栈

| 类别 | 技术 | 用途 |
|------|------|------|
| 语言 | TypeScript 5+ | 类型安全 |
| 参数校验 | Zod | schema 驱动的参数验证 |
| 构建 | tsup | ESM 输出 |
| TS 运行时 | jiti | 插件热加载 |
| 进程管理 | child_process | Daemon + Worker |
| 通信 | HTTP RPC + WebSocket | Daemon ↔ 客户端 |

## 核心模块一览

| 模块 | 用途 |
|------|------|
| Core | CLI 入口，命令路由，参数解析 |
| PluginLoader | 插件加载/卸载/热重载 |
| SessionManager | 命名会话管理 |
| DaemonManager | 后台进程 + Worker 池 |
| ScaffoldEngine | 项目模板生成 |
| ScopeRegistry | 命令层级体系 |
| OutputFormatter | 输出格式化（text/JSON/YAML） |
| HelpGenerator | 帮助文本生成 |

## 适用场景

- 浏览器自动化 CLI（爬虫、测试、数据采集）
- 数据库管理工具
- API 调试工具（类似 httpie）
- 任何需要插件扩展的 CLI 工具

## 下一步

- [脚手架创建](/guide/scaffolding) — 用模板快速创建项目
- [创建你的 CLI](/tutorial/create-your-cli) — 完整教程
- [API 参考](/api/xcli-core/overview) — 完整 API 文档
