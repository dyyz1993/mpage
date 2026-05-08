---
title: 安装
---

# 安装

## 前置条件

- Node.js >= 18.0.0
- npm / pnpm / yarn

## 安装 @dyyz1993/xpage（浏览器引擎）

```bash
npm install @dyyz1993/xpage
```

xpage 依赖 Playwright，会自动安装。

## 安装 @dyyz1993/xcli-core（CLI 框架）

```bash
npm install @dyyz1993/xcli-core zod
```

`zod` 是参数校验的必需依赖。

## 安装 create-xcli（脚手架工具）

```bash
npx create-xcli my-cli
```

脚手架工具会引导你选择模板并生成项目骨架。

## 各模板的依赖说明

| 模板名 | 关键依赖 | 适用场景 |
|--------|---------|---------|
| `base` | xcli-core + zod | 通用 CLI 起步 |
| `browser` | + playwright | 浏览器自动化 |
| `database` | + better-sqlite3/mysql2/pg | 数据库管理 |
| `api` | + undici | API 交互 |
| `minimal-plugin` | — | 最小插件模板 |

## 模板选择决策树

- **想做浏览器自动化**（爬虫、测试） → 选 `browser` 模板
- **想做数据库工具**（查询、管理） → 选 `database` 模板
- **想做 API 调试工具**（类似 httpie） → 选 `api` 模板
- **只想写个简单 CLI**（不确定领域） → 选 `base` 模板
- **想给已有 CLI 写插件** → 选 `minimal-plugin` 模板
