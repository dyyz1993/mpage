# 项目大纲 — xcli 架构重构

## 会话信息
- **会话ID**: session-2026-05-05
- **创建时间**: 2026-05-05
- **最后更新**: 2026-05-05 (全部完成)

## 用户需求记录

### 需求 1: 通用 CLI 框架
- xcli 要独立成通用框架，不限于浏览器
- 可以应用到任何领域（数据库、API 等）

### 需求 2: 脚手架快速创建
- CLI init 创建整个 CLI 应用（类似 create-react-app）
- CLI create 创建插件
- 两者都要支持

### 需求 3: 遗留产物处理
- mpage 与 CLI 的耦合要解耦
- mpage = 纯浏览器引擎，不含 CLI
- CLI 框架 = 通用，不含浏览器

### 需求 4: 功能由模板创建
- 创建完成后通过插件/扩展丰富内容

### 需求 5: 插件/拓展形式
- 5 种安装方式: local, npm, git, url, builtin
- 可覆盖原指令
- Scope 作用域系统

### 需求 6: Session 隔离 + Daemon
- Session 隔离是框架底层能力（不是浏览器特有的）
- 支持并发执行
- Daemon 后台进程管理
- Worker 进程池 (1 session : 1 worker)
- Daemon 可选（简单 CLI 不需要）

## 任务分解

### Phase 1: 清理 ✅
- [x] 删除 xcli/ 独立目录 (123 files)
- [x] 删除 packages/ghcli/ (13 files)
- [x] 删除 packages/xcli/ 聚合包 (5 files)
- [x] 删除 output/ 和 test-scripts.json

### Phase 2: 新 @xcli/core 核心能力 ✅
- [x] Session 管理器 (SessionManager, SessionStore, SessionArchive)
- [x] Daemon 管理器 (DaemonManager, configurable configDir)
- [x] Worker 进程池 (WorkerManager, configurable workerEntryPath)
- [x] Worker 协议 (WorkerEntryPoint 接口)
- [x] HTTP RPC Server (injectable handler)
- [x] 插件安装器接口 (5 种方式)
- [x] Scope 系统 (ScopeDefinition, ScopeLevel)
- [x] IPC 类型定义
- [x] 向后兼容（保留所有原有导出）

### Phase 3: xcli-browser 包 ✅
- [x] BrowserWorker 实现 WorkerEntryPoint
- [x] BrowserCommandContext 扩展 CommandContext
- [x] BROWSER_SCOPE (project > browser > page > element)
- [x] BrowserSessionClient (HTTP RPC 客户端)
- [x] Worker Entry (IPC 消息循环 + 心跳)
- [x] CLI 入口 (bin/xcli-browser.ts, 占位)

### Phase 4: 核心功能实现 ✅
- [x] 5 种插件安装器 (LocalInstaller, NpmInstaller, GitInstaller, UrlInstaller, BuiltinInstaller)
- [x] 插件安装注册中心 (PluginInstallerRegistry)
- [x] Scope 覆盖机制 (ScopeRegistry)
- [x] 脚手架引擎 (ScaffoldEngine)
- [x] 内置模板: base-cli, minimal-plugin
- [x] 33 个浏览器命令迁移到 xcli-browser
- [x] 12 个 builtin 命令迁移到 xcli-browser
- [x] 完整 CLI 路由 (session/plugin/create/init/config/daemon/help + 直接浏览器命令)
- [x] NetworkCapture 类型迁移
- [x] generateTips() 迁移到 @xcli/core
- [x] 清理旧 packages (browser/, daemon/, session/, tips/)
- [x] 清理 ghcli/
- [x] 全量构建验证通过 (0 errors)

### Phase 5: 测试修复 + 发布准备 + 脚手架 ✅
- [x] 22 个 node:test 测试文件迁移到 vitest
- [x] 修复 plugin-test-runner.ts 变量遮蔽 bug
- [x] 修复 navigation.test.ts 导入路径
- [x] 创建 vitest.config.ts
- [x] 284 个测试全部通过 (100% pass rate)
- [x] @xcli/core npm 发布准备 (publishConfig, metadata)
- [x] 创建 create-xcli 脚手架工具
- [x] 添加 BROWSER_APP_TEMPLATE 浏览器应用模板
- [x] 脚手架实测: base 模板 (8 files) + browser 模板 (11 files)
- [x] 全量验证: build + typecheck + lint + test + scaffold

## 执行记录

### 2026-05-05 Phase 1 清理
- 删除 xcli/ 独立目录（123 tracked files, git rm）
- 删除 packages/ghcli/（13 files）
- 删除 packages/xcli/ 聚合包（5 files）
- 删除 output/ 和 test-scripts.json
- 总计: 144 files deleted, -25,127 lines

