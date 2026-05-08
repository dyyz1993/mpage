[![Documentation](https://img.shields.io/badge/docs-xcli-blue?style=for-the-badge&logo=vite)](https://dyyz1993.github.io/mpage/)
[![CI](https://img.shields.io/github/actions/workflow/status/dyyz1993/mpage/ci.yml?branch=master&style=for-the-badge&logo=github)](https://github.com/dyyz1993/mpage/actions)

[![npm xpage](https://img.shields.io/npm/v/@dyyz1993/xpage?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@dyyz1993/xpage) [![npm xcli-core](https://img.shields.io/npm/v/@dyyz1993/xcli-core?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@dyyz1993/xcli-core) [![npm create-xcli](https://img.shields.io/npm/v/create-xcli?style=for-the-badge&logo=npm&label=create-xcli)](https://www.npmjs.com/package/create-xcli)

[![Coverage](https://img.shields.io/codecov/c/github/dyyz1993/mpage/master?style=for-the-badge&logo=codecov)](https://codecov.io/gh/dyyz1993/mpage)
[![License](https://img.shields.io/npm/l/@dyyz1993/xpage?style=for-the-badge)](https://github.com/dyyz1993/mpage/blob/master/LICENSE)

# mpage

**插件化 CLI 框架 + 浏览器自动化引擎**，5 分钟创建你的领域 CLI 工具。

## 它能做什么？

- **浏览器自动化** — 35+ 页面命令、录制/回放、页面结构提取
- **插件系统** — TypeScript 运行时加载，命令覆盖/增强
- **脚手架** — 一条命令生成项目，5 种模板覆盖常见场景
- **通用框架** — 领域无关的核心设计，不绑定浏览器/数据库/API

## 快速开始

### 1. 创建项目

```bash
npx create-xcli my-tool
```

交互式选择模板：`base` / `browser` / `database` / `api` / `plugin`。

### 2. 浏览器自动化（@dyyz1993/xpage）

```typescript
import { executePageCommand, RecorderController, PlaybackEngine } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

const browser = await chromium.launch();
const page = await browser.newPage();

// 导航 + 获取标题
await executePageCommand(page, 'goto', { url: 'https://example.com' });
const { title } = await executePageCommand(page, 'title', {});
console.log(title); // "Example Domain"

// 页面结构提取
const { structure } = await executePageCommand(page, 'structure', { selector: 'body' });

// 录制用户操作
const recorder = new RecorderController(page);
await recorder.start({ url: 'https://example.com', name: 'demo' });
// ... 用户在浏览器中操作 ...
const { path } = await recorder.stop('./recordings/demo.yaml');

// 回放录制
const player = await PlaybackEngine.fromFile(page, './recordings/demo.yaml');
await player.play({ slowMo: 1 });

await browser.close();
```

### 3. 创建 CLI 工具（@dyyz1993/xcli-core）

```typescript
import { Core, ok, fail } from '@dyyz1993/xcli-core';
import { z } from 'zod';

const app = new Core({
  name: 'my-tool',
  version: '0.1.0',
  description: '我的 CLI 工具',
  configDirName: '.my-tool',
  envPrefix: 'MY_TOOL',
  pluginDirs: ['./plugins'],
});

const site = app.loader.getAPI().createSite({
  name: 'builtin',
  url: 'https://example.com',
});

site.command('hello', {
  description: '打个招呼',
  parameters: z.object({ name: z.string().default('World') }),
  handler: async (params) => {
    return ok({ message: `Hello, ${params.name}!` }, [`向 ${params.name} 打了招呼`]);
  },
});

await app.run(process.argv.slice(2));
```

### 4. 开发插件

```typescript
import type { XCLIAPI } from '@dyyz1993/xcli-core';
import { ok } from '@dyyz1993/xcli-core';
import { z } from 'zod';

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'my-plugin',
    url: 'https://example.com',
  });

  site.command('greet', {
    description: '问候命令',
    parameters: z.object({
      name: z.string().describe('被问候者'),
      lang: z.enum(['zh', 'en']).default('zh').describe('语言'),
    }),
    handler: async (params) => {
      const greeting = params.lang === 'zh' ? `你好, ${params.name}!` : `Hello, ${params.name}!`;
      return ok({ greeting }, [greeting]);
    },
  });
}
```

## 包结构

本项目是 monorepo，包含以下包：

| 包 | 用途 |
|---|---|
| [`@dyyz1993/xcli-core`](https://www.npmjs.com/package/@dyyz1993/xcli-core) | CLI 框架核心 — 插件加载、命令路由、Session 管理、脚手架引擎 |
| [`@xcli/browser-app`](https://www.npmjs.com/package/@xcli/browser-app) | 浏览器自动化 — 35+ 页面命令、录制/回放、结构提取 |
| [`create-xcli`](https://www.npmjs.com/package/create-xcli) | 脚手架工具 — 一条命令生成项目 |

## 文档

完整文档：[https://dyyz1993.github.io/mpage/](https://dyyz1993.github.io/mpage/)

- [快速开始](https://dyyz1993.github.io/mpage/guide/installation) — 安装与创建项目
- [插件开发](https://dyyz1993.github.io/mpage/plugins/overview) — 开发自定义插件
- [API 参考](https://dyyz1993.github.io/mpage/api/xpage/overview) — 完整 API 文档
- [录制与回放](https://dyyz1993.github.io/mpage/guide/recording) — 录制和回放用户操作
- [页面结构提取](https://dyyz1993.github.io/mpage/guide/structure) — 提取语义布局

## 开发

```bash
pnpm install
pnpm run build
pnpm run test
```

## License

MIT
