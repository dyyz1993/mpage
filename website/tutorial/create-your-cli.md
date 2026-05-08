---
title: 创建你的 CLI
---

# 创建你的 CLI

## 快速开始

```bash
mkdir my-cli && cd my-cli
npm init -y

# 安装核心依赖
npm install @dyyz1993/xcli-core zod
npm install -D tsup typescript @types/node

# 构建并运行
npm run build
node dist/bin/cli.js --help
```

## 最简 CLI 入口

```typescript
// bin/cli.ts
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

## CoreConfig 必填字段

```typescript
interface CoreConfig {
  name: string;           // CLI 名称，如 'mycli'
  version: string;        // 版本号，如 '0.1.0'
  description: string;    // 一句话描述
  configDirName: string;  // 配置目录名，如 '.mycli'
  envPrefix: string;      // 环境变量前缀，如 'MYCLI'
  pluginDirs: string[];   // 插件搜索目录
}
```

`name`、`version`、`description`、`configDirName`、`envPrefix`、`pluginDirs` 全部必填。

## 五个模板对比

| 模板名 | 文件数 | 适用场景 | 关键依赖 |
|--------|--------|---------|----------|
| `base` | 7 | 通用 CLI 起步 | xcli-core + zod |
| `browser` | 10 | 浏览器自动化 | + playwright |
| `database` | 14 | 数据库管理 | + better-sqlite3/mysql2/pg |
| `api` | 13 | API 交互 | + undici |
| `minimal-plugin` | 3 | 最小插件 | — |

## tsup 配置

确保 `package.json` 中 `bin` 字段与 tsup 输出路径一致：

```json
{
  "bin": { "my-cli": "dist/bin/cli.js" }
}
```

```typescript
// tsup.config.ts
export default defineConfig([
  { entry: ['bin/cli.ts'], format: ['esm'] },
]);
```

## 下一步

- [编写第一个命令](/tutorial/first-command) — 添加自定义命令
- [编写插件](/tutorial/write-plugin) — 插件开发指南
