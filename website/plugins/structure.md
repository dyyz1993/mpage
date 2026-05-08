---
title: 插件结构
---

# 插件结构

## 目录结构

```
.xcli/plugins/<plugin-id>/
├── index.ts          # 插件入口（必须）
├── package.json      # 包配置（必须，至少含 name）
└── README.md         # 说明文档（推荐）
```

## 命名规范

- 目录名：`{序号}-{名称}`（如 `01-static`、`32-ecommerce`）或纯名称（如 `baidu`）
- 命令名：`kebab-case`（如 `scrape`、`reveal-phone`）
- 站点名：`kebab-case`，与目录名一致

## index.ts

插件入口，必须是 `export default function`：

```typescript
import type { XCLIAPI } from '@dyyz1993/xcli-core';
import { z } from 'zod';

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
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
}
```

## package.json

```json
{
  "name": "xcli-plugin-my-plugin",
  "version": "1.0.0",
  "description": "My awesome xcli plugin",
  "main": "index.ts",
  "keywords": ["xcli", "plugin"],
  "license": "MIT"
}
```

**注意：** 插件的依赖必须在插件自己的 `package.json` 中声明。

## 加载顺序

1. `./.xcli/plugins/` — 当前目录（项目级）
2. `../.xcli/plugins/` — 父目录
3. `~/.xcli/plugins/` — 全局用户目录

同名插件：本地优先于全局，后加载覆盖先加载。
