---
title: 安装与创建
description: 安装 xcli 框架并创建你的第一个 CLI 项目，5 分钟从零开始。
---

# 安装与创建

## 前置条件

- Node.js >= 20.0.0
- npm / pnpm / yarn
- （可选）Git，用于版本管理

## 方式一：脚手架创建（推荐）

### 一条命令生成项目

```bash
npx create-xcli my-cli
```

交互式引导选择模板并生成完整的项目骨架，包含 TypeScript 配置、构建脚本、CLI 入口。

### 选择模板

脚手架提供 5 个内置模板，覆盖最常见的使用场景：

| 模板 | 场景 | 生成的项目 |
|------|------|-----------|
| **base** | 通用 CLI 起步 | 基础 CLI 入口 + 配置文件 |
| **browser** | 浏览器自动化 | CLI + Playwright 集成 |
| **database** | 数据库管理 | CLI + SQLite/MySQL/PG 命令 |
| **api** | API 调试 | CLI + HTTP 请求命令 |
| **minimal-plugin** | 开发插件 | 最小插件骨架 |

（详细的模板对比和文件结构见 [脚手架详解](/guide/scaffolding)）

### 模板选择建议

不知道选哪个？按这个来：

- **想做浏览器自动化**（爬虫、测试、RPA）→ `browser`
- **想做数据库工具**（查询、迁移、管理）→ `database`
- **想做 API 工具**（类似 httpie）→ `api`
- **想写个通用 CLI**（不确定领域）→ `base`
- **想给已有 CLI 写插件** → `minimal-plugin`

> 💡 **插件也是项目**：`minimal-plugin` 模板生成的就是一个独立插件项目。在 xcli 中，插件 = 带有 `createSite()` + `command()` 的 TypeScript 文件。无论你是创建完整 CLI 还是开发插件，都是同一个框架。

### 创建后做什么

```bash
npx create-xcli my-cli
cd my-cli
npm install
npm run build

# 运行你的 CLI
node dist/cli.js --help
```

然后：

- [编写第一个命令](/tutorial/first-command) — 让 CLI 做点有用的事
- [编写插件](/tutorial/write-plugin) — 深入插件开发
- [部署到 npm](/tutorial/deploy-guide) — 发布给其他用户

## 方式二：手动安装（已有项目集成）

如果你已有项目，想集成 xcli 能力：

### 安装浏览器引擎

```bash
npm install @dyyz1993/xpage
```

xpage 是浏览器自动化引擎，基于 Playwright。

### 安装 CLI 框架

```bash
npm install @dyyz1993/xcli-core zod
```

xcli-core 是通用 CLI 框架，zod 用于参数校验。

### 最小入口

```typescript
#!/usr/bin/env node
import { Core } from '@dyyz1993/xcli-core';

const app = new Core({
  name: 'my-cli',
  version: '0.1.0',
  description: '我的 CLI 工具',
  configDirName: '.my-cli',
  envPrefix: 'MY_CLI',
  pluginDirs: ['./plugins'],
});

await app.run(process.argv.slice(2));
```

## 下一步

- [核心概念](/guide/core-concepts) — 理解 xcli 的架构
- [脚手架详解](/guide/scaffolding) — 5 个模板的完整对比
- [创建你的 CLI](/tutorial/create-your-cli) — 手把手教程
