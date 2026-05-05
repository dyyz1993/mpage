# xcli 架构重构设计文档

> **状态**: Draft  
> **日期**: 2026-05-05  
> **范围**: mpage 仓库 + xcli-framework 新仓库

---

## 1. 背景与问题

### 1.1 现状描述

当前 mpage 仓库承担了过多职责，导致架构边界模糊、复用困难、维护成本高。具体表现为：

**职责混乱**

```
mpage (@dyyz1993/xpage)
├── src/              → 浏览器自动化引擎 API
├── bin/mpage.ts      → CLI 入口（引擎库里混入了 CLI 逻辑）
├── packages/
│   ├── core/         → 插件系统、命令系统
│   ├── browser/      → 浏览器命令集
│   ├── daemon/       → 后台进程管理
│   ├── session/      → 会话管理
│   ├── tips/         → 输出提示
│   ├── xcli/         → CLI 聚合入口
│   └── ghcli/        → 废弃的 GitHub CLI
├── xcli/             → gitignored 的独立 xcli 副本
└── .xcli/plugins/    → 63 个本地插件
```

**核心矛盾**

| 问题 | 影响 |
|------|------|
| mpage 既是引擎库又提供 CLI | 引擎用户被迫引入 CLI 相关依赖 |
| xcli 代码散布在三处 | packages/、xcli/、.xcli/plugins/ 职责交叉，修改需要同步三处 |
| 框架与浏览器领域耦合 | CommandContext 直接持有 `page: unknown`，无法用于非浏览器场景 |
| 插件安装方式单一 | 仅支持本地目录，缺少 npm/git/url/builtin |
| 无脚手架工具 | 新建 CLI 应用需要手动复制模板 |
| Session/Daemon 与浏览器绑定 | 会话隔离是通用能力，不应局限在浏览器域 |

### 1.2 根因分析

```
                    ┌─────────────────────────┐
                    │   所有能力耦合在一起      │
                    │   (引擎 + 框架 + 应用)   │
                    └──────────┬──────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     引擎无法独立使用    框架无法复用      应用扩展受限
     (CLI 污染)         (浏览器绑定)     (安装方式单一)
```

## 2. 目标架构：三层分离

### 2.1 总体架构

```
┌─────────────────────────────────────────────────────┐
│              Layer 3: Domain Applications            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ xcli-browser │  │ xcli-database│  │ xcli-api  │  │
│  │ (浏览器域)   │  │ (数据库域)   │  │ (API 域)  │  │
│  └──────┬───────┘  └──────────────┘  └───────────┘  │
│         │ depends on                                  │
├─────────┼───────────────────────────────────────────┤
│         ▼         Layer 2: CLI Framework             │
│  ┌──────────────────────────────────────────────┐   │
│  │              @xcli/core                       │   │
│  │  Plugin | Command | Session | Daemon | Scope  │   │
│  │  Scaffold | Config | Output | Worker Protocol │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│              Layer 1: Engine                         │
│  ┌──────────────────────────────────────────────┐   │
│  │          mpage (@dyyz1993/xpage)              │   │
│  │     纯浏览器自动化引擎，无 CLI、无插件       │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 2.2 各层职责

**Layer 1: 引擎层 — mpage**

- 纯浏览器自动化 API（CDP 连接、录制/回放、页面结构提取、命令执行）
- 不包含任何 CLI 逻辑、插件系统、Daemon 能力
- 作为 npm 包 `@dyyz1993/xpage` 发布
- 可被任意 Node.js 项目独立使用

**Layer 2: 框架层 — @xcli/core（新仓库：xcli-framework）**

领域无关的 CLI 框架，提供以下能力：

| 模块 | 职责 |
|------|------|
| Plugin System | 5 种安装方式（local/npm/git/url/builtin）+ 生命周期 |
| Command System | 注册、路由、上下文、结果（ok/fail） |
| Scope System | 可扩展的命令作用域定义 |
| Session Management | 隔离、生命周期、归档 |
| Daemon Management | 后台进程、HTTP-RPC、Worker 管理 |
| Worker Pool | 1 session : 1 worker，命令队列，心跳，崩溃恢复 |
| Worker Protocol | `WorkerEntryPoint` 抽象接口 |
| Scaffold Engine | 模板引擎 + `create-xcli` 工具 |
| Output | 格式化输出 + tips 引擎 |
| Config | `.clirc` 配置管理 |

**Layer 3: 应用层 — 领域应用**

- xcli-browser：浏览器域 CLI 应用
- 未来可扩展：xcli-database、xcli-api 等
- 每个应用定义自己的 Worker、CommandContext 扩展、Scope 层级、内置插件

## 3. 仓库组织

### 3.1 仓库划分

```
Repo A: xcli-framework (新仓库，独立)
├── packages/
│   ├── core/           → @xcli/core (发布到 npm)
│   └── create-xcli/    → create-xcli 脚手架工具
├── docs/
└── README.md

