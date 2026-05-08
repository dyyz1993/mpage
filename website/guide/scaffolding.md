---
title: 脚手架创建
---

# 脚手架创建

## 使用 create-xcli

```bash
npx create-xcli my-cli
```

交互式引导选择模板并生成项目骨架。

## 五个内置模板

| 模板名 | 文件数 | 适用场景 | 关键依赖 |
|--------|--------|---------|----------|
| `base` | 7 | 通用 CLI 起步 | xcli-core + zod |
| `browser` | 10 | 浏览器自动化 | + playwright |
| `database` | 14 | 数据库管理 | + better-sqlite3/mysql2/pg |
| `api` | 13 | API 交互 | + undici |
| `minimal-plugin` | 3 | 最小插件 | — |

## 使用 ScaffoldEngine（代码方式）

```typescript
import { ScaffoldEngine } from '@dyyz1993/xcli-core';

const engine = new ScaffoldEngine();
engine.registerTemplate(BASE_CLI_TEMPLATE);

const result = await engine.generate('base', 'my-cli', {
  variables: { description: 'My awesome CLI' },
});
```

## 模板选择决策树

- **想做浏览器自动化**（爬虫、测试） → 选 `browser` 模板
- **想做数据库工具**（查询、管理） → 选 `database` 模板
- **想做 API 调试工具**（类似 httpie） → 选 `api` 模板
- **只想写个简单 CLI**（不确定领域） → 选 `base` 模板
- **想给已有 CLI 写插件** → 选 `minimal-plugin` 模板
