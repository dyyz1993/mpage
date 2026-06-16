# xcli-core v0.15.0 升级指南

## 概述

`@dyyz1993/xcli-core` 从 `0.13.x` 升级到 `0.15.0`，包含两大变更：
1. **Tips 系统重构** — `tips: string[]` → 结构化 `Tip[]`，支持 level + label，`ctx.tips` 随时推送
2. **分层存储** — `ctx.storage` 扩展为四层（plugin/global/cache/tmp），`ctx.config` 接入 rc-config

---

## 一、Tips 系统

### 1.1 为什么改？

旧版 `tips: string[]` 只能在 return 时一次性传，无法表达严重程度，也无法在执行过程中增量推送。

新版 `Tip` 支持：
- **level** — `info` / `warn` / `error`，Core 自动渲染不同 icon
- **label** — 可选标签，用于分类（如 `PAGINATION`、`AUTH`、`RATE_LIMIT`）
- **ctx.tips** — 执行过程中随时推送，不用等 return

### 1.2 类型定义

```typescript
type TipLevel = 'info' | 'warn' | 'error';

interface Tip {
  level: TipLevel;
  message: string;
  label?: string;  // 可选，如 'PAGINATION'、'AUTH'
}
```

### 1.3 两种用法

#### 用法 A：`ctx.tips`（推荐 — 过程中推送）

```typescript
handler: async (params, ctx) => {
  ctx.tips.info('开始采集');

  for (const page of pages) {
    try {
      const items = await scrape(page);
      ctx.tips.info(`第${page}页: ${items.length} 条`);
    } catch (e) {
      ctx.tips.warn(`第${page}页失败，跳过`, 'PAGINATION');
    }
  }

  // return 只管 data，tips 已在 ctx 中收集
  return { data: allItems };
  // Core 自动合并 ctx.tips.collected 到 CommandResult.tips
}
```

#### 用法 B：`tip` helper（return 时传）

```typescript
import { tip } from '@dyyz1993/xcli-core';

handler: async (params, ctx) => {
  return {
    data: result,
    tips: [
      tip.info('采集到 5 条'),
      tip.warn('Token 将过期', 'AUTH'),
      tip.error('第2页完全失败', 'PAGINATION'),
    ],
  };
};
```

### 1.4 Tips 使用场景

| 场景 | level | label 示例 | 何时推送 |
|------|-------|-----------|---------|
| 采集进度 | `info` | — | 每页/每批次完成时 |
| 分页失败但可跳过 | `warn` | `PAGINATION` | catch 块中 |
| Token/登录即将过期 | `warn` | `AUTH` | 检查 token 有效期后 |
| 速率限制被触发 | `warn` | `RATE_LIMIT` | API 返回 429 时 |
| 数据校验不完整 | `warn` | `VALIDATION` | 字段缺失但非致命 |
| 完全失败需用户介入 | `error` | `FATAL` | 无法继续执行时 |
| 配置项缺失用默认值 | `info` | `CONFIG` | fallback 到默认值时 |
| 缓存命中/未命中 | `info` | `CACHE` | 调试时可选开启 |

### 1.5 输出效果

Core 按 level 渲染不同 icon（受 `ctx.output.emoji` 控制）：

```
💡 开始采集
💡 [CACHE] 命中缓存，跳过网络请求
⚠️ [PAGINATION] 第3页失败，跳过
⚠️ [AUTH] Token 将在 30 分钟内过期
❌ [FATAL] 数据库连接失败
```

JSON 输出中 tips 保持结构化：

```json
{
  "tips": [
    { "level": "info", "message": "采集到 5 条" },
    { "level": "warn", "message": "Token 将过期", "label": "AUTH" }
  ]
}
```

### 1.6 你需要改的代码

**所有 `ok()` / `fail()` 中的字符串数组**：

```typescript
// ❌ 旧
return ok(data, ['采集到 5 条']);

// ✅ 新 — 方式1：tip helper
return ok(data, [tip.info('采集到 5 条')]);

// ✅ 新 — 方式2：ctx.tips（推荐）
ctx.tips.info('采集到 5 条');
return ok(data);
```

**`generateTips()` 返回值访问**：

```typescript
// ❌ 旧
const tips = generateTips(error);
console.log(tips[0]);  // string

// ✅ 新
const tips = generateTips(error);
console.log(tips[0].message);  // .message
```

---

## 二、分层存储

### 2.1 为什么改？

旧版只有一个扁平的 `ctx.storage`，无法区分：
- 插件私有数据 vs 全局共享数据
- 持久化数据 vs 临时缓存
- 带过期 vs 永久

新版分四层，各司其职：

| 层 | 路径 | 用途 | 生命周期 |
|----|------|------|---------|
| `ctx.storage.plugin` | `~/.{cli}/storage/{pluginId}.json` | 插件私有持久化 | 永久 |
| `ctx.storage.global` | `~/.{cli}/global.json` | 全局共享（跨插件） | 永久 |
| `ctx.storage.cache` | `~/.{cli}/cache/{pluginId}/{key}.json` | 带过期的缓存 | TTL 过期自动清除 |
| `ctx.storage.tmp` | `/tmp/{cli}-{pid}/{pluginId}/` | 进程级临时文件 | 进程退出即弃 |