Repo B: mpage (当前仓库，重构)
├── packages/
│   ├── mpage/                → @dyyz1993/xpage (引擎)
│   ├── xcli-browser/         → 浏览器域 CLI 应用
│   └── xcli-browser-plugins/ → 内置浏览器插件集
├── docs/
├── recordings/
└── README.md
```

### 3.2 依赖关系

```
Repo A (xcli-framework)          Repo B (mpage)
─────────────────────            ─────────────
@xcli/core                       @dyyz1993/xpage
  ├── zod                          ├── playwright
  ├── jiti                         ├── zod
  └── → npm publish                └── yaml

create-xcli                      xcli-browser
  └── @xcli/core                   ├── @xcli/core (npm)
                                   └── @dyyz1993/xpage (workspace)

                                  xcli-browser-plugins
                                   └── @xcli/core (npm)
```

**关键约束**：
- mpage 不依赖 xcli-framework
- xcli-framework 不依赖 mpage
- xcli-browser 同时依赖两者（框架 npm + 引擎 workspace）
- xcli-browser-plugins 仅依赖 @xcli/core 的类型定义

## 4. 核心抽象

### 4.1 WorkerEntryPoint

Worker 是领域无关的执行单元。每个域应用实现自己的 Worker。

```typescript
interface WorkerEntryPoint {
  init(ctx: WorkerContext): Promise<void>;
  execute(method: string, params: Record<string, unknown>): Promise<unknown>;
  destroy(): Promise<void>;
}

interface WorkerContext {
  sessionId: string;
  workerId: string;
  ipcPort: MessagePort;
  config: Record<string, unknown>;
  logger: Logger;
}
```

### 4.2 CommandContext（领域无关）

基础 CommandContext 不包含任何领域特定字段：

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
  sessionId?: string;
}
```

浏览器域扩展：

```typescript
interface BrowserCommandContext extends CommandContext {
  page: Page;
  browser: Browser;
  recorder: Recorder;
  scope: BrowserScope;
}
```

### 4.3 Plugin Installer（5 种安装方式）

```typescript
type PluginInstallerType = 'local' | 'npm' | 'git' | 'url' | 'builtin';

interface PluginInstaller {
  type: PluginInstallerType;
  install(source: string, options?: InstallOptions): Promise<PluginInstance>;
  uninstall(pluginId: string): Promise<void>;
  update(pluginId: string): Promise<PluginInstance>;
  list(): Promise<PluginInstance[]>;
}

interface InstallOptions {
  version?: string;
  registry?: string;
  branch?: string;
  force?: boolean;
}
```

**安装方式说明**：

| 方式 | source 示例 | 场景 |
|------|-------------|------|
| local | `./plugins/my-plugin` | 开发调试、团队私有插件 |
| npm | `@scope/xcli-plugin-name` | 社区共享、版本管理 |
| git | `https://github.com/user/plugin.git` | 开源插件、分支/PR 测试 |
| url | `https://example.com/plugin.tgz` | 私有托管、临时安装 |
| builtin | `browser` | 框架/应用内置插件 |

