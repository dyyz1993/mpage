---
title: 插件开发概览
---

# 插件开发概览

xcli 提供了完整的插件系统，支持 TypeScript、热重载、隔离命名空间。

## 核心能力

- **TypeScript 支持** — jiti 运行时编译，无需预编译
- **热重载** — 无需重启即可加载/卸载插件
- **命令注册** — Zod schema 驱动的参数校验
- **站点创建** — 每个插件独立命名空间
- **事件处理** — 登录/登出钩子、自定义事件
- **存储集成** — 每个插件独立的 key-value 存储

## 快速上手

```typescript
import type { XCLIAPI } from '@dyyz1993/xcli-core';
import { z } from 'zod';

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'my-plugin',
    url: 'https://example.com',
  });

  site.command('hello', {
    description: 'Say hello',
    scope: 'project',
    parameters: z.object({
      name: z.string().default('World'),
    }),
    handler: async (params) => {
      return { success: true, data: { message: `Hello, ${params.name}!` }, tips: [`向 ${params.name} 打了招呼`] };
    },
  });
}
```

## 下一步

- [插件结构](/plugins/structure) — 目录结构和文件规范
- [XCLIAPI 接口](/plugins/xcli-api) — 插件 API 详解
- [命令 handler](/plugins/command-handler) — handler 编写指南
- [安装器](/plugins/installers) — 5 种安装方式
- [最佳实践](/plugins/best-practices) — 经验总结
