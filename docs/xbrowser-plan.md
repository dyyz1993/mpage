# xbrowser 实现计划

## 1. 项目概览

| 属性 | 值 |
|------|------|
| 项目名称 | xbrowser |
| npm 包名 | `xbrowser` |
| CLI 命令 | `xbrowser` |
| 定位 | 浏览器自动化 CLI 工具 |
| 框架 | @xcli/core (CLI 框架) |
| 引擎 | @dyyz1993/xpage (浏览器自动化引擎) |
| 来源 | 合并 mpage + xcli-browser 的功能 |

### 核心原则

- **先核心后扩展**: 先实现核心骨架和基础命令，再添加高级功能
- **单一仓库**: xbrowser 是独立的新仓库，不依赖 mpage 仓库
- **清晰的分层**: CLI 层 → Session 客户端 → Daemon Worker → mpage 引擎

### 依赖关系

```
xbrowser
├── @xcli/core        (CLI 框架: Core, Daemon, Session, Plugin, ArgParser)
├── @dyyz1993/xpage   (浏览器引擎: executePageCommand, RecorderController, PlaybackEngine)
├── playwright         (浏览器驱动)
├── zod               (参数验证)
└── yaml              (录制文件序列化)
```

---

## 2. 仓库结构

```
xbrowser/
├── bin/
│   └── xbrowser.ts              # CLI 入口 (#!/usr/bin/env node)
├── src/
│   ├── index.ts                 # 公共 API 导出
│   ├── worker.ts                # BrowserWorker (实现 WorkerEntryPoint)
│   ├── context.ts               # BrowserCommandContext 定义
│   ├── scope.ts                 # 浏览器 Scope 层级定义
│   ├── session/
│   │   └── session-client.ts    # Daemon RPC 客户端
│   ├── commands/                # 浏览器命令 (插件可调用)
│   │   ├── navigation.ts        # goto, back, forward, refresh
│   │   ├── interaction.ts       # click, fill, type, press, select, check, hover, dblclick
│   │   ├── query.ts             # html, text, title, url, getProperty, query, find
│   │   ├── wait.ts              # waitForSelector, waitForTimeout
│   │   ├── scroll.ts            # scroll (方向 + 坐标)
│   │   ├── mouse.ts             # mouse (move/down/up/click/dblclick)
│   │   ├── evaluate.ts          # eval, evaluate (JS 执行)
│   │   ├── storage.ts           # getCookies, setCookie, clearCookies, getLocalStorage, setLocalStorage, clearLocalStorage
│   │   ├── snapshot.ts          # screenshot, snapshot, a11y
│   │   ├── structure.ts         # DOM 结构提取 (layout/a11y)
│   │   ├── frame.ts             # frames, frame (iframe 管理)
│   │   ├── viewport.ts          # setViewport
│   │   └── index.ts             # 统一注册和导出
│   ├── builtins/                # 内建 CLI 命令
│   │   ├── session-cmds.ts      # session open/close/list/kill
│   │   ├── config.ts            # config get/set/list/guard
│   │   ├── info.ts              # 系统信息 + 插件详情
│   │   ├── viewer.ts            # 实时查看器 URL
│   │   ├── plugin.ts            # plugin install/uninstall/list
│   │   ├── scaffold.ts          # create (脚手架)
│   │   └── index.ts
│   ├── recorder/                # 录制/回放 (从 mpage 迁移)
│   │   ├── controller.ts        # RecorderController
│   │   ├── controller-events.ts # 事件监听
│   │   ├── controller-tab-tracking.ts # 多 tab 追踪
│   │   ├── controller-persistence.ts  # 持久化
│   │   ├── player.ts            # PlaybackEngine
│   │   ├── inject.ts            # 注入脚本
│   │   ├── types.ts             # 录制类型定义
│   │   └── index.ts
│   ├── cli/                     # CLI 路由层
│   │   ├── router.ts            # 主命令分发
│   │   ├── session-handlers.ts  # session 子命令处理
│   │   ├── plugin-handlers.ts   # plugin 子命令处理
│   │   ├── browser-handlers.ts  # 快捷命令 (goto/click/fill)
│   │   ├── builtin-handlers.ts  # config/create/init/daemon
│   │   ├── help-handlers.ts     # 帮助信息
│   │   ├── plugin-command.ts    # 插件命令分发
│   │   ├── output.ts            # 输出格式化
│   │   └── index.ts
│   └── extractors/              # DOM 分析提取器
│       ├── layout.ts            # 布局结构提取
│       ├── layout-helpers.ts    # 辅助函数
│       ├── layout-formatters.ts # 格式化
│       ├── a11y.ts              # 无障碍树
│       ├── structure-extractor.ts # 结构提取器
│       ├── structure-selector.ts  # 选择器生成
│       ├── types.ts
│       └── index.ts
├── .xcli/
│   └── plugins/                 # 插件目录 (示例)
├── tests/
│   ├── unit/                    # 单元测试
│   ├── integration/             # 集成测试
│   └── e2e/                     # E2E 测试
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .eslintrc.cjs
├── .prettierrc
└── README.md
```

