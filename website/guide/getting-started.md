---
title: 快速开始
---

# 快速开始

## 什么是 xcli？

xcli 是一个**插件化 CLI 框架**和**浏览器自动化引擎**，由三个包组成：

- **`@dyyz1993/xpage`** — 浏览器自动化引擎（底层库）
- **`@dyyz1993/xcli-core`** — 通用 CLI 框架（不绑定任何领域）
- **xcli-browser** — 桥接层（粘合两者）

## 5 分钟快速开始

### 1. 浏览器自动化（使用 xpage）

```typescript
import { executePageCommand } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

const browser = await chromium.launch();
const page = await browser.newPage();

await executePageCommand(page, 'goto', { url: 'https://example.com' });
const { title } = await executePageCommand(page, 'title', {});
console.log(title);

await browser.close();
```

### 2. 创建 CLI 工具（使用 xcli-core）

```typescript
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

## 下一步推荐

- [安装指南](/guide/installation) — 详细的安装步骤
- [核心概念](/guide/core-concepts) — 三个包的关系
- [创建你的 CLI](/tutorial/create-your-cli) — 5 分钟创建完整 CLI
- [API 参考](/api/xpage/overview) — 完整 API 文档
