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

## 使用脚手架创建项目

如果你是从零开始，推荐使用脚手架工具快速生成项目骨架：

```bash
npx create-xcli my-cli
```

脚手架提供 5 个内置模板（base / browser / database / api / minimal-plugin），交互式引导选择。

详细用法、模板对比和选择决策树请参阅 [脚手架创建](./scaffolding)。