### 4.4 Scope System

```typescript
interface ScopeDefinition {
  name: string;
  levels: string[];
  resolve(currentScope: string, commandName: string): string;
}
```

浏览器域 Scope 示例：

```
project > browser > page > element

resolve("page", "click") → "element"   // click 需要元素级上下文
resolve("page", "navigate") → "page"   // navigate 在页面级即可
resolve("project", "launch") → "browser" // launch 创建浏览器实例
```

### 4.5 Command Result

```typescript
type CommandResult<T = unknown> =
  | { ok: true; data: T; tips?: Tip[] }
  | { ok: false; error: string; code?: string };

function ok<T>(data: T, tips?: Tip[]): CommandResult<T>;
function fail(error: string, code?: string): CommandResult<never>;
```

## 5. Session / Daemon 架构

### 5.1 进程模型

```
┌───────────────────────────────────────────────────┐
│                  Daemon Process                    │
│  ┌─────────────────────────────────────────────┐  │
│  │            Session Manager                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ Session  │ │ Session  │ │ Session  │    │  │
│  │  │   s1     │ │   s2     │ │   s3     │    │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘    │  │
│  └───────┼─────────────┼────────────┼──────────┘  │
│          │ fork        │ fork       │ fork        │
│  ┌───────▼─────┐ ┌────▼──────┐ ┌───▼──────────┐  │
│  │ Worker Proc │ │Worker Proc│ │ Worker Proc  │  │
│  │BrowserWorker│ │BrowserWork│ │DatabaseWorker│  │
│  └─────────────┘ └───────────┘ └──────────────┘  │
│                                                   │
│  ┌─────────────┐  ┌──────────────┐               │
│  │ HTTP Server │  │  Heartbeat   │               │
│  │ (JSON-RPC)  │  │  Monitor     │               │
│  └──────┬──────┘  └──────────────┘               │
└─────────┼─────────────────────────────────────────┘
          │ HTTP
  ┌───────▼───────┐
  │  CLI Client   │
  └───────────────┘
```

### 5.2 通信协议

**Client ↔ Daemon**: HTTP JSON-RPC

```json
{
  "jsonrpc": "2.0",
  "method": "session.execute",
  "params": { "sessionId": "s1", "command": "navigate", "args": { "url": "https://example.com" } },
  "id": 1
}
```

**Daemon ↔ Worker**: Node.js IPC (fork)

```typescript
type DaemonToWorker =
  | { type: 'init'; ctx: WorkerContext }
  | { type: 'execute'; method: string; params: Record<string, unknown>; requestId: string }
  | { type: 'destroy' };

type WorkerToDaemon =
  | { type: 'ready' }
  | { type: 'result'; requestId: string; data: unknown }
  | { type: 'error'; requestId: string; error: string }
  | { type: 'heartbeat'; status: WorkerStatus };
```

### 5.3 Daemon 是可选的

```
简单 CLI（无 Daemon）          完整 CLI（有 Daemon）
┌─────────────┐               ┌─────────────┐
│  CLI Entry  │               │  CLI Client  │
│      │      │               │      │ HTTP  │
│  In-process │               │  ┌──▼──────┐│
│  Execution  │               │  │ Daemon  ││
│             │               │  │  │ fork ││
└─────────────┘               │  │ Worker ││
                              │  └────────┘│
                              └─────────────┘
```

- 简单场景：命令直接在主进程中执行，无需 Daemon
- 完整场景：Daemon 管理长生命周期 Worker（如浏览器实例），支持多会话并发

### 5.4 关键机制

| 机制 | 说明 |
|------|------|
| 命令队列 | 每个 Session 内命令串行执行，跨 Session 并行 |
| 心跳检测 | Daemon 每 5s 检查 Worker 心跳，超时 15s 触发重启 |
| 崩溃恢复 | Worker 崩溃后自动重启，恢复 Session 上下文 |
| 会话归档 | Session 结束后归档执行日志，支持审计回溯 |

