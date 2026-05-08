---
title: 最佳实践
---

# 插件开发最佳实践

## 1. 使用 Zod Schemas 校验参数

```typescript
// ✅ 好的
parameters: z.object({
  url: z.string().url(),
  timeout: z.number().min(0).optional(),
})

// ❌ 差的
parameters: z.object({
  url: z.any(),
  timeout: z.any(),
})
```

## 2. 返回规范的结果

```typescript
// ✅ 好的
return ok(data, [`采集到 ${data.length} 条数据`]);

// ❌ 差的
return 'success';
```

## 3. 使用存储而非全局变量

```typescript
// ✅ 好的
await ctx.storage.set('state', { count: 1 });
const state = await ctx.storage.get('state');

// ❌ 差的
let state = { count: 1 };
```

## 4. 提供使用示例

```typescript
site.command('search', {
  description: '搜索',
  examples: [
    { cmd: 'search --query "playwright"', description: '搜索 playwright' },
    { cmd: 'search --query "typescript" --limit 10', description: '限制结果数' },
  ],
  handler: async (params) => { /* ... */ },
});
```

## 5. 优雅地处理错误

```typescript
import { fail } from '@dyyz1993/xcli-core';

site.command('fetch-data', {
  handler: async (params) => {
    try {
      const data = await fetchData(params.url);
      return ok(data, [`获取到 ${data.length} 条数据`]);
    } catch (error) {
      return fail(`请求失败: ${(error as Error).message}`);
    }
  },
});
```

## 6. 安全导航

使用 `safeGoto` 替代裸 `page.goto()`：

```typescript
import { safeGoto } from '../_shared';
await safeGoto(ctx.page, site.url);
```

## 7. evaluate 内只用标准 DOM API

```typescript
// ✅ 正确
const data = await ctx.page.evaluate(() => {
  const el = document.getElementById('case-data') as HTMLScriptElement;
  return JSON.parse(el.textContent || '{}');
});

// ❌ 错误
const data = await ctx.page.evaluate(() => {
  document.querySelector(':has-text("hello")'); // Playwright 语法不支持
});
```
