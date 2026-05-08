---
title: 创建你的 CLI
description: 手把手教你使用脚手架创建第一个 CLI 项目，理解项目结构并添加命令。
---

# 创建你的 CLI

本教程带你从零创建一个完整的 CLI 项目。无需事先了解 xcli 框架。

## 第一步：用脚手架生成项目

```bash
npx create-xcli my-tool
```

脚手架会交互式引导你选择模板和填写项目信息。如果你不确定选哪个，先选 **base**。

```bash
cd my-tool
npm install
```

> 脚手架的详细用法和所有模板对比见 [脚手架详解](/guide/scaffolding)。

## 第二步：理解项目结构

base 模板生成的文件：

```
my-tool/
├── bin/cli.ts           # CLI 入口 —— 程序从这里开始执行
├── src/
│   ├── index.ts         # 库入口 —— 导出供其他模块引用
│   └── version.ts       # 版本号 —— 集中管理
├── tsup.config.ts       # 构建配置 —— 编译 TypeScript 并打包
├── tsconfig.json        # TypeScript 配置 —— strict 模式
├── package.json         # 项目配置 —— 依赖和脚本
├── .gitignore
└── README.md
```

### CLI 入口文件

打开 `bin/cli.ts`，你会看到：

```typescript
#!/usr/bin/env node
import { Core } from '@dyyz1993/xcli-core';

const app = new Core({
  name: 'my-tool',          // CLI 名称，显示在帮助信息中
  version: '0.1.0',         // 版本号
  description: '...',       // 一句话描述
  configDirName: '.my-tool', // 配置文件存放目录
  envPrefix: 'MY_TOOL',     // 环境变量前缀（如 MY_TOOL_DEBUG=1）
  pluginDirs: [],            // 插件搜索目录，后续会用到
});

await app.run(process.argv.slice(2));
```

每个字段都是必填的。`configDirName` 和 `envPrefix` 决定了配置和环境变量的命名规则。

## 第三步：构建并运行

```bash
npm run build
node dist/cli.js --help
```

预期输出类似：

```
my-tool v0.1.0 - ...

Usage:
  my-tool <command> [options]

Options:
  --help     Show help
  --version  Show version
```

> 开发时可以用 `npm run dev` 启动 watch 模式，修改代码后自动重新构建。

## 第四步：添加第一个命令

创建 `src/commands/hello.ts`：

```typescript
import { z } from 'zod';
import type { Core } from '@dyyz1993/xcli-core';

export function registerHelloCommand(app: Core): void {
  const site = app.loader.getAPI().createSite({
    name: 'my-tool',
    url: '',
  });

  site.command('hello', {
    description: '打招呼',
    scope: 'project',
    parameters: z.object({
      name: z.string().default('World').describe('对方名字'),
    }),
    handler: async (params) => {
      return {
        success: true,
        data: { message: `Hello, ${params.name}!` },
        tips: [`向 ${params.name} 打了招呼`],
      };
    },
  });
}
```

在 `bin/cli.ts` 中注册：

```typescript
import { registerHelloCommand } from '../src/commands/hello.js';

const app = new Core({ /* ... */ });
registerHelloCommand(app);

await app.run(process.argv.slice(2));
```

重新构建后测试：

```bash
npm run build
node dist/cli.js hello --name Alice
```

## 第五步：添加插件

在项目中创建插件目录：

```bash
mkdir -p plugins/my-plugin
```

创建 `plugins/my-plugin/index.ts`：

```typescript
import type { XCLIAPI } from '@dyyz1993/xcli-core';
import { z } from 'zod';

export default function (cli: XCLIAPI): void {
  const site = cli.createSite({
    name: 'my-plugin',
    url: '',
  });

  site.command('ping', {
    description: '测试插件是否加载',
    scope: 'project',
    parameters: z.object({}),
    handler: async () => {
      return { success: true, data: { pong: true }, tips: ['插件运行正常'] };
    },
  });
}
```

然后在 `bin/cli.ts` 中启用插件目录：

```typescript
const app = new Core({
  // ...
  pluginDirs: ['./plugins'],  // 改为 ['./plugins']
});
```

构建并运行：

```bash
npm run build
node dist/cli.js ping
```

> **插件开发不限于当前项目**。你可以用 `npx create-xcli --template minimal-plugin` 生成一个独立的插件项目。详见 [脚手架详解](/guide/scaffolding#minimal-plugin--最小插件)。

## 手动创建（不使用脚手架）

如果你已有项目想集成 xcli：

```bash
mkdir my-tool && cd my-tool
npm init -y
npm install @dyyz1993/xcli-core zod
npm install -D tsup typescript @types/node
```

创建 `bin/cli.ts`（内容见上方「CLI 入口文件」），然后在 `package.json` 中添加：

```json
{
  "type": "module",
  "bin": { "my-tool": "dist/bin/cli.js" },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  }
}
```

详细的依赖说明见 [安装与创建](/guide/installation#方式二手动安装已有项目集成)。

## 下一步

- [编写第一个命令](/tutorial/first-command) — 深入命令开发
- [编写插件](/tutorial/write-plugin) — 完整插件教程
- [脚手架详解](/guide/scaffolding) — 所有模板的完整参考
