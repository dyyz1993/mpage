# xcli-framework 完整教学指南

> 本文档基于 `@dyyz1993/xcli-core` 源码编写，所有接口签名和代码示例均从实际代码中提取。

---

## 第一章：框架概述

### 1.1 什么是 xcli-framework？

xcli-framework 是一个**领域无关的插件化 CLI 开发框架**，让你可以用 TypeScript 快速构建功能完整的命令行工具。它提供插件系统、命令路由、参数校验、Daemon 进程管理、会话管理等基础设施，开发者只需关注业务逻辑。

**核心价值主张：**
- 零配置参数校验（Zod schema 驱动）
- 插件热加载（jiti 运行时编译 TypeScript）
- 进程隔离（Daemon + Worker 架构）
- 领域无关（可用于浏览器、数据库、API 等任何场景）

**适用场景：**
- 浏览器自动化 CLI（爬虫、测试、数据采集）
- 数据库管理工具
- API 调试工具（类似 httpie）
- 任何需要插件扩展的 CLI 工具

### 1.2 与 @dyyz1993/xpage 的关系

```
┌─────────────────────────────────────────────┐
│                  你的 CLI 应用                │
├─────────────┬───────────────┬───────────────┤
│  xcli-core  │  xcli-browser │    xpage      │
│  (通用框架)   │  (桥接层)      │  (浏览器引擎)  │
│             │               │               │
│ - 插件系统   │ - Worker 适配  │ - CDP 连接    │
│ - 命令路由   │ - 浏览器命令   │ - 页面操作    │
│ - Daemon    │ - 录制/回放    │ - 选择器引擎  │
│ - 会话管理   │               │               │
└─────────────┴───────────────┴───────────────┘
```

- **xpage**（`@dyyz1993/xpage`）：底层浏览器引擎，提供 CDP 连接、录制/回放、页面结构提取
- **xcli-core**（`@dyyz1993/xcli-core`）：通用 CLI 框架，不绑定任何特定领域
- **xcli-browser**：桥接层，将 xpage 能力接入 xcli 框架

> xcli-core 可以完全脱离浏览器独立使用。database 和 api 模板就是最好的证明。

### 1.3 技术栈一览

| 类别 | 技术 | 用途 |
|------|------|------|
| 语言 | TypeScript 5+ | 类型安全 |
| 参数校验 | Zod | schema 驱动的参数验证 |
| 构建 | tsup | ESM 输出 |
| TS 运行时 | jiti | 插件热加载 |
| 进程管理 | child_process | Daemon + Worker |
| 通信 | HTTP RPC + WebSocket | Daemon ↔ 客户端 |
| 存储 | 文件系统 | 插件持久化存储 |

---

## 第二章：架构理解

### 2.1 整体分层架构图

```
┌─────────────────────────────────────────────────────┐
│  应用层 (你的 CLI 入口)                               │
│  bin/cli.ts → new Core(config) → app.run(argv)       │
├─────────────────────────────────────────────────────┤
│  Core 入口层                                         │
│  Core 类: 命令路由、参数解析、帮助生成、版本管理         │
├─────────────────────────────────────────────────────┤
│  插件协议层                                          │
│  XCLIAPI / SiteInstance / CommandContext             │
├─────────────────────────────────────────────────────┤
│  功能模块层                                          │
│  PluginLoader / ScaffoldEngine / SessionManager      │
│  ScopeRegistry / OutputFormatter / HelpGenerator     │
├─────────────────────────────────────────────────────┤
│  基础设施层                                          │
│  Daemon / WorkerManager / HTTP Server / WS Server    │
│  PluginStorage / IPC / ArgParser                     │
├─────────────────────────────────────────────────────┤
│  领域扩展点                                          │
│  WorkerEntryPoint / ScopeDefinition / ScaffoldTemplate│
└─────────────────────────────────────────────────────┘
```

### 2.2 核心模块详解

#### Core（入口）

