---
title: 脚手架详解
description: create-xcli 脚手架的完整用法，5 个模板的文件结构、选择建议和高级 API。
---

# 脚手架详解

## 命令用法

```bash
npx create-xcli <项目名>
```

- **项目名**：必填，同时用作目录名和 `package.json` 的 `name` 字段
- 交互式引导选择模板和填写变量（如 description、author）
- 支持 `--template <名称>` 跳过交互，直接指定模板

> 当前版本需要从目标父目录运行，如 `cd ~/projects && npx create-xcli my-cli`。

## 五个模板详解

### base — 通用 CLI

```
my-cli/
├── bin/cli.ts           # CLI 入口，创建 Core 实例并运行
├── src/index.ts         # 库入口，导出 version
├── src/version.ts       # 版本号常量
├── tsup.config.ts       # 构建：库 + CLI 双入口
├── tsconfig.json        # TypeScript strict 模式
├── package.json         # 依赖 xcli-core + zod
├── .gitignore
└── README.md
```

- **生成 8 个文件**
- 依赖：`@dyyz1993/xcli-core`、`zod`
- 适用：想从零创建一个通用 CLI 工具，不确定具体领域时先选这个

### browser — 浏览器自动化

```
my-cli/
├── bin/cli.ts           # CLI 入口
├── src/index.ts         # createApp()，注册浏览器插件
├── src/version.ts
├── src/commands/browser.ts  # 浏览器生命周期（launch/close）
├── src/commands/index.ts
├── .xcli/plugins/.gitkeep
├── tsup.config.ts       # external: playwright
├── tsconfig.json
├── package.json         # + playwright 依赖
├── .gitignore
└── README.md
```

- **生成 11 个文件**
- 额外依赖：`playwright`、`playwright-core`
- 适用：浏览器自动化、爬虫、E2E 测试、RPA
- 内置 `ensureBrowser()` / `closeBrowser()` 帮助函数管理浏览器生命周期

### database — 数据库管理

```
my-cli/
├── bin/cli.ts
├── src/index.ts         # createApp()，注册数据库命令
├── src/version.ts
├── src/types.ts         # DatabaseConfig, QueryResult 等类型
├── src/connection.ts    # 多数据库连接工厂（SQLite/MySQL/PG）
├── src/context.ts       # DatabaseCommandContext
├── src/scope.ts         # 层级：project → database → table → row
├── src/worker.ts        # DatabaseWorker（RPC worker 模式）
├── src/commands/
│   ├── query.ts         # 执行 SQL
│   ├── tables.ts        # 列出表
│   ├── describe.ts      # 查看表结构
│   ├── insert.ts        # 插入数据
│   └── index.ts
├── tsup.config.ts       # external: better-sqlite3, mysql2, pg
├── tsconfig.json
├── package.json
├── .gitignore
└── README.md
```

- **生成 17 个文件**
- 数据库驱动按需安装：`better-sqlite3`（默认）/ `mysql2` / `pg`
- 变量：`dbType`（sqlite/mysql/postgres，默认 sqlite）
- 适用：数据库查询、管理工具、数据迁移

### api — API 交互

```
my-cli/
├── bin/cli.ts
├── src/index.ts         # createApp()，注册 HTTP 命令
├── src/version.ts
├── src/types.ts         # APIConfig, APIResponse 等类型
├── src/context.ts       # APICommandContext
├── src/scope.ts         # 层级：project → endpoint → method → param
├── src/worker.ts        # APIWorker（undici 请求）
├── src/commands/
│   ├── get.ts           # GET 请求
│   ├── post.ts          # POST 请求
│   ├── put.ts           # PUT 请求
│   ├── delete.ts        # DELETE 请求
│   └── index.ts
├── tsup.config.ts
├── tsconfig.json
├── package.json         # + undici 依赖
├── .gitignore
└── README.md
```

- **生成 16 个文件**
- 额外依赖：`undici`
- 变量：`baseUrl`（默认 `https://api.example.com`）
- 适用：API 调试、HTTP 客户端、类似 httpie 的工具

### minimal-plugin — 最小插件

```
my-plugin/
├── index.ts             # 插件入口，export default function
├── package.json         # 最小配置（name + type: module）
└── README.md
```

- **生成 3 个文件**
- 无额外依赖
- 变量：`siteUrl`（目标网站 URL）
- 适用：给已有 CLI 开发插件

> **插件也是独立项目**：`minimal-plugin` 生成的是一个完整的项目结构。在 xcli 中，插件 = 含 `export default function(api: XCLIAPI)` 的 TypeScript 文件。插件通过 `createSite()` + `command()` 注册命令。

## ScaffoldEngine API

`ScaffoldEngine` 是脚手架的核心引擎，可以在代码中直接调用：

```typescript
import { ScaffoldEngine, BASE_CLI_TEMPLATE } from '@dyyz1993/xcli-core';

const engine = new ScaffoldEngine();

// 注册模板
engine.registerTemplate(BASE_CLI_TEMPLATE);

// 查看可用模板
engine.listTemplates();
// => [{ name: 'base', description: 'A basic CLI application...' }]

// 生成项目
const result = await engine.generate('base', 'my-cli', {
  targetDir: '/path/to/projects/my-cli',
  variables: { description: 'My awesome CLI' },
  force: false,            // 覆盖已有文件
  skipPostGenerate: false, // 跳过 postGenerate 钩子
});

console.log(result.files);       // 新建的文件列表
console.log(result.skipped);     // 跳过的文件（skipIfExists）
console.log(result.overwritten); // 覆盖的文件
console.log(result.projectDir);  // 项目目录绝对路径
```

### 模板变量

引擎内置以下变量，所有模板文件中通过 `{{变量名}}` 引用：

| 变量 | 示例值 | 来源 |
|------|--------|------|
| `projectName` | `my-cli` | 命令行参数 |
| `ProjectName` | `MyCli` | 自动转换（PascalCase） |
| `project-name` | `my-cli` | 自动转换（kebab-case） |
| `year` | `2026` | 当前年份 |
| `date` | `2026-05-08` | 当前日期 |

### 自定义模板

```typescript
import type { ScaffoldTemplate } from '@dyyz1993/xcli-core';

const myTemplate: ScaffoldTemplate = {
  name: 'custom',
  description: 'My custom template',
  variables: [
    { name: 'description', description: 'Project description', default: '' },
  ],
  files: [
    {
      path: 'package.json',
      content: '{ "name": "{{projectName}}", "description": "{{description}}" }',
    },
    {
      path: 'bin/cli.ts',
      content: '// ...',
      mode: 0o755,           // 设置可执行权限
      skipIfExists: true,    // 文件已存在时跳过
    },
  ],
  async postGenerate(projectDir, variables) {
    // 生成后的自定义逻辑（如 git init）
  },
};

engine.registerTemplate(myTemplate);
```

## 模板选择决策树

```
你的目标是什么？
├── 浏览器自动化（爬虫、测试、RPA）
│   └── browser
├── 数据库工具（查询、迁移、管理）
│   └── database
├── API 调试工具（HTTP 客户端）
│   └── api
├── 给已有 CLI 写插件
│   └── minimal-plugin
└── 不确定 / 通用 CLI
    └── base（起步最简单，后续可按需添加功能）
```
