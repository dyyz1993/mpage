---
title: 自定义领域 CLI
---

# 自定义领域 CLI

xcli-core 提供 3 个核心扩展点：

```
┌─────────────────────────────────────────────────┐
│              你的领域 CLI                         │
│                                                  │
│  1. WorkerEntryPoint  →  定义资源生命周期         │
│  2. ScopeDefinition   →  定义命令层级体系         │
│  3. ScaffoldTemplate  →  定义项目模板             │
└─────────────────────────────────────────────────┘
```

## 实战：创建数据库 CLI

### 项目结构

```
my-db-cli/
├── bin/cli.ts           # 入口
├── src/
│   ├── index.ts         # createApp()
│   ├── types.ts         # 类型定义
│   ├── connection.ts    # 连接管理
│   ├── scope.ts         # 自定义 scope 层级
│   ├── worker.ts        # WorkerEntryPoint 实现
│   └── commands/
│       ├── query.ts     # SQL 查询命令
│       ├── tables.ts    # 列表命令
│       └── index.ts     # 命令注册汇总
```

### 自定义 scope 层级

```typescript
// src/scope.ts
export const DATABASE_SCOPE_ORDER: Record<string, number> = {
  project: 0,    // 项目级
  database: 1,   // 数据库级
  table: 2,      // 表级
  row: 3,        // 行级
};
```

### WorkerEntryPoint 实现

```typescript
import type { WorkerEntryPoint, WorkerContext } from '@dyyz1993/xcli-core';

export class DatabaseWorker implements WorkerEntryPoint {
  private ctx!: WorkerContext;
  private connection!: DatabaseConnection;

  async init(ctx: WorkerContext): Promise<void> {
    this.ctx = ctx;
    const config = parseConfig(ctx.config);
    this.connection = await createConnection(config);
    ctx.ipc.send('database:ready', { dbType: config.dbType });
  }

  async execute(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'query':
        return this.connection.query(params.sql as string, params.values as unknown[]);
      case 'tables':
        return this.connection.query('SELECT name FROM sqlite_master ...');
      case 'ping':
        return this.connection.query('SELECT 1 as ok');
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  async destroy(): Promise<void> {
    await this.connection?.close();
  }
}
```

## 实战：创建 API CLI

### scope 层级

```typescript
const API_SCOPE_ORDER = {
  project: 0,
  endpoint: 1,
  method: 2,
  param: 3,
};
```

### API Worker

```typescript
export class APIWorker implements WorkerEntryPoint {
  private config!: APIConfig;

  async init(ctx: WorkerContext): Promise<void> {
    this.config = parseConfig(ctx.config);
    ctx.ipc.send('api:ready', { baseUrl: this.config.baseUrl });
  }

  async execute(method: string, params: Record<string, unknown>): Promise<unknown> {
    const url = this.resolveUrl(params.url as string);
    switch (method) {
      case 'get': return this.doRequest({ method: 'GET', url });
      case 'post': return this.doRequest({ method: 'POST', url, body: params.body });
      default: throw new Error(`Unknown method: ${method}`);
    }
  }

  async destroy(): Promise<void> {}
}
```

## 自定义 Worker

实现 `WorkerEntryPoint` 接口的三个方法：

```typescript
import type { WorkerEntryPoint, WorkerContext } from '@dyyz1993/xcli-core';

export class MyWorker implements WorkerEntryPoint {
  private ctx!: WorkerContext;

  // 1. 初始化 — 建立连接、加载配置
  async init(ctx: WorkerContext): Promise<void> {
    this.ctx = ctx;
    ctx.ipc.send('my-worker:ready', { status: 'ok' });
  }

  // 2. 执行 — 处理 RPC 方法调用
  async execute(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'doSomething':
        return { result: 'done' };
      case 'ping':
        return { pong: true };
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  // 3. 销毁 — 释放资源
  async destroy(): Promise<void> {
    // 关闭连接、清理状态
  }
}
```

## 自定义 Scope 层级

```typescript
import type { ScopeDefinition } from '@dyyz1993/xcli-core';

const MY_SCOPE: ScopeDefinition = {
  name: 'ecommerce',
  description: '电商领域命令层级',
  levels: [
    { name: 'project', description: '项目级操作', order: 0 },
    { name: 'store', description: '店铺级操作', order: 1 },
    { name: 'product', description: '商品级操作', order: 2 },
    { name: 'sku', description: 'SKU 级操作', order: 3 },
  ],
};

// 注册命令时指定 scope
site.command('list-products', {
  description: '列出商品',
  scope: 'product',
  parameters: z.object({ category: z.string() }),
  handler: async (params) => { /* ... */ },
});
```