## 6. @xcli/core 包结构

```
@xcli/core/
├── src/
│   ├── plugin/
│   │   ├── plugin-loader.ts         # 插件加载（jiti TS 编译）
│   │   ├── plugin-installer.ts      # 5 种安装器实现
│   │   ├── plugin-storage.ts        # 插件元数据持久化
│   │   └── plugin-resolver.ts       # 插件解析 + 冲突处理
│   ├── command/
│   │   ├── command-registry.ts      # 命令注册表
│   │   ├── command-router.ts        # 命令路由 + Scope 解析
│   │   ├── command-context.ts       # CommandContext 定义
│   │   ├── command-result.ts        # ok() / fail() 结果封装
│   │   └── scope.ts                 # Scope 系统核心
│   ├── session/
│   │   ├── session-manager.ts       # 会话生命周期管理
│   │   ├── session-store.ts         # 会话状态存储
│   │   ├── session-archive.ts       # 会话归档
│   │   └── session-client.ts        # 客户端会话代理
│   ├── daemon/
│   │   ├── daemon-manager.ts        # Daemon 启停 + 进程管理
│   │   ├── worker-manager.ts        # Worker 创建/销毁/重启
│   │   ├── http-server.ts           # JSON-RPC HTTP 服务
│   │   ├── ipc-types.ts             # IPC 消息类型定义
│   │   └── worker-protocol.ts       # WorkerEntryPoint 接口
│   ├── scaffold/
│   │   ├── scaffold-engine.ts       # 模板渲染引擎
│   │   └── templates/               # 内置模板
│   │       ├── browser/             # 浏览器域模板
│   │       ├── database/            # 数据库域模板
│   │       └── api/                 # API 域模板
│   ├── output/
│   │   ├── output-formatter.ts      # 输出格式化（table/json/pretty）
│   │   └── tips-engine.ts           # Tips 提示引擎
│   ├── config/
│   │   └── rc-config.ts             # .clirc 配置管理
│   ├── protocol/
│   │   └── types.ts                 # 公共协议类型
│   └── index.ts                     # 统一导出
├── package.json
├── tsconfig.json
└── README.md
```

## 7. xcli-browser 应用结构

```
xcli-browser/
├── src/
│   ├── browser-worker.ts            # implements WorkerEntryPoint
│   ├── browser-context.ts           # BrowserCommandContext
│   ├── commands/                    # 31 个浏览器命令
│   │   ├── navigate.ts
│   │   ├── click.ts
│   │   ├── type.ts
│   │   ├── screenshot.ts
│   │   ├── snapshot.ts
│   │   └── ...
│   ├── scopes/
│   │   └── browser-scope.ts         # project > browser > page > element
│   ├── recorder/                    # 录制/回放
│   │   ├── recorder.ts
│   │   └── event-capture.ts
│   └── index.ts                     # CLI 入口
├── package.json
└── tsconfig.json
```

## 8. 迁移阶段

### Phase 1: 清理（低风险，1-2 天）

```
删除:
  xcli/                    → gitignored 的独立目录，直接删除
  packages/ghcli/          → 废弃的 GitHub CLI，直接删除

修改:
  bin/mpage.ts             → 仅保留引擎 API 导出，移除 CLI 逻辑
  src/                     → 清理所有 CLI 相关 import
```

**验证标准**：
- `npm run build` 通过
- `@dyyz1993/xpage` 导出仅为浏览器引擎 API
- `bin/mpage.ts` 不再存在或变为纯 API demo

### Phase 2: 抽取 @xcli/core（新仓库，5-7 天）

```
新建: xcli-framework 仓库
迁移: packages/core/ → plugin + command 系统
迁移: packages/daemon/ → daemon 系统
迁移: packages/session/ → session 系统
新建: WorkerEntryPoint 协议
新建: 5 种 PluginInstaller
新建: Scope 系统
新建: Scaffold 引擎
发布: @xcli/core 到 npm
```

