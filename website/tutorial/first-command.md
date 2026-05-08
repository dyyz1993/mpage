---
title: 编写第一个命令
---

# 编写第一个命令

## 命令的三要素

1. **scope** — 命令所属层级（如 `'page'`、`'project'`、`'action'`）
2. **parameters** — Zod schema 定义的参数
3. **handler** — 异步函数，接收 `(params, ctx)` 返回 `CommandResult`

## 完整示例：hello 命令

```typescript
// src/commands/hello.ts
import { z } from 'zod';
import type { Core } from '@dyyz1993/xcli-core';
import { ok, fail } from '@dyyz1993/xcli-core';

export function registerHelloCommand(app: Core): void {
  const site = app.loader.getAPI().createSite({
    name: 'hello',
    url: '',
  });

  site.command('hello', {
    description: '向某人问好',
    scope: 'action',
    parameters: z.object({
      name: z.string().default('World').describe('目标名称'),
      count: z.number().int().min(1).max(10).default(1).describe('重复次数'),
      excited: z.boolean().default(false).describe('是否激动模式'),
    }),
    handler: async (params, ctx) => {
      const greeting = params.excited
        ? `HELLO, ${params.name.toUpperCase()}!!!`
        : `Hello, ${params.name}`;

      const messages = Array(params.count).fill(greeting);

      return ok(messages, [
        `向 ${params.name} 打了 ${params.count} 次招呼`,
        params.excited ? '激动模式已开启' : '普通模式',
      ]);
    },
  });
}
```

然后在入口注册：

```typescript
// src/index.ts
import { Core } from '@dyyz1993/xcli-core';
import { registerHelloCommand } from './commands/hello.js';

export function createApp() {
  const app = new Core({
    name: 'my-cli',
    version: '0.1.0',
    description: '我的 CLI',
    configDirName: '.my-cli',
    envPrefix: 'MY_CLI',
    pluginDirs: [],
  });

  registerHelloCommand(app);
  return app;
}
```

运行：

```bash
$ my-cli hello --name "Alice" --count 3 --excited
```

## 参数定义（Zod schema）

```typescript
// 字符串参数
z.string().describe('用户名')

// 带默认值
z.string().default('admin').describe('用户名')

// 数字参数
z.number().int().min(1).max(100).describe('重试次数')

// 布尔参数（标志位）
z.boolean().default(false).describe('是否启用详细输出')

// 枚举参数
z.enum(['json', 'yaml', 'text']).default('json').describe('输出格式')

// 数组参数
z.array(z.string()).describe('目标文件列表')

// 可选参数
z.string().optional().describe('可选的过滤条件')
```

## 返回值规范

所有命令 handler 必须通过 `ok()` / `fail()` 包装返回值，**禁止返回裸对象**。

```typescript
import { ok, fail, withMeta } from '@dyyz1993/xcli-core';

// 成功
return ok(data, [
  `查询返回 ${data.length} 行`,
  `耗时 ${(end - start)}ms`,
]);

// 失败
return fail('数据库连接超时', [
  '请检查数据库是否启动',
  '当前超时设置: 30s',
]);

// 带元数据
const result = ok(data, ['采集到 15 条数据']);
return withMeta(result, {
  duration: 1234,
  command: 'query',
  site: 'hello',
});
```

### CommandResult 接口

```typescript
interface CommandResult<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  tips: string[];
  meta?: {
    duration?: number;
    command?: string;
    site?: string;
  };
}
```

## tips 编写规范

```typescript
// ✅ 好的 tips: 包含数量 + 关键值
//   "采集到 5 篇文章"
//   "共 12 个表，最大表 users 有 15000 行"

// ❌ 差的 tips: 只有模糊描述
//   "数据已采集"
//   "操作完成"
```