---

## 3. 分阶段实现计划

### Milestone 1: 核心骨架 (1-2 天)

**目标**: CLI 能启动、能创建 session、能执行基本浏览器命令

| # | 任务 | 对应文件 | 优先级 | 预计工时 |
|---|------|----------|--------|----------|
| 1.1 | 初始化仓库 + tsconfig + tsup | package.json, tsconfig.json | P0 | 0.5h |
| 1.2 | 实现 BrowserWorker | src/worker.ts | P0 | 2h |
| 1.3 | 实现 BrowserCommandContext | src/context.ts | P0 | 0.5h |
| 1.4 | 实现 Scope 定义 | src/scope.ts | P0 | 0.5h |
| 1.5 | 实现 Session 客户端 | src/session/session-client.ts | P0 | 1.5h |
| 1.6 | 实现 4 个导航命令 | src/commands/navigation.ts | P0 | 1h |
| 1.7 | 实现 8 个交互命令 | src/commands/interaction.ts | P0 | 1.5h |
| 1.8 | 实现 CLI 路由 | src/cli/router.ts | P0 | 1.5h |
| 1.9 | 实现 session 内建命令 | src/builtins/session-cmds.ts | P0 | 1h |
| 1.10 | 编写 bin/xbrowser.ts | bin/xbrowser.ts | P0 | 0.5h |
| 1.11 | 基础单元测试 | tests/unit/ | P0 | 1h |

**验收标准**:
- `xbrowser session open https://example.com` 能创建 session
- `xbrowser goto https://example.com` 能导航
- `xbrowser session list` 能列出 session
- `xbrowser session close` 能关闭 session

### Milestone 2: 完整命令集 (2-3 天)

**目标**: 所有浏览器命令可用

| # | 任务 | 对应文件 | 优先级 | 预计工时 |
|---|------|----------|--------|----------|
| 2.1 | 查询命令 (7个) | src/commands/query.ts | P1 | 2h |
| 2.2 | 等待命令 (2个) | src/commands/wait.ts | P1 | 0.5h |
| 2.3 | 滚动命令 | src/commands/scroll.ts | P1 | 0.5h |
| 2.4 | 鼠标命令 | src/commands/mouse.ts | P1 | 0.5h |
| 2.5 | JS 执行 (2个) | src/commands/evaluate.ts | P1 | 0.5h |
| 2.6 | Storage (6个) | src/commands/storage.ts | P1 | 1.5h |
| 2.7 | 截图 + 快照 | src/commands/snapshot.ts | P1 | 1h |
| 2.8 | DOM 结构分析 | src/commands/structure.ts + src/extractors/ | P1 | 2h |
| 2.9 | Frame 管理 | src/commands/frame.ts | P1 | 1h |
| 2.10 | 视口控制 | src/commands/viewport.ts | P1 | 0.5h |
| 2.11 | 快捷浏览器命令 | src/cli/browser-handlers.ts | P1 | 1h |
| 2.12 | 命令注册表 | src/commands/index.ts | P1 | 0.5h |
| 2.13 | Worker 命令路由 | src/worker.ts (mpageCommandMap) | P1 | 2h |
| 2.14 | 每个命令的单元测试 | tests/unit/commands/ | P1 | 3h |