`Core` 类是整个框架的入口，接收 `CoreConfig` 配置并管理插件加载器。它负责解析命令行参数、路由到正确的命令 handler、生成帮助信息。

```typescript
// CoreConfig 接口（必填字段）
interface CoreConfig {
  name: string;           // CLI 名称，如 'mycli'
  version: string;        // 版本号，如 '0.1.0'
  description: string;    // 一句话描述
  configDirName: string;  // 配置目录名，如 '.mycli'
  envPrefix: string;      // 环境变量前缀，如 'MYCLI'
  pluginDirs: string[];   // 插件搜索目录
  pluginPackageName?: string; // 插件 import 别名，默认等于 name
}
```

#### PluginLoader（插件加载）

`PluginLoader` 负责发现、加载、卸载插件。它实现了 `XCLIAPI` 接口，通过 jiti 运行时编译 `.ts` 插件文件。每个插件有独立的 `PluginInstance`，管理生命周期（load → mount → unmount → reload）。

```typescript
// 加载一个插件
const instance = await core.loader.loadPlugin('./plugins/my-plugin/index.ts');
// 卸载
await core.loader.unloadPlugin('my-plugin');
// 重新加载
await core.loader.reloadPlugin('my-plugin');
```

#### Protocol（插件协议）

`XCLIAPI` 是插件开发者面对的核心接口，`SiteInstance` 是插件的命名空间容器。插件通过 `createSite()` 创建站点，通过 `site.command()` 注册命令。

```typescript
interface XCLIAPI {
  createSite(config: SiteConfig): SiteInstance;
  registerCommand(cmd: Command & { handler: CommandHandler }): this;
  registerFlag(flag: FlagConfig): this;
  registerTool(tool: ToolConfig): this;
  overrideTool(name: string, tool: ToolConfig): this;
  onLoad(handler: () => void | Promise<void>): this;
  onUnload(handler: () => void | Promise<void>): this;
  onEvent(event: string, handler: EventHandler): this;
}
```

#### Command / Scope（命令与层级）

每个命令必须有 `scope`（作用域层级），默认是 `'page'`。框架提供通用的 `ScopeDefinition` 允许自定义层级体系。

```typescript
// 浏览器领域预定义的 scope 层级
const BROWSER_SCOPE_ORDER = {
  project: 0,   // 项目级
  browser: 1,   // 浏览器级
  page: 2,      // 页面级
  element: 3,   // 元素级
};

// 通用领域默认 scope
const DEFAULT_SCOPE: ScopeDefinition = {
  name: 'default',
  levels: [
    { name: 'project', order: 0 },
    { name: 'module', order: 1 },
    { name: 'resource', order: 2 },
    { name: 'action', order: 3 },
  ],
};
```

#### Daemon / Worker（进程管理）

Daemon 是常驻后台进程，管理 Worker 池。Worker 通过 `WorkerEntryPoint` 接口定义生命周期。Daemon 通过 HTTP RPC 接收请求，WebSocket 推送事件。

```typescript
// Worker 必须实现的接口
interface WorkerEntryPoint {
  init(ctx: WorkerContext): Promise<void>;
  execute(method: string, params: Record<string, unknown>): Promise<unknown>;
  destroy(): Promise<void>;
}
```

#### Session（会话管理）

`SessionManager` 管理命名会话，每个会话有独立的元数据和存储。支持创建、销毁、列表、归档操作。

```typescript
const sessionManager = new SessionManager();
const session = sessionManager.createSession('my-session', { dbType: 'sqlite' });
```

#### Scaffold（脚手架）

`ScaffoldEngine` 提供项目模板生成能力，内置 5 种模板。支持变量插值（`{{projectName}}`）、文件权限、后置钩子。

```typescript
const engine = new ScaffoldEngine();
engine.registerTemplate(BASE_CLI_TEMPLATE);
const result = await engine.generate('base', 'my-cli', {
  variables: { description: 'My awesome CLI' },
});
```

