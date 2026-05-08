---
title: 核心概念
---

# 核心概念

## 三个包的关系

```
┌─────────────────────────────────────────────┐
│                  你的 CLI 应用                │
├─────────────┬───────────────┬───────────────┤
│  xcli-core  │  xcli-browser │    xpage      │
│  (通用框架)   │  (桥接层)      │  (浏览器引擎)  │
│             │               │               │
│ - 插件系统   │ - Worker 适配  │ - CDP 连接    │
│ - 命令路由   │ - 浏览器命令   │ - 页面操作    │
│ - Daemon    │ - 录制/回放    │ - 选择器引擎  │
│ - 会话管理   │               │               │
└─────────────┴───────────────┴───────────────┘
```

## mpage = 浏览器引擎（可替换）

`@dyyz1993/xpage` 是底层浏览器自动化引擎，提供：

- **统一命令接口** — 所有操作通过 `(page, args) => Promise<result>`
- **录制与回放** — 录制用户交互并自动重放
- **页面结构提取** — 获取语义化布局树
- **无障碍树** — 提取 ARIA 无障碍信息

它是一个纯库，可以直接在 Node.js 中使用，不绑定任何 CLI 框架。

## xcli-core = 通用框架（不关心浏览器）

`@dyyz1993/xcli-core` 是领域无关的 CLI 框架，提供：

- **插件系统** — jiti 运行时加载 TypeScript 插件
- **命令注册** — Zod 驱动的参数校验
- **Daemon 进程** — 常驻后台进程 + Worker 池
- **会话管理** — 命名会话 + 持久化
- **脚手架引擎** — 模板化项目生成

xcli-core 可以完全脱离浏览器独立使用。database 和 api 模板就是最好的证明。

## xcli-browser = 桥接层（粘合两者）

xcli-browser 将 xpage 的浏览器能力接入 xcli 框架，提供：

- **Worker 适配** — 将浏览器操作封装为 WorkerEntryPoint
- **浏览器命令** — 通过插件注册 35+ 页面命令
- **录制/回放** — 将 xpage 的录制能力暴露为 CLI 命令

## 对不同人的价值

### 浏览器自动化开发者

直接用 `@dyyz1993/xpage`，不需要了解 CLI 框架：

```typescript
import { executePageCommand } from '@dyyz1993/xpage';
```

### CLI 工具开发者

用 `@dyyz1993/xcli-core` 构建任何领域的 CLI 工具：

```typescript
import { Core } from '@dyyz1993/xcli-core';
```

### 插件开发者

在已有 xcli 项目中编写插件，5 分钟上手：

```typescript
export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({ name: 'my-plugin', url: '' });
  site.command('hello', { handler: async (params) => ({ ok: true }) });
}
```
