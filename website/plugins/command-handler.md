---
title: 命令 handler
---

# 命令 handler

## 签名

```typescript
type CommandHandler = (
  params: Record<string, unknown>,
  ctx: CommandContext
) => Promise<CommandResult>
```

## CommandContext

```typescript
interface CommandContext {
  args: string[];
  options: Record<string, unknown>;
  cwd: string;
  storage: StorageContext;
  output: OutputContext;
  error: (msg: string) => void;
  config: Record<string, unknown>;
  site: SiteInstance;
  cliName: string;
}
```

## StorageContext

```typescript
interface StorageContext {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}
```

## OutputContext

```typescript
interface OutputContext {
  mode: 'text' | 'json' | 'yaml';
  showTips: boolean;
  color: boolean;
  emoji: boolean;
}
```

## 返回值规范

必须用 `ok()` 或 `fail()` 包装：

```typescript
import { ok, fail } from '@dyyz1993/xcli-core';

// 成功
return ok(data, [`采集到 ${data.length} 条数据`]);

// 失败
return fail('连接超时', ['请检查网络']);
```

## 完整示例

```typescript
site.command('query', {
  description: '查询数据',
  scope: 'project',
  parameters: z.object({
    sql: z.string().describe('SQL 查询语句'),
    dryRun: z.boolean().default(false).describe('仅打印不执行'),
  }),
  handler: async (params, ctx) => {
    if (params.dryRun) {
      return ok({ sql: params.sql }, ['Dry run 模式']);
    }

    const data = await executeQuery(params.sql);

    return ok(data, [
      `查询返回 ${data.length} 行`,
      `耗时 ${Date.now() - start}ms`,
    ]);
  },
});
```

## 禁止事项

- 禁止在 handler 中 `throw Error`（用 `fail()`）
- 禁止直接操作全局状态（用 `ctx.storage`）
- 禁止返回裸对象 `{ data: [], tips: [] }`（用 `ok()`/`fail()`）