### 2.3 框架层 vs 引擎层 vs 桥接层

| 能力 | xcli-core（框架自带） | xpage（引擎层） | 使用者实现 |
|------|----------------------|-----------------|-----------|
| 插件加载/卸载 | ✅ | - | - |
| 命令路由 | ✅ | - | - |
| 参数校验 (Zod) | ✅ | - | - |
| Daemon 进程 | ✅ | - | - |
| Worker 管理 | ✅ | - | 需实现 WorkerEntryPoint |
| 会话管理 | ✅ | - | - |
| 脚手架模板 | ✅ (5种) | - | 可自定义模板 |
| CDP 连接 | - | ✅ | - |
| 页面操作 | - | ✅ | - |
| 录制/回放 | - | ✅ | - |
| 浏览器命令 | - | - | 通过插件注册 |

### 2.4 WorkerEntryPoint 生命周期

```
主进程 (Daemon)                     Worker 进程
──────────────                    ────────────
fork() ────────────────────────>  进程启动
                                  ↓
await worker.init(ctx)  ──────>  init(): 初始化资源
                                  - 建立连接
                                  - 加载配置
                                  - ipc.send('ready')
                                  ↓
await worker.execute('query', params) ──> execute(): 执行业务
                                  - 路由 method
                                  - 返回结果
                                  ↓
await worker.execute('query', params) ──> execute(): 可多次调用
                                  ↓
await worker.destroy()  ──────>  destroy(): 释放资源
                                  - 关闭连接
                                  - 清理状态
```

`WorkerContext` 提供了 IPC 通信能力：

```typescript
interface WorkerContext {
  sessionId: string;
  sessionName: string;
  config: Record<string, unknown>;
  ipc: {
    send(type: string, payload: unknown): void;
    onMessage(handler: (msg: IPCMessage) => void): void;
  };
}
```

---

## 第三章：5 分钟创建你的 CLI

### 3.1 快速开始

```bash
# 使用 ScaffoldEngine 生成项目（在代码中调用）
# 或手动从模板创建

mkdir my-cli && cd my-cli
npm init -y

# 安装核心依赖
npm install @dyyz1993/xcli-core zod
npm install -D tsup typescript @types/node

# 构建并运行
npm run build
node dist/bin/cli.js --help
```

最简单的 CLI 入口（`bin/cli.ts`）：

```typescript
#!/usr/bin/env node
import { Core } from '@dyyz1993/xcli-core';

const app = new Core({
  name: 'my-cli',
  version: '0.1.0',
  description: '我的第一个 xcli 工具',
  configDirName: '.my-cli',
  envPrefix: 'MY_CLI',
  pluginDirs: ['./plugins'],
});

await app.run(process.argv.slice(2));
```

### 3.2 五个模板对比表

| 模板名 | 文件数 | 适用场景 | 关键依赖 | 特色 |
|--------|--------|---------|----------|------|
| `base` | 7 | 通用 CLI 起步 | xcli-core + zod | 最精简，无额外依赖 |
| `browser` | 10 | 浏览器自动化 | + playwright | 内置浏览器生命周期管理 |
| `database` | 14 | 数据库管理 | + better-sqlite3/mysql2/pg | 多数据库支持，Worker 隔离 |
| `api` | 13 | API 交互 | + undici | 类 httpie，RESTful 命令 |
| `minimal-plugin` | 3 | 最小插件 | - | 插件开发模板 |

### 3.3 模板选择决策树

- **想做浏览器自动化**（爬虫、测试） → 选 `browser` 模板
- **想做数据库工具**（查询、管理） → 选 `database` 模板
- **想做 API 调试工具**（类似 httpie） → 选 `api` 模板
- **只想写个简单 CLI**（不确定领域） → 选 `base` 模板
- **想给已有 CLI 写插件** → 选 `minimal-plugin` 模板

---

