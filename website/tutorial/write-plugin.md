---
title: 编写插件
---

# 编写插件

## 插件目录结构

```
.xcli/plugins/<plugin-id>/
├── index.ts          # 插件入口（必须）
├── package.json      # 包配置（必须，至少含 name）
└── README.md         # 说明文档（推荐）
```

命名规范：目录名 `{序号}-{名称}`（如 `01-static`、`32-ecommerce`）或纯名称（如 `baidu`）。

## 插件入口签名

```typescript
// index.ts
import type { XCLIAPI } from '@dyyz1993/xcli-core';
import { z } from 'zod';

export default function (cli: XCLIAPI): void {
  const site = cli.createSite({
    name: 'my-plugin',
    url: 'https://example.com',
    description: '示例插件',
  });

  site.command('scrape', {
    description: '采集数据',
    scope: 'page',
    parameters: z.object({
      selector: z.string().describe('CSS 选择器'),
      limit: z.number().default(10).describe('最大条数'),
    }),
    handler: async (params, ctx) => {
      return { data: [], count: 0 };
    },
  });

  // 登录/登出
  site.login(async (ctx) => { /* 登录逻辑 */ });
  site.logout(async (ctx) => { /* 登出逻辑 */ });

  // 生命周期钩子
  cli.onLoad(async () => { console.log('插件加载完成'); });
  cli.onUnload(async () => { console.log('插件卸载'); });

  // 事件监听
  cli.onEvent('data:updated', (event) => {
    console.log(`收到事件: ${event.type}`);
  });
}
```

## 插件加载机制

插件通过 **jiti** 运行时编译加载，无需预编译 TypeScript。

**加载顺序（优先级从高到低）：**

1. `./.xcli/plugins/` — 当前目录（项目级）
2. `../.xcli/plugins/` — 父目录
3. `~/.xcli/plugins/` — 全局用户目录

同名插件规则：本地优先于全局，后加载覆盖先加载。

## 插件安装器

框架提供 5 种安装方式：

| 类型 | 说明 | source 示例 |
|------|------|-------------|
| `local` | 本地路径 | `./plugins/my-plugin` |
| `npm` | npm 包 | `@scope/xcli-plugin-foo` |
| `git` | Git 仓库 | `https://github.com/user/plugin.git` |
| `url` | 远程 URL | `https://example.com/plugin.tar.gz` |
| `builtin` | 内置插件 | 框架自带 |

## 插件隔离原则

- **命名空间隔离** — 每个插件通过 `createSite()` 创建独立命名空间
- **事件通信** — 插件之间通过事件系统通信，**禁止直接 import**
- **存储隔离** — 每个插件有独立的 `PluginStorage`

### 禁止事项

- 插件之间不得直接 import
- handler 不得直接访问全局状态（使用 `ctx.storage`）
- 禁止在 handler 中 throw Error（用 `fail()`）

## 使用存储

```typescript
site.command('save-data', {
  description: '保存数据',
  scope: 'project',
  parameters: z.object({
    key: z.string(),
    value: z.any(),
  }),
  handler: async (params, ctx) => {
    await ctx.storage.set(params.key, params.value);
    const value = await ctx.storage.get(params.key);
    return { ok: true, data: { [params.key]: value } };
  },
});
```