**验收标准**:
- 所有 31 个浏览器命令可用
- `xbrowser click --selector '#btn'` 能点击
- `xbrowser html` 能获取 HTML
- `xbrowser screenshot` 能截图
- `xbrowser structure` 能分析 DOM

### Milestone 3: 插件 + 高级功能 (2-3 天)

**目标**: 插件系统可用，高级浏览器功能

| # | 任务 | 对应文件 | 优先级 | 预计工时 |
|---|------|----------|--------|----------|
| 3.1 | 插件加载器 | src/cli/plugin-command.ts | P1 | 1.5h |
| 3.2 | 插件安装/卸载 | src/cli/plugin-handlers.ts | P1 | 1.5h |
| 3.3 | 配置管理 | src/builtins/config.ts | P1 | 1.5h |
| 3.4 | Scope 系统 | src/scope.ts + 命令 scope 声明 | P1 | 1h |
| 3.5 | Viewer 命令 | src/builtins/viewer.ts | P1 | 0.5h |
| 3.6 | Info 命令 | src/builtins/info.ts | P1 | 0.5h |
| 3.7 | 录制功能 | src/recorder/ (从 mpage 迁移) | P2 | 4h |
| 3.8 | 回放功能 | src/recorder/player.ts | P2 | 2h |
| 3.9 | Scaffold 命令 | src/builtins/scaffold.ts | P2 | 1h |
| 3.10 | Daemon 管理 | src/cli/builtin-handlers.ts | P2 | 1h |
| 3.11 | 帮助系统 | src/cli/help-handlers.ts + output.ts | P2 | 1h |
| 3.12 | 输出格式化 | src/cli/output.ts (JSON/YAML/Tips) | P2 | 1h |

**验收标准**:
- 插件能被加载和执行
- `xbrowser plugin list` 显示已安装插件
- `xbrowser config set browser.path /usr/bin/chromium` 能持久化配置
- 录制/回放功能可用

### Milestone 4: 质量保障 (1-2 天)

**目标**: 测试完备，文档齐全

