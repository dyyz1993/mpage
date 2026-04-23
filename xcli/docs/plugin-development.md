# xcli 插件开发规范

## 核心原则

### 1. 禁止直接引入 Playwright

插件**不得**直接 `import { chromium } from 'playwright'`。应该使用 xcli 提供的 `ctx.page`。

```typescript
// ❌ 错误
import { chromium } from 'playwright';
const browser = await chromium.launch();

// ✅ 正确
await ctx.page.goto('...');
await ctx.page.fill('#selector', 'value');
```

### 2. 禁止直接引入 ws/http 等网络库

插件**不得**直接引入网络库进行 HTTP 请求。应该使用：

- `ctx.page.evaluate()` - 在浏览器上下文中执行 fetch
- Node.js 内置 `fetch` - 如果需要外部 HTTP 请求

```typescript
// ❌ 错误
import axios from 'axios';
import got from 'got';

// ✅ 正确
// 方式1：使用浏览器内 fetch
await ctx.page.evaluate(async () => {
  const res = await fetch('https://api.example.com/data');
  return res.json();
});

// 方式2：使用 Node.js fetch
const res = await fetch('https://api.example.com/data');
const data = await res.json();
```

### 3. 使用 Zod 定义参数

使用 Zod schema 定义命令参数，不要直接操作 `args` 数组。

```typescript
// ✅ 正确
plugin.command('scrape', {
  description: '采集数据',
  parameters: z.object({
    query: z.string().describe('搜索关键词'),
    limit: z.number().default(10).describe('结果数量限制'),
  }),
  handler: async (params, ctx) => {
    // params 已经类型安全
    console.log(params.query, params.limit);
  },
});
```

## 插件结构

```
plugins/
└── <example-id>-<name>/
    ├── index.ts          # 插件入口
    ├── package.json      # 插件元信息
    └── VERIFICATION.md   # 验证记录
```

## 插件模板

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';
const TARGET = `${BASE_URL}/examples/<id>`;

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '<example-id>-<name>',
    url: `${BASE_URL}/examples/<example-id>-<name>.html`,
    requiresLogin: true, // 或 false
  });

  plugin.command('command-name', {
    description: '命令描述',
    requiresLogin: false,
    parameters: z.object({
      param1: z.string().describe('参数1描述'),
      param2: z.number().default(10).describe('参数2描述'),
    }),
    // @ts-ignore
    handler: async (params: any, ctx: any) => {
      // 使用 ctx.page 进行浏览器操作
      // 使用 ctx.storage 进行数据存储
      // 使用 fetch 进行 HTTP 请求
      return { success: true, data: [] };
    },
  });
}
```

## CommandContext 可用属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `ctx.page` | `Playwright.Page` | Playwright 页面实例 |
| `ctx.storage` | `StorageContext` | 键值存储 |
| `ctx.options` | `Record<string, unknown>` | 命令行选项 |
| `ctx.args` | `string[]` | 位置参数 |
| `ctx.output` | `OutputContext` | 输出控制 |

## 常见错误

### 错误 1: 直接创建浏览器

```typescript
// ❌
import { chromium } from 'playwright';
const browser = await chromium.launch();

// ✅
await ctx.page.goto(url);
```

### 错误 2: 使用 axios/got

```typescript
// ❌
import axios from 'axios';
const data = await axios.get(url);

// ✅
const res = await fetch(url);
const data = await res.json();
```

### 错误 3: 不使用 Zod 定义参数

```typescript
// ❌
handler: async (args, ctx) => {
  const query = args[0];
  const limit = parseInt(args[1]) || 10;
};

// ✅
parameters: z.object({
  query: z.string(),
  limit: z.number().default(10),
}),
handler: async (params, ctx) => {
  // params.query, params.limit 已类型化
};
```

## 验证清单

创建插件后，确保：

- [ ] 没有 `import { chromium } from 'playwright'`
- [ ] 没有 `import axios from 'axios'` 或类似网络库
- [ ] 参数使用 Zod schema 定义
- [ ] `ctx.page` 用于浏览器操作
- [ ] `ctx.storage` 用于持久化数据
- [ ] 返回值包含 `success` 字段
- [ ] 创建 VERIFICATION.md 记录测试结果