# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.16.0] - 2026-06-24

### Added
- `tipsToMessages(tips)` — 将 `Tip[]` 转回 `string[]`（提取 message），用于归档、IPC 边界等需要纯字符串的场景
- 导出 `tipsToMessages` 至公共 API（`index.ts`）

### Changed
- `ok()` / `fail()` 向后兼容：参数类型从 `tips?: Tip[]` 改为 `tips?: Array<string | Tip>`
  - 插件层零改动，`ok(data, ['采集到 5 条'])` 仍可正常工作
  - 内部自动通过 `normalizeTips()` 归一化为 `Tip[]`，返回值 `CommandResult.tips` 保持 `Tip[]`
- `CommandArchiveEntry.result.tips` 保持 `string[]`（归档是磁盘格式），新增 JSDoc 提示用 `tipsToMessages()` 转换

### Fixed
- `handlerMiddleware`（core.ts）合并 tips 时的 `string` / `Tip` 混排 bug
  - 之前 `[...result.tips, ...ctxTips]` 会把插件返回的 `string[]` 和 `ctx.tips.collected`（`Tip[]`）混在一个数组里
  - 现在统一 `normalizeTips()` 后再合并
- 即使插件绕过 `ok()` 直接返回 `{ data, tips: ['字符串'] }` 也能正确归一化

## [0.15.0] - 2026-06-16

### Added
- **分层存储** — `ctx.storage` 扩展为四层：plugin/global/cache/tmp
- `GlobalStorage` — 全局共享存储（`~/.{cli}/global.json`）
- `CacheStorage` — 带 TTL 过期的缓存（`~/.{cli}/cache/{pluginId}/`）
- `TmpStorage` — 进程级临时文件（`/tmp/{cli}-{pid}/{pluginId}/`）
- `CompositeStorage` — 包装四层存储，顶层 delegate 到 plugin
- `ctx.config` — 从 rc-config loader 加载用户配置
- `PluginStore` / `GlobalStore` / `CacheStore` / `TmpStore` — 分层存储接口类型

### Changed
- `StorageContext` 接口扩展：新增 `plugin` / `global` / `cache` / `tmp` 属性
- `CoreHost` 接口新增 `configDir` 字段
- 顶层 `ctx.storage.get/set` 仍可用（delegate 到 plugin，向后兼容）

## [0.14.0] - 2026-06-16

### Added
- `TipCollector` — 结构化 Tips 系统，支持 level (info/warn/error) 和 label
- `ctx.tips` — CommandContext 注入 TipCollector，插件执行过程中随时推送 tips
- `SessionManager<TMeta>` — 泛型模板基类，支持子类覆写 allocateSession/restoreSession
- `SessionPersistence<TMeta>` — 持久化适配器接口
- `FileSessionPersistence<TMeta>` — JSON 文件持久化默认实现
- `SessionLifecycle<TMeta>` — 生命周期钩子接口 (onCreate/onClose/onRestore)
- `SessionManager.findOrRestore()` — 内存 → 磁盘 → 恢复的标准流程

### Changed
- `CommandResult.tips` 从 `string[]` 升级为 `Tip[]`（含 level/message/label）
- `SessionManagerContract` 所有方法统一为 async 返回
- Tips 输出按 level 显示不同 icon: info / warn / error
- `generateTips()` 返回 `Tip[]` 而非 `string[]`

### Removed
- 显式 `session open` 命令（改为 `--session` 隐式自动创建，仅影响 xbrowser）

## [0.7.5] - 2026-05-15

### Added
- `extractPositionalParams(schema)` — extract positional parameter names from Zod schema
- `mapPositionalValues(schema, positional, existing)` — map CLI positional args to schema fields with type coercion
- `unquote(str)` — strip surrounding quotes from CLI argument values
- Smart optional number skip: `z.number().optional()` fields skip non-numeric positional values
- `--flag` priority: named args are never overridden by positional args
- CI template validation job with 24 SUCCESS/FAIL test cases
- Husky pre-commit (typecheck) and pre-push (1551 tests) hooks

### Changed
- CI workflow now includes `template-validation` job
- Feishu notification includes `template-validation` result

## [0.7.0] - 2026-05-12

### Added
- Zod v4 migration and type inference
- Nested sub-commands support (`config get` instead of `config-get`)
- Scaffold engine with 5 templates (base, minimal-plugin, browser, database, api)

### Fixed
- Remove ZodSchema generics from SiteInstance to prevent tsc OOM with Hono
- Simplify GroupedSiteInstance.command() to prevent tsc OOM

## [0.6.0] - 2025-05-05

### Added
- WebSocket server and client for daemon communication
- Real-time session management through WebSocket
- Improved daemon manager with WebSocket support

### Changed
- Enhanced Core.run() argument parsing
- Made CommandScope extensible

### Fixed
- Daemon connection management

## [0.5.1] - Previous
- Initial stable release