### 2.2 用法示例

```typescript
handler: async (params, ctx) => {
  // ─── Plugin 层：插件私有持久化 ───
  // 适合存：用户偏好、上次执行位置、配置缓存
  await ctx.storage.plugin.set('lastPage', 5);
  const lastPage = await ctx.storage.plugin.get<number>('lastPage');

  // ─── Global 层：跨插件共享 ───
  // 适合存：全局 token、用户信息、共享配置
  await ctx.storage.global.set('auth_token', 'xxx');
  const token = await ctx.storage.global.get<string>('auth_token');

  // ─── Cache 层：带 TTL 的缓存 ───
  // 适合存：API 响应缓存、计算结果缓存
  // maxAge 单位：毫秒
  await ctx.storage.cache.set('user_list', users, 60_000);  // 60秒过期
  const cached = await ctx.storage.cache.get<User[]>('user_list');  // 过期返回 null
  // get 时也可覆盖 maxAge：get('key', 30_000) 表示只接受30秒内的缓存

  // ─── Tmp 层：进程级临时文件 ───
  // 适合存：下载的中间文件、临时截图
  const tmpPath = ctx.storage.tmp.path('screenshot.png');
  await ctx.storage.tmp.write('screenshot.png', buffer);
  const data = await ctx.storage.tmp.read('screenshot.png');
  await ctx.storage.tmp.clean();  // 清理本插件所有临时文件

  return { data: result };
};
```

### 2.3 ctx.config 接入

`ctx.config` 现在从 rc-config loader 加载，插件可直接读取用户配置：

```typescript
handler: async (params, ctx) => {
  // ctx.config 由 ~/.{cli}rc 或环境变量填充
  const apiHost = ctx.config.api_host as string;
  const timeout = ctx.config.timeout as number;
};
```

### 2.4 向后兼容

旧的顶层 `ctx.storage.get/set/delete/clear/keys` 仍然可用，内部 delegate 到 plugin 层：

```typescript
// 这些写法仍然有效，等价于 ctx.storage.plugin.xxx
await ctx.storage.get('key');
await ctx.storage.set('key', value);
await ctx.storage.delete('key');
```

**不需要改动现有代码**，但建议新代码明确使用 `ctx.storage.plugin.xxx`。

---

## 三、新增导出

```typescript
// Tip 相关
export type { TipLevel, Tip } from '@dyyz1993/xcli-core';
export { TipCollector, normalizeTip, normalizeTips, tip } from '@dyyz1993/xcli-core';

// 存储相关
export { PluginStorage, GlobalStorage, CacheStorage, TmpStorage, CompositeStorage } from '@dyyz1993/xcli-core';
export type { PluginStore, GlobalStore, CacheStore, TmpStore, StorageContext } from '@dyyz1993/xcli-core';

// Session 相关
export { SessionManager, FileSessionPersistence } from '@dyyz1993/xcli-core';
export type { SessionPersistence, SessionLifecycle } from '@dyyz1993/xcli-core';
```

---

## 四、升级步骤

```bash
# 1. 升级依赖
npm install @dyyz1993/xcli-core@^0.15.0

# 2. 搜索需要改的代码
grep -rn "tips:" src/ --include="*.ts"
grep -rn "ok(.*\[" src/ --include="*.ts"
grep -rn "fail(.*\[" src/ --include="*.ts"
grep -rn "generateTips" src/ --include="*.ts"

# 3. 按 typecheck 报错逐个修复
npm run typecheck

# 4. 运行测试
npm test
```

---

## 五、完整 Changelog

### v0.15.0

#### Added
- **分层存储** — `ctx.storage` 扩展为四层：plugin/global/cache/tmp
- `GlobalStorage` — 全局共享存储（`~/.{cli}/global.json`）
- `CacheStorage` — 带 TTL 过期的缓存（`~/.{cli}/cache/{pluginId}/`）
- `TmpStorage` — 进程级临时文件（`/tmp/{cli}-{pid}/{pluginId}/`）
- `CompositeStorage` — 包装四层存储，顶层 delegate 到 plugin
- `ctx.config` — 从 rc-config loader 加载用户配置
- `PluginStore` / `GlobalStore` / `CacheStore` / `TmpStore` — 分层存储接口

#### Changed
- `StorageContext` 接口扩展：新增 `plugin` / `global` / `cache` / `tmp` 属性
- `CoreHost` 接口新增 `configDir` 字段

### v0.14.0

#### Added
- `TipCollector` — 结构化 Tips 系统，支持 level (info/warn/error) 和 label
- `ctx.tips` — CommandContext 注入 TipCollector，插件执行过程中随时推送
- `SessionManager<TMeta>` — 泛型模板基类
- `SessionPersistence<TMeta>` — 持久化适配器接口
- `FileSessionPersistence<TMeta>` — JSON 文件持久化默认实现
- `SessionLifecycle<TMeta>` — 生命周期钩子接口

#### Changed
- `CommandResult.tips` 从 `string[]` 升级为 `Tip[]`
- `SessionManagerContract` 所有方法统一为 async
- Tips 输出按 level 显示不同 icon
- `generateTips()` 返回 `Tip[]`

#### Removed
- 显式 `session open` 命令（改为 `--session` 隐式自动创建）