## 第四章：编写你的第一个命令

### 4.1 命令的组成

一个命令由三要素组成：

1. **scope** — 命令所属层级（如 `'page'`、`'database'`、`'endpoint'`）
2. **parameters** — Zod schema 定义的参数
3. **handler** — 异步函数，接收 `(params, ctx)` 返回 `CommandResult`

```typescript
// CommandEntry 完整接口
interface CommandEntry {
  name: string;
  description: string;
  requiresLogin?: boolean;
  scope: CommandScope;           // 命令层级
  override: boolean;
  parameters?: ZodSchema;        // Zod schema
  result?: ZodSchema;
  examples?: Array<{ cmd: string; description: string }>;
  tips?: string[];
  handler: CommandHandler;
}
```

### 4.2 完整示例：添加 hello 命令

在一个 base 项目中添加自定义命令：

```typescript
// src/commands/hello.ts
import { z } from 'zod';
import type { Core } from '@dyyz1993/xcli-core';
import { ok, fail } from '@dyyz1993/xcli-core';

export function registerHelloCommand(app: Core): void {
  // 1. 通过 loader 的 API 创建 Site
  const site = app.loader.getAPI().createSite({
    name: 'hello',
    url: '',
  });

  // 2. 注册命令
  site.command('hello', {
    description: '向某人问好',
    scope: 'action',
    parameters: z.object({
      name: z.string().default('World').describe('目标名称'),
      count: z.number().int().min(1).max(10).default(1).describe('重复次数'),
      excited: z.boolean().default(false).describe('是否激动模式'),
    }),
    handler: async (params, ctx) => {
      // params 已通过 Zod 校验，类型安全
      const greeting = params.excited
        ? `HELLO, ${params.name.toUpperCase()}!!!`
        : `Hello, ${params.name}`;

      const messages = Array(params.count).fill(greeting);

      // ctx 提供运行时上下文
      if (ctx.output.showTips) {
        console.log(`执行目录: ${ctx.cwd}`);
      }

      // 必须用 ok() 或 fail() 包装返回值
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

运行效果：

```bash
$ my-cli hello --name "Alice" --count 3 --excited
```

### 4.3 参数定义（Zod schema）

```typescript
import { z } from 'zod';

// 字符串参数
z.string().describe('用户名')

// 带默认值的字符串
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

// 复杂嵌套对象
z.object({
  host: z.string().describe('主机地址'),
  port: z.number().default(3306).describe('端口号'),
  ssl: z.boolean().default(false).describe('是否启用 SSL'),
}).describe('连接配置')

// 完整参数示例
const params = z.object({
  query: z.string().describe('SQL 查询语句'),
  values: z.array(z.unknown()).optional().describe('参数化查询的值'),
  dryRun: z.boolean().default(false).describe('仅打印不执行'),
});
```

### 4.4 返回值规范

所有命令 handler 必须通过 `ok()` / `fail()` 包装返回值，禁止返回裸对象。

```typescript
import { ok, fail, withMeta } from '@dyyz1993/xcli-core';

// 成功 — 必须包含数据
return ok(data, [
  `查询返回 ${data.length} 行`,       // tips[0]: 数据摘要
  `耗时 ${(end - start)}ms`,          // tips[1]: 补充信息
]);

// 失败 — 必须包含错误信息
return fail('数据库连接超时', [
  '请检查数据库是否启动',
  '当前超时设置: 30s',
]);

// 带元数据 — 添加 duration、command 等信息
const result = ok(data, ['采集到 15 条数据']);
return withMeta(result, {
  duration: 1234,
  command: 'query',
  site: 'hello',
});