**验证标准**：
- `@xcli/core` 可通过 `npm install @xcli/core` 安装
- 不依赖 playwright、不依赖 mpage
- 所有类型导出正确

### Phase 3: 重构 mpage 仓库（3-5 天）

```
新建: packages/mpage/           ← 从 root src/ 迁移引擎代码
新建: packages/xcli-browser/    ← 从 packages/browser/ + daemon/ + session/ 聚合
新建: packages/xcli-browser-plugins/ ← 从 .xcli/plugins/ 提取内置插件
删除: 旧 packages/core/, browser/, daemon/, session/, tips/, xcli/
删除: root bin/ CLI 入口
```

**验证标准**：
- `@dyyz1993/xpage` 作为 workspace package 可正常 build
- xcli-browser 可启动并执行浏览器命令
- 插件加载正常（local 方式）

### Phase 4: 功能补全（5-7 天）

```
新增: Scope override 机制
新增: plugin install/uninstall/update/list 命令
新增: Scaffold 模板（browser, database, api）
新增: create-xcli 工具
新增: 迁移文档
```

**验证标准**：
- `npx create-xcli` 可创建新的 CLI 应用
- `xcli plugin install @scope/plugin-name` 可从 npm 安装插件
- 所有 4 个迁移阶段完成后，旧代码完全清理

### 迁移时间线

```
Week 1: Phase 1 (清理) + Phase 2 启动
Week 2: Phase 2 完成 + Phase 3 启动
Week 3: Phase 3 完成 + Phase 4 启动
Week 4: Phase 4 完成 + 文档 + 测试
```

## 9. 并发模型

```
                    Daemon Process
                         │
           ┌─────────────┼─────────────┐
           │             │             │
    Session Manager  HTTP Server  Heartbeat Monitor
    ┌─────┼─────┐     (JSON-RPC)    (5s interval)
    │     │     │
   s1    s2    s3
    │     │     │
    ▼     ▼     ▼
  ┌───┐ ┌───┐ ┌───┐
  │ W1│ │ W2│ │ W3│    Worker Processes (fork)
  │ BW│ │ BW│ │ DW│    BW=BrowserWorker, DW=DatabaseWorker
  └───┘ └───┘ └───┘

  Per-Session Command Queue:
  ┌──────────────────────────────────────────┐
  │ s1: [cmd1] → [cmd2] → [cmd3] (串行)    │
  │ s2: [cmd1] → [cmd2] (串行)              │
  │ s3: [cmd1] (串行)                        │
  │                                          │
  │ s1/s2/s3 之间并行执行                    │
  └──────────────────────────────────────────┘
```

**并发规则**：
- 同一 Session 内命令严格串行（避免页面状态竞争）
- 不同 Session 之间完全并行
- Worker 数量上限可配置（默认 3）
- 命令超时默认 30s，可通过 command 定义覆盖

## 10. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 插件迁移不兼容 | 63 个插件需逐个验证 | Phase 3 保留 local 安装方式，渐进迁移 |
| Worker IPC 性能 | 频繁序列化/反序列化 | 批量命令合并、SharedArrayBuffer 探索 |
| @xcli/core 包体积 | 影响安装速度 | 按模块拆分 optional dependencies |
| jiti 运行时编译慢 | 插件加载延迟 | 首次编译缓存，后续直接加载 |
| 多仓库协作成本 | PR 需跨仓库 | 使用 workspace:* 协议 + changeset 管理 |

## 11. 成功指标

- [ ] `@dyyz1993/xpage` 不包含任何 CLI 代码，纯引擎 API
- [ ] `@xcli/core` 独立发布，不依赖 playwright
- [ ] xcli-browser 通过 `@xcli/core` + `@dyyz1993/xpage` 组合构建
- [ ] 支持 5 种插件安装方式
- [ ] `npx create-xcli` 可创建新的领域 CLI 应用
- [ ] 所有 63 个内置插件迁移完成且功能正常
- [ ] 旧代码 100% 清理，无遗留文件