### 2026-05-05 Phase 2 新 @xcli/core
- 创建 packages/core/src/session/ (5 files)
- 创建 packages/core/src/daemon/ (7 files)
- 创建 packages/core/src/plugin/plugin-installer.ts
- 创建 packages/core/src/command/scope.ts
- 更新 packages/core/src/index.ts (向后兼容)
- 质量修复: worker-manager.ts 拆分 (<300行), JSON.parse 类型化

### 2026-05-05 Phase 3 xcli-browser
- 创建 packages/xcli-browser/ (8+ files)
- BrowserWorker 实现完整的命令路由
- 构建 + 类型检查全部通过

### 2026-05-05 Phase 4 核心功能
- 创建 5 种插件安装器实现 (local, npm, git, url, builtin)
- 创建 PluginInstallerRegistry 统一管理
- 创建 ScopeRegistry 实现 Scope 覆盖机制
- 创建 ScaffoldEngine 脚手架引擎 ({{variable}} 模板插值)
- 创建内置模板: base-cli, minimal-plugin
- 全量构建验证通过 (6 packages + root, lint + typecheck + build)

### 2026-05-05 Phase 4 完成
- 迁移 33 个浏览器命令到 packages/xcli-browser/src/commands/
- 迁移 12 个 builtin 命令到 packages/xcli-browser/src/builtins/
- 实现完整 CLI 路由 (session/plugin/create/init/config/daemon/help/goto/click/fill)
- 修复 router.ts 超过 300 行限制 (拆分为 5 个文件)
- 迁移 NetworkCapture 类型到 xcli-browser
- 迁移 generateTips() 到 @xcli/core
- 删除旧 packages: browser/(45 files), daemon/(14 files), session/(7 files), tips/(5 files)
- 删除 ghcli/ 残留
- 更新 validate:xcli 脚本
- 全量验证: build + typecheck + lint 全部通过 (0 errors)

### 2026-05-05 Phase 5 测试修复 + 发布
- 迁移 22 个测试文件从 node:test 到 vitest
- 修复 3 个 bug (variable shadowing, import path, mock pattern)
- 创建 vitest.config.ts
- 284 tests / 100% pass rate
- @xcli/core npm 发布准备完成
- 创建 create-xcli 脚手架工具 (3 个模板: base, minimal-plugin, browser)
- 脚手架实测成功 (base: 8 files, browser: 11 files)
- 代码统计: 总计 20,505 行 (core 5,007 + browser 3,735 + engine 5,195 + tests 6,432 + create-xcli 136)

## 关键决策

### 决策 1: 仓库组织
- 选择: 混合模式（框架独立，引擎+应用合并）
- 仓库 A: xcli-framework (独立, npm 发布 @xcli/core)
- 仓库 B: mpage (当前仓库, 含引擎 + 浏览器 CLI)

### 决策 2: Worker 协议
- WorkerEntryPoint: init/execute/destroy 三阶段
- 每个领域实现自己的 Worker (BrowserWorker, DatabaseWorker 等)
- 1 session : 1 worker 进程隔离

### 决策 3: CommandContext 无 page
- 框架层 CommandContext 不包含 page/browser
- 领域层通过 extends 扩展 (BrowserCommandContext)

### 决策 4: SessionMeta 用 config 而非 url
- 通用框架的 SessionMeta 用 config: Record<string, unknown>
- 浏览器领域在 config 中传 url

### 决策 5: Daemon 可选
- 简单 CLI 应用可以不启用 Daemon
- 需要 Session 隔离时才启动 Daemon

## 进度跟踪

### 当前状态
- Phase 1: ✅ 完成 (清理)
- Phase 2: ✅ 完成 (@xcli/core 核心能力)
- Phase 3: ✅ 完成 (xcli-browser 包)
- Phase 4: ✅ 完成 (命令迁移 + CLI 路由 + 清理)
- Phase 5: ✅ 完成 (测试修复 + 发布准备 + 脚手架)
- **架构重构全部完成** 🎉

### 后续可选优化
- [ ] 将 @xcli/core 独立为 xcli-framework 仓库
- [ ] npm publish @xcli/core + create-xcli
- [ ] WebSocket 实时预览
- [ ] 更多领域模板
- [ ] CI/CD 配置

## 技术栈

### 运行时
- TypeScript (strict mode)
- Node.js >= 18 (ESM)
- pnpm workspaces
- zod (参数校验)
- jiti (运行时 TS 编译)

### 浏览器领域
- playwright / playwright-core
- @dyyz1993/xpage (CDP, 录制/回放)
- ws (WebSocket)

### 构建工具
- tsup (打包)
- vitest (测试)
- eslint + prettier (代码规范)
- husky + lint-staged (Git hooks)