| # | 任务 | 对应文件 | 优先级 | 预计工时 |
|---|------|----------|--------|----------|
| 4.1 | 单元测试: Worker | tests/unit/worker.test.ts | P1 | 1h |
| 4.2 | 单元测试: 命令 | tests/unit/commands/*.test.ts | P1 | 2h |
| 4.3 | 单元测试: Session 客户端 | tests/unit/session-client.test.ts | P1 | 1h |
| 4.4 | 集成测试: 生命周期 | tests/integration/lifecycle.test.ts | P2 | 2h |
| 4.5 | 集成测试: 命令执行 | tests/integration/commands.test.ts | P2 | 2h |
| 4.6 | E2E: 插件运行 | tests/e2e/plugin.test.ts | P2 | 2h |
| 4.7 | README 文档 | README.md | P2 | 1h |
| 4.8 | API 文档 | docs/api.md | P3 | 1h |
| 4.9 | CI/CD | .github/workflows/ | P2 | 1h |

---

## 4. 架构验证点

| # | 关注点 | 验证方式 | 预期问题 | 应对方案 |
|---|--------|----------|----------|----------|
| 1 | WorkerEntryPoint 接口 | BrowserWorker.init/execute/destroy 是否满足所有需求 | 可能缺少 lifecycle hooks (onSessionCreate/onSessionClose) | 在 execute 方法内通过 method 路由处理 |
| 2 | Session 隔离 | 多 session 并发执行命令 | session Map 并发访问可能导致竞态 | 每个 session 独立的 BrowserContext，Map 只读操作 |
| 3 | 插件加载 | jiti TS 编译性能 | 大量插件首次加载慢 | 可选预编译 + 缓存机制 |
| 4 | Scope 覆盖 | 插件命令覆盖内建命令 | 覆盖策略可能不够灵活 | ScopeRegistry 提供明确优先级规则 |
| 5 | mpage 命令映射 | Worker 层 mpageCommandMap 完整性 | 新增命令容易遗漏映射 | 统一命令注册表自动生成映射 |
| 6 | 5 种安装器 | npm/git/url/local/builtin 安装流程 | 错误处理可能不够健壮 | 每种安装器独立测试 + 回滚机制 |
| 7 | Daemon 可选 | 不启动 daemon 时 CLI 可用性 | 内建命令 session 操作依赖 daemon | 提供 standalone 模式直接操作浏览器 |
| 8 | BrowserCommandContext | ctx.page 类型扩展 | page 可能为 null (project scope 命令) | Scope 检查确保 page 存在 |
| 9 | 录制器多 tab | 多 tab 录制事件追踪 | tab 间事件交叉 | CDP session 级别追踪 |
| 10 | 回放引擎 | 复杂交互回放准确性 | 拖拽、手势等高级操作回放偏差 | 基于 CDP 的底层事件回放 |

---

## 5. 与旧系统的功能对照表

### 5.1 mpage 引擎功能 (src/)

| # | 功能 | 来源文件 | xbrowser 对应 | 状态 |
|---|------|----------|---------------|------|
| 1 | goto 命令 | src/server/commands/navigation.ts | src/commands/navigation.ts | 待实现 |
| 2 | goBack 命令 | src/server/commands/navigation.ts | src/commands/navigation.ts | 待实现 |
| 3 | goForward 命令 | src/server/commands/navigation.ts | src/commands/navigation.ts | 待实现 |
| 4 | reload 命令 | src/server/commands/navigation.ts | src/commands/navigation.ts | 待实现 |
| 5 | title 查询 | src/server/commands/navigation.ts | src/commands/query.ts | 待实现 |
| 6 | url 查询 | src/server/commands/navigation.ts | src/commands/query.ts | 待实现 |
| 7 | click 交互 | src/server/commands/interaction.ts | src/commands/interaction.ts | 待实现 |
| 8 | fill 交互 | src/server/commands/interaction.ts | src/commands/interaction.ts | 待实现 |
| 9 | type 交互 | src/server/commands/interaction.ts | src/commands/interaction.ts | 待实现 |
| 10 | press 交互 | src/server/commands/interaction.ts | src/commands/interaction.ts | 待实现 |
| 11 | hover 交互 | src/server/commands/interaction.ts | src/commands/interaction.ts | 待实现 |
| 12 | scroll 交互 | src/server/commands/interaction.ts | src/commands/scroll.ts | 待实现 |
| 13 | select 下拉 | src/server/commands/interaction.ts | src/commands/interaction.ts | 待实现 |
| 14 | check 勾选 | src/server/commands/interaction.ts | src/commands/interaction.ts | 待实现 |
| 15 | waitForSelector | src/server/commands/interaction.ts | src/commands/wait.ts | 待实现 |
| 16 | query 查询 | src/server/commands/query.ts | src/commands/query.ts | 待实现 |
| 17 | find 查询 | src/server/commands/query.ts | src/commands/query.ts | 待实现 |
| 18 | html 获取 | src/server/commands/query.ts | src/commands/query.ts | 待实现 |
| 19 | text 获取 | src/server/commands/query.ts | src/commands/query.ts | 待实现 |
| 20 | inputValue 获取 | src/server/commands/query.ts | src/commands/query.ts | 待实现 |
| 21 | textContent 获取 | src/server/commands/query.ts | src/commands/query.ts | 待实现 |
| 22 | getAttribute | src/server/commands/query.ts | src/commands/query.ts | 待实现 |
| 23 | structure 分析 | src/server/commands/query.ts | src/commands/structure.ts | 待实现 |
| 24 | screenshot 截图 | src/server/commands/snapshot.ts | src/commands/snapshot.ts | 待实现 |
| 25 | screenshotBase64 | src/server/commands/snapshot.ts | src/commands/snapshot.ts | 待实现 |
| 26 | a11y 无障碍树 | src/server/commands/snapshot.ts | src/commands/snapshot.ts | 待实现 |
| 27 | snapshot (aria) | src/server/commands/snapshot.ts | src/commands/snapshot.ts | 待实现 |
| 28 | evaluate JS | src/server/commands/evaluate.ts | src/commands/evaluate.ts | 待实现 |
| 29 | evaluateRaw JS | src/server/commands/evaluate.ts | src/commands/evaluate.ts | 待实现 |
| 30 | wait 等待 | src/server/commands/evaluate.ts | src/commands/wait.ts | 待实现 |
| 31 | frames 列出 | src/server/commands/frame.ts | src/commands/frame.ts | 待实现 |
| 32 | frame 切换 | src/server/commands/frame.ts | src/commands/frame.ts | 待实现 |
| 33 | Frame 上下文支持 | src/server/commands/index.ts | src/worker.ts | 待实现 |
| 34 | executePageCommand | src/server/commands/index.ts | 直接调用 mpage | 复用 |
| 35 | 命令定义 schema | src/commands/definitions.ts | src/commands/ 各文件 | 重构为 Zod |
| 36 | 命令别名 (findByText→find, waitForTimeout→wait) | src/server/commands/index.ts | src/commands/ | 待实现 |
| 37 | 命令链解析 (pipe) | src/commands/chain-parser.ts | 暂不迁移 (插件系统替代) | 后续 |
| 38 | 参数解析 | src/commands/parser.ts | @xcli/core argParser | 复用 |
| 39 | IPC 通信 | src/client/ipc.ts | Daemon HTTP RPC | 复用 |
| 40 | 命令执行器 | src/client/executor.ts | src/session/session-client.ts | 重构 |
| 41 | 命令管道执行 | src/client/executor.ts | 暂不迁移 | 后续 |
| 42 | 命令链执行 | src/client/executor.ts | 暂不迁移 | 后续 |
| 43 | Session 管理器 | src/client/session-manager.ts | @xcli/core SessionManager | 复用 |
| 44 | Session 存储 | src/session/storage.ts | @xcli/core session-store | 复用 |
| 45 | 录制控制器 | src/server/recorder/controller.ts | src/recorder/controller.ts | 迁移 |
| 46 | 录制事件处理 | src/server/recorder/controller-events.ts | src/recorder/controller-events.ts | 迁移 |
| 47 | 录制 Tab 追踪 | src/server/recorder/controller-tab-tracking.ts | src/recorder/controller-tab-tracking.ts | 迁移 |
| 48 | 录制持久化 | src/server/recorder/controller-persistence.ts | src/recorder/controller-persistence.ts | 迁移 |
| 49 | 录制脚本注入 | src/server/recorder/inject.ts | src/recorder/inject.ts | 迁移 |
| 50 | 录制类型定义 | src/server/recorder/types.ts | src/recorder/types.ts | 迁移 |
| 51 | 回放引擎 | src/server/recorder/player.ts | src/recorder/player.ts | 迁移 |
| 52 | 52 种事件类型 | src/server/recorder/types.ts | src/recorder/types.ts | 迁移 |
| 53 | 10 种等待条件 | src/server/recorder/types.ts | src/recorder/types.ts | 迁移 |
| 54 | 9 种断言条件 | src/server/recorder/types.ts | src/recorder/types.ts | 迁移 |
| 55 | 布局提取器 | src/server/commands/extractors/layout.ts | src/extractors/layout.ts | 迁移 |
| 56 | 布局辅助 | src/server/commands/extractors/layout-helpers.ts | src/extractors/layout-helpers.ts | 迁移 |
| 57 | 布局格式化 | src/server/commands/extractors/layout-formatters.ts | src/extractors/layout-formatters.ts | 迁移 |
| 58 | A11y 提取器 | src/server/commands/extractors/a11y.ts | src/extractors/a11y.ts | 迁移 |
| 59 | 结构提取器 | src/server/commands/structure-extractor.ts | src/extractors/structure-extractor.ts | 迁移 |
| 60 | 选择器生成器 | src/server/commands/structure-selector.ts | src/extractors/structure-selector.ts | 迁移 |
| 61 | 相似度匹配 | src/utils/similarity.ts | 内联到命令 | 迁移 |
| 62 | Tips 引擎 | src/utils/tip.ts | @xcli/core tips-engine | 复用 |

### 5.2 xcli-browser 功能 (packages/xcli-browser/)

| # | 功能 | 来源文件 | xbrowser 对应 | 状态 |
|---|------|----------|---------------|------|
| 63 | BrowserWorker | packages/xcli-browser/src/daemon/browser-worker.ts | src/worker.ts | 待实现 |
| 64 | Worker 入口 | packages/xcli-browser/src/daemon/worker-entry.ts | src/worker.ts | 待实现 |
| 65 | session.create | browser-worker.ts | src/worker.ts | 待实现 |
| 66 | session.close | browser-worker.ts | src/worker.ts | 待实现 |
| 67 | session.closeAll | browser-worker.ts | src/worker.ts | 待实现 |
| 68 | session.list | browser-worker.ts | src/worker.ts | 待实现 |
| 69 | storage.get (cookies) | browser-worker.ts | src/worker.ts | 待实现 |
| 70 | storage.get (localStorage) | browser-worker.ts | src/worker.ts | 待实现 |
| 71 | storage.set (cookies) | browser-worker.ts | src/worker.ts | 待实现 |
| 72 | storage.set (localStorage) | browser-worker.ts | src/worker.ts | 待实现 |
| 73 | storage.clear (cookies) | browser-worker.ts | src/worker.ts | 待实现 |
| 74 | storage.clear (localStorage) | browser-worker.ts | src/worker.ts | 待实现 |
| 75 | page.snapshot | browser-worker.ts | src/worker.ts | 待实现 |
| 76 | page.mouse | browser-worker.ts | src/worker.ts | 待实现 |
| 77 | page.get | browser-worker.ts | src/worker.ts | 待实现 |
| 78 | page.navigate | browser-worker.ts | src/worker.ts | 待实现 |
| 79 | page.http / page.fetch | browser-worker.ts | src/worker.ts | 待实现 |
| 80 | page.addCookie | browser-worker.ts | src/worker.ts | 待实现 |
| 81 | recorder.start | browser-worker.ts | src/worker.ts | 待实现 |
| 82 | recorder.stop | browser-worker.ts | src/worker.ts | 待实现 |
| 83 | recorder.status | browser-worker.ts | src/worker.ts | 待实现 |
| 84 | replay.start | browser-worker.ts | src/worker.ts | 待实现 |
| 85 | mpageCommandMap (13个映射) | browser-worker.ts | src/worker.ts | 待实现 |
| 86 | BrowserCommandContext | packages/xcli-browser/src/context.ts | src/context.ts | 待实现 |
| 87 | BROWSER_SCOPE | packages/xcli-browser/src/scope.ts | src/scope.ts | 待实现 |
| 88 | checkBrowserScope | packages/xcli-browser/src/context.ts | src/context.ts | 待实现 |
| 89 | NetworkCapture 类型 | packages/xcli-browser/src/types.ts | src/types.ts | 待实现 |
| 90 | CapturedRequest/Response | packages/xcli-browser/src/types.ts | src/types.ts | 待实现 |

### 5.3 浏览器命令 (xcli-browser commands/)

| # | 命令名 | Scope | 来源文件 | xbrowser 对应 | 状态 |
|---|--------|-------|----------|---------------|------|
| 91 | goto | element | commands/goto.ts | src/commands/navigation.ts | 待实现 |
| 92 | refresh | page | commands/refresh.ts | src/commands/navigation.ts | 待实现 |
| 93 | back | page | commands/back.ts | src/commands/navigation.ts | 待实现 |
| 94 | forward | page | commands/forward.ts | src/commands/navigation.ts | 待实现 |
| 95 | click | element | commands/click.ts | src/commands/interaction.ts | 待实现 |
| 96 | fill | element | commands/fill.ts | src/commands/interaction.ts | 待实现 |
| 97 | type | element | commands/type.ts | src/commands/interaction.ts | 待实现 |
| 98 | press | element | commands/press.ts | src/commands/interaction.ts | 待实现 |
| 99 | select | element | commands/select.ts | src/commands/interaction.ts | 待实现 |
| 100 | check | element | commands/check.ts | src/commands/interaction.ts | 待实现 |
| 101 | hover | element | commands/hover.ts | src/commands/interaction.ts | 待实现 |
| 102 | dblclick | element | commands/dblclick.ts | src/commands/interaction.ts | 待实现 |
| 103 | html | page | commands/html.ts | src/commands/query.ts | 待实现 |
| 104 | screenshot | page | commands/screenshot.ts | src/commands/snapshot.ts | 待实现 |
| 105 | text | page | commands/text.ts | src/commands/query.ts | 待实现 |
| 106 | title | page | commands/title.ts | src/commands/query.ts | 待实现 |
| 107 | url | page | commands/url.ts | src/commands/query.ts | 待实现 |
| 108 | getProperty | element | commands/get-property.ts | src/commands/query.ts | 待实现 |
| 109 | waitForSelector | page | commands/wait-for-selector.ts | src/commands/wait.ts | 待实现 |
| 110 | waitForTimeout | page | commands/wait-for-timeout.ts | src/commands/wait.ts | 待实现 |
| 111 | scroll | page | commands/scroll.ts | src/commands/scroll.ts | 待实现 |
| 112 | mouse | page | commands/mouse.ts | src/commands/mouse.ts | 待实现 |
| 113 | eval | page | commands/eval.ts | src/commands/evaluate.ts | 待实现 |
| 114 | evaluate | page | commands/evaluate.ts | src/commands/evaluate.ts | 待实现 |
| 115 | getCookies | page | commands/cookies.ts | src/commands/storage.ts | 待实现 |
| 116 | setCookie | page | commands/cookies.ts | src/commands/storage.ts | 待实现 |
| 117 | clearCookies | page | commands/cookies.ts | src/commands/storage.ts | 待实现 |
| 118 | getLocalStorage | page | commands/local-storage.ts | src/commands/storage.ts | 待实现 |
| 119 | setLocalStorage | page | commands/local-storage.ts | src/commands/storage.ts | 待实现 |
| 120 | clearLocalStorage | page | commands/local-storage.ts | src/commands/storage.ts | 待实现 |
| 121 | structure | page | commands/structure.ts | src/commands/structure.ts | 待实现 |
| 122 | snapshot | page | commands/snapshot.ts | src/commands/snapshot.ts | 待实现 |
| 123 | setViewport | browser | commands/set-viewport.ts | src/commands/viewport.ts | 待实现 |

### 5.4 内建 CLI 命令 (xcli-browser builtins/)

| # | 命令 | 别名 | 来源文件 | xbrowser 对应 | 状态 |
|---|------|------|----------|---------------|------|
| 124 | daemon (start/stop/status) | d | builtins/session.ts | src/builtins/session-cmds.ts | 待实现 |
| 125 | open <url> | - | builtins/session.ts | src/builtins/session-cmds.ts | 待实现 |
| 126 | sessions | ss | builtins/session.ts | src/builtins/session-cmds.ts | 待实现 |
| 127 | status | - | builtins/session.ts | src/builtins/session-cmds.ts | 待实现 |
| 128 | html | - | builtins/session.ts | src/builtins/session-cmds.ts | 待实现 |
| 129 | close | - | builtins/session.ts | src/builtins/session-cmds.ts | 待实现 |
| 130 | kill | - | builtins/session.ts | src/builtins/session-cmds.ts | 待实现 |
| 131 | cookie (get/set/clear) | - | builtins/session.ts | src/builtins/session-cmds.ts | 待实现 |
| 132 | localStorage (get/set/clear) | ls | builtins/session.ts | src/builtins/session-cmds.ts | 待实现 |
| 133 | viewer | - | builtins/viewer.ts | src/builtins/viewer.ts | 待实现 |
| 134 | config (get/set/list/guard) | - | builtins/config.ts | src/builtins/config.ts | 待实现 |
| 135 | info <plugin> | - | builtins/info.ts | src/builtins/info.ts | 待实现 |
| 136 | config guard add | - | builtins/config.ts | src/builtins/config.ts | 待实现 |
| 137 | config guard remove | - | builtins/config.ts | src/builtins/config.ts | 待实现 |
| 138 | config guard identity-key | - | builtins/config.ts | src/builtins/config.ts | 待实现 |
| 139 | config guard list | - | builtins/config.ts | src/builtins/config.ts | 待实现 |

### 5.5 CLI 路由功能

| # | 功能 | 来源文件 | xbrowser 对应 | 状态 |
|---|------|----------|---------------|------|
| 140 | 主命令路由 | cli/router.ts | src/cli/router.ts | 待实现 |
| 141 | session 子命令路由 | cli/router.ts + session-handlers.ts | src/cli/session-handlers.ts | 待实现 |
| 142 | plugin 子命令路由 | cli/router.ts + plugin-handlers.ts | src/cli/plugin-handlers.ts | 待实现 |
| 143 | 快捷 goto/click/fill | cli/browser-handlers.ts | src/cli/browser-handlers.ts | 待实现 |
| 144 | config/create/init/daemon | cli/builtin-handlers.ts | src/cli/builtin-handlers.ts | 待实现 |
| 145 | 帮助信息 | cli/help-handlers.ts | src/cli/help-handlers.ts | 待实现 |
| 146 | 插件命令分发 | cli/plugin-command.ts | src/cli/plugin-command.ts | 待实现 |
| 147 | 输出格式化 (JSON/YAML/Text) | cli/output.ts | src/cli/output.ts | 待实现 |
| 148 | 帮助生成 | cli/output.ts (helpGen) | src/cli/output.ts | 待实现 |
| 149 | 版本输出 | cli/output.ts | src/cli/output.ts | 待实现 |

### 5.6 Session 客户端功能

| # | 功能 | 来源文件 | xbrowser 对应 | 状态 |
|---|------|----------|---------------|------|
| 150 | daemonRequest RPC | session/browser-session-client.ts | src/session/session-client.ts | 待实现 |
| 151 | requireSession | session/browser-session-client.ts | src/session/session-client.ts | 待实现 |
| 152 | getSession / saveSession | session/browser-session-client.ts | src/session/session-client.ts | 待实现 |
| 153 | openSession | session/browser-session-client.ts | src/session/session-client.ts | 待实现 |

---

## 6. 实现优先级总结

```
P0 (必须，Milestone 1) ─────────────────────
  Worker + Context + Scope + Session 客户端
  4 导航 + 8 交互 + CLI 路由 + session 命令
  = 11 项任务，约 11.5h

P1 (重要，Milestone 2) ─────────────────────
  14 命令文件 + Worker 命令路由 + 快捷命令
  = 14 项任务，约 17h

P2 (增强，Milestone 3+4) ────────────────────
  插件系统 + 录制/回放 + 配置 + 测试
  = 12 项任务，约 19h

P3 (可选) ──────────────────────────────────
  API 文档
  = 1 项任务，约 1h

总计: 约 48.5h (6-8 个工作日)
```

---

## 7. 关键技术决策

### 7.1 命令定义方式

**旧系统**: 两套定义 — mpage `definitions.ts` (Zod) + xcli-browser 各命令文件 (Zod)
**新系统**: 统一为 `src/commands/` 下的命令文件，每个命令自带 Zod schema

```typescript
// src/commands/navigation.ts
export const gotoCommand: BrowserCommandDefinition = {
  name: 'goto',
  description: 'Navigate to URL',
  scope: 'page',
  parameters: z.object({
    url: z.string(),
    waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
  }),
  handler: async (p, ctx) => {
    await ctx.page.goto(p.url, { waitUntil: p.waitUntil });
    return ok({ url: p.url });
  },
};
```

### 7.2 Worker 架构

保持 `BrowserWorker` 实现 `WorkerEntryPoint` 接口，通过 method 字符串路由到具体命令处理器。mpageCommandMap 统一管理 mpage 引擎命令的映射。

### 7.3 录制器迁移

从 mpage 的 `src/server/recorder/` 直接迁移到 xbrowser 的 `src/recorder/`，保持 API 不变:
- `RecorderController` — 控制录制生命周期
- `PlaybackEngine` — 回放录制脚本
- 52 种事件类型 + 10 种等待条件 + 9 种断言条件

### 7.4 不迁移的功能

| 功能 | 原因 |
|------|------|
| 命令链解析 (pipe) | 插件系统提供更好的编排能力 |
| 命令管道执行 | 被 Daemon RPC 模式替代 |
| IPC 通信层 | 被 HTTP RPC 替代 |
| mpage 独立 CLI (bin/mpage) | xbrowser 是唯一的 CLI 入口 |