// tips 编写规范：
// ✅ 好的 tips: 包含数量 + 关键值
//   "采集到 5 篇文章"
//   "共 12 个表，最大表 users 有 15000 行"
// ❌ 差的 tips: 只有模糊描述
//   "数据已采集"
//   "操作完成"
```

`CommandResult` 接口签名：

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

---

## 第五章：插件开发

### 5.1 插件目录结构

```
.xcli/plugins/<plugin-id>/
├── index.ts          # 插件入口（必须）
├── package.json      # 包配置（必须，至少含 name）
└── README.md         # 说明文档（推荐）
```

命名规范：目录名 `{序号}-{名称}`（如 `01-static`、`32-ecommerce`）或纯名称（如 `baidu`）。

### 5.2 插件入口签名

```typescript
// index.ts — 插件入口，必须是 default export function
import type { XCLIAPI } from '@dyyz1993/xcli-core';
import { z } from 'zod';

export default function (cli: XCLIAPI): void {
  // 创建站点（独立命名空间）
  const site = cli.createSite({
    name: 'my-plugin',
    url: 'https://example.com',
    description: '示例插件',
  });

  // 注册命令
  site.command('scrape', {
    description: '采集数据',
    scope: 'page',
    parameters: z.object({
      selector: z.string().describe('CSS 选择器'),
      limit: z.number().default(10).describe('最大条数'),
    }),
    handler: async (params, ctx) => {
      // 业务逻辑
      return { data: [], count: 0 };
    },
  });

  // 注册登录/登出
  site.login(async (ctx) => {
    // 登录逻辑
  });

  site.logout(async (ctx) => {
    // 登出逻辑
  });

  // 生命周期钩子
  cli.onLoad(async () => {
    console.log('插件加载完成');
  });

  cli.onUnload(async () => {
    console.log('插件卸载');
  });

  // 事件监听
  cli.onEvent('data:updated', (event) => {
    console.log(`收到事件: ${event.type}`);
  });
}
```

### 5.3 插件加载机制

插件通过 jiti 运行时编译加载，无需预编译 TypeScript：

```typescript
// PluginLoader 内部实现（简化）
async loadPlugin(pluginPath: string, explicitId?: string): Promise<PluginInstance> {
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    alias: { [packageName]: coreEntryPath },
  });

  // .ts 文件走 jiti 编译，其他走原生 import
  const plugin = extname(importPath) === '.ts'
    ? await jiti.import(importPath)
    : await import(`file://${importPath}`);

  const setup = plugin?.default ?? plugin;
  if (typeof setup === 'function') {
    setup(this.api);  // 注入 XCLIAPI
  }
}
```

**加载顺序（优先级从高到低）：**
1. `./.xcli/plugins/` — 当前目录（项目级）
2. `../.xcli/plugins/` — 父目录
3. `~/.xcli/plugins/` — 全局用户目录

同名插件规则：本地优先于全局，后加载覆盖先加载。

### 5.4 插件安装器

框架提供 5 种安装方式，通过 `PluginInstaller` 接口统一抽象：

```typescript
type PluginInstallerType = 'local' | 'npm' | 'git' | 'url' | 'builtin';

interface PluginInstaller {
  readonly type: PluginInstallerType;
  install(source: string, options?: InstallOptions): Promise<PluginInstance>;
  uninstall(pluginId: string): Promise<void>;
  update(pluginId: string): Promise<PluginInstance>;
  list(): Promise<PluginInstance[]>;
}
```

| 类型 | 说明 | source 示例 |
|------|------|-------------|
| `local` | 本地路径 | `./plugins/my-plugin` |
| `npm` | npm 包 | `@scope/xcli-plugin-foo` |
| `git` | Git 仓库 | `https://github.com/user/plugin.git` |
| `url` | 远程 URL | `https://example.com/plugin.tar.gz` |
| `builtin` | 内置插件 | 框架自带 |

### 5.5 插件隔离原则

**命名空间隔离：** 每个插件通过 `createSite()` 创建独立命名空间，命令注册在各自的 Site 下。

**事件通信：** 插件之间通过事件系统通信，禁止直接 import。

```typescript
// 插件 A — 发送事件
cli.onEvent('user:login', (event) => {
  console.log('用户已登录:', event.args);
});

// 插件 B — 通过框架广播事件
await pluginLoader.emitEvent('user:login', {
  type: 'user:login',
  cwd: process.cwd(),
  args: { userId: '123' },
});
```

**存储隔离：** 每个插件有独立的 `PluginStorage`，基于文件系统持久化。

**禁止事项：**
- 插件之间不得直接 import
- handler 不得直接访问全局状态（使用 `ctx.storage`）
- 禁止在 handler 中 throw Error（用 `fail()`）

---

## 第六章：进阶 — 自定义领域 CLI

### 6.1 扩展路线图

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

### 6.2 实战：创建数据库 CLI

database 模板展示了一个完整领域 CLI 的结构：

```
my-db-cli/
├── bin/cli.ts           # 入口
├── src/
│   ├── index.ts         # createApp()
│   ├── version.ts       # 版本号
│   ├── types.ts         # 类型定义 (DatabaseConfig, QueryResult...)
│   ├── connection.ts    # 连接管理 (SQLite/MySQL/PostgreSQL)
│   ├── context.ts       # 扩展 CommandContext
│   ├── scope.ts         # 自定义 scope 层级
│   ├── worker.ts        # WorkerEntryPoint 实现
│   └── commands/
│       ├── query.ts     # SQL 查询命令
│       ├── tables.ts    # 列表命令
│       ├── describe.ts  # 表结构命令
│       ├── insert.ts    # 插入命令
│       └── index.ts     # 命令注册汇总
```

关键 — 自定义 scope 层级：

```typescript
// src/scope.ts
export const DATABASE_SCOPE_ORDER: Record<string, number> = {
  project: 0,    // 项目级
  database: 1,   // 数据库级
  table: 2,      // 表级
  row: 3,        // 行级
};
```

关键 — WorkerEntryPoint 实现：

```typescript
// src/worker.ts
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

### 6.3 实战：创建 API CLI

api 模板的结构类似，但领域不同：

```
my-api-cli/
├── src/
│   ├── scope.ts         # API_SCOPE_ORDER: project → endpoint → method → param
│   ├── worker.ts        # APIWorker: init→配置, execute→HTTP请求, destroy→空
│   └── commands/
│       ├── get.ts       # GET 请求命令
│       ├── post.ts      # POST 请求命令
│       ├── put.ts       # PUT 请求命令
│       └── delete.ts    # DELETE 请求命令
```

API Worker 使用 undici 发送请求：

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

### 6.4 自定义 Worker

实现 `WorkerEntryPoint` 接口的三个方法：

```typescript
import type { WorkerEntryPoint, WorkerContext } from '@dyyz1993/xcli-core';

export class MyWorker implements WorkerEntryPoint {
  private ctx!: WorkerContext;

  // 1. 初始化 — 建立连接、加载配置
  async init(ctx: WorkerContext): Promise<void> {
    this.ctx = ctx;
    // 从 ctx.config 读取配置
    // 从 ctx.sessionId 获取会话标识
    // 通过 ctx.ipc.send() 通知主进程
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

### 6.5 自定义 Scope 层级

通过 `ScopeDefinition` 接口定义自己的层级体系：

```typescript
import type { ScopeDefinition } from '@dyyz1993/xcli-core';

// 定义领域专属层级
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
  scope: 'product',  // 对应层级
  parameters: z.object({ category: z.string() }),
  handler: async (params) => { /* ... */ },
});
```

---

## 第七章：Daemon 进程架构

### 7.1 为什么需要 Daemon

Daemon 进程解决三个核心问题：

1. **常驻进程**：避免每次命令执行都要启动/关闭浏览器或数据库连接
2. **Worker 池**：管理多个 Worker 实例，隔离资源
3. **命令队列化**：串行化对共享资源（如浏览器页面）的访问

```typescript
// DaemonConfig 配置
interface DaemonConfig {
  configDir: string;         // 配置目录
  workerEntryPath: string;   // Worker 入口文件路径
  maxWorkers?: number;       // 最大 Worker 数（默认 10）
  heartbeatInterval?: number; // 心跳间隔 ms（默认 10000）
  requestTimeout?: number;   // 请求超时 ms（默认 30000）
  basePort?: number;         // 基础端口号（默认 8054）
}
```

### 7.2 进程模型

```
┌──────────────────────────────────────────┐
│            Daemon (主进程)                 │
│                                          │
│  ┌──────────┐  ┌──────────────────────┐  │
│  │ HTTP RPC │  │   WebSocket Server   │  │
│  │ :8054    │  │   (事件推送)          │  │
│  └─────┬────┘  └──────────┬───────────┘  │
│        │                  │               │
│  ┌─────┴──────────────────┴───────────┐  │
│  │         WorkerManager              │  │
│  │  ┌─────────┐ ┌─────────┐          │  │
│  │  │Worker 1 │ │Worker 2 │  ...     │  │
│  │  │(子进程)  │ │(子进程)  │          │  │
│  │  └─────────┘ └─────────┘          │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Daemon 通过 `child_process.fork()` 创建 Worker 子进程，Worker 间完全隔离。

### 7.3 HTTP RPC 与 WebSocket

**HTTP RPC**：同步请求-响应模式，用于执行命令。

```typescript
// Daemon 端注册 RPC handler
import { startHttpServer, type RPCHandler } from '@dyyz1993/xcli-core';

const handlers: RPCHandler[] = [
  {
    method: 'execute',
    handle: async (params) => {
      return worker.execute(params.method, params.params);
    },
  },
];

await startHttpServer({ port: 8054, handlers });
```

**WebSocket**：异步事件推送，用于状态变更通知。

```typescript
// 客户端订阅事件
import { WSClient } from '@dyyz1993/xcli-core';

const client = new WSClient({ url: 'ws://localhost:8054' });
client.onMessage((msg) => {
  console.log('收到事件:', msg);
});
client.onEvent('database:ready', (data) => {
  console.log('数据库就绪:', data);
});
```

---

## 第八章：踩坑与最佳实践

### 8.1 常见陷阱

#### CoreConfig 必填字段

`name`、`version`、`description`、`configDirName`、`envPrefix`、`pluginDirs` 全部必填，缺一不可。`configDirName` 决定了配置文件存储路径（`~/.configDirName/`），`envPrefix` 决定了环境变量前缀。

#### tsup 输出路径与 bin 路径匹配

`package.json` 中 `bin` 字段指向的路径必须与 tsup 配置的输出路径一致：

```json
// package.json
{
  "bin": { "my-cli": "dist/bin/cli.js" }
}
```

```typescript
// tsup.config.ts
export default defineConfig([
  { entry: ['bin/cli.ts'], format: ['esm'] },  // 输出 dist/bin/cli.js
]);
```

#### 类型断言的正确方式

在 `page.evaluate()` 内部只能使用标准 DOM API，禁止使用 Playwright 选择器语法：

```typescript
// ✅ 正确：evaluate 内用标准 DOM API
const data = await ctx.page.evaluate(() => {
  const el = document.getElementById('case-data') as HTMLScriptElement;
  return JSON.parse(el.textContent || '{}');
});

// ❌ 错误：evaluate 内使用 Playwright 选择器
const data = await ctx.page.evaluate(() => {
  document.querySelector(':has-text("hello")'); // 不支持！
});
```

#### 插件 dependencies 声明

插件的依赖**必须**在插件自己的 `package.json` 中声明，不能依赖宿主项目的 `node_modules`：

```json
// .xcli/plugins/my-plugin/package.json
{
  "name": "my-plugin",
  "dependencies": {
    "zod": "^3.24.0"
  }
}
```

#### CommandContext.storage 是按插件隔离的

每个插件的 `ctx.storage` 是独立的，不会与其他插件冲突：

```typescript
handler: async (params, ctx) => {
  await ctx.storage.set('lastQuery', params.sql);
  const last = await ctx.storage.get<string>('lastQuery');
}
```

### 8.2 调试技巧

#### 日志配置

设置环境变量启用调试日志：

```bash
# 启用框架级调试
export MY_CLI_DEBUG=1

# 查看 Daemon 状态
node dist/bin/cli.js daemon:status
```

#### 插件加载排查

```typescript
// 检查插件状态
const plugins = core.loader.getLoadedPlugins();
for (const p of plugins) {
  console.log(`${p.id}: ${p.status}`);  // loaded | unloaded | error
  if (p.error) {
    console.error('  错误:', p.error.message);
  }
}
```

#### Daemon 状态检查

```typescript
import { getDaemonStatus, isDaemonRunning } from '@dyyz1993/xcli-core';

const running = await isDaemonRunning({ configDir: '/path/to/config' });
const status = await getDaemonStatus({ configDir: '/path/to/config' });
// status: { pid, port, startedAt, workers: [...] }
```

#### Worker 通信调试

在 Worker 的 `init()` 方法中通过 IPC 发送调试信息：

```typescript
async init(ctx: WorkerContext): Promise<void> {
  ctx.ipc.send('debug', { step: 'init-start', config: ctx.config });
  // ... 初始化逻辑
  ctx.ipc.send('debug', { step: 'init-done' });
}
```

---

## 附录

### A. CommandContext 完整接口

```typescript
interface CommandContext {
  args: string[];                         // 位置参数
  options: Record<string, unknown>;       // 命名选项
  cwd: string;                           // 当前工作目录
  storage: StorageContext;               // 插件隔离存储
  output: OutputContext;                 // 输出配置
  error: (msg: string) => void;          // 错误输出
  config: Record<string, unknown>;       // 运行时配置
  site: SiteInstance;                    // 所属站点
  cliName: string;                       // CLI 名称
}

interface StorageContext {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

interface OutputContext {
  mode: 'text' | 'json' | 'yaml';
  showTips: boolean;
  color: boolean;
  emoji: boolean;
}
```

### B. SiteInstance 常用方法

```typescript
interface SiteInstance {
  name: string;
  url: string;
  config: SiteConfig;

  // 注册命令（链式调用）
  command<P, R>(name: string, config: { ... }): SiteInstance;

  // 登录/登出
  login(handler: (ctx: CommandContext) => Promise<void>): SiteInstance;
  logout(handler: (ctx: CommandContext) => Promise<void>): SiteInstance;

  // 状态查询
  isLoggedIn(): Promise<boolean>;
  requireLogin(): Promise<void>;
  getStorage(): StorageContext;
  getAllCommands(): Array<{ name: string; description: string; scope: CommandScope }>;
  getCommand(name: string): CommandEntry | null;
}
```

### C. 公共 API 导出速查

| 导出 | 来源 | 用途 |
|------|------|------|
| `Core`, `CoreConfig` | `core.ts` | CLI 入口 |
| `PluginLoader` | `plugin-loader.ts` | 插件管理 |
| `XCLIAPI`, `SiteInstance` | `plugin-protocol.ts` | 插件协议 |
| `ok`, `fail`, `withMeta` | `command-result.ts` | 返回值包装 |
| `WorkerEntryPoint`, `DaemonConfig` | `worker-protocol.ts` | 进程管理 |
| `SessionManager` | `session-manager.ts` | 会话管理 |
| `ScaffoldEngine` | `scaffold-engine.ts` | 脚手架 |
| `ScopeDefinition` | `scope.ts` | 层级定义 |
| `CommandError` | `plugin-protocol.ts` | 错误类型 |
| `isDaemonRunning`, `startDaemon`, `stopDaemon` | `daemon-manager.ts` | Daemon 控制 |
