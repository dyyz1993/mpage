---
name: xcli-plugin-development
description: >
  开发 xcli 浏览器自动化插件。Use when: 创建 xcli 插件、编写 site.command handler、
  使用 ctx.page/ctx.storage、插件生命周期管理、安装/卸载/热重载插件。
---

# xcli 插件开发

## Quick Start

### 用 xcli create 创建插件

```bash
xcli create my-plugin --template static    # 静态页面采集
xcli create my-api --template api          # 纯 API 插件
xcli create my-login --template login      # 需要登录的插件
xcli create my-spa --template dynamic      # 动态页面采集
```

### 目录结构

```
.xcli/plugins/<plugin-id>/
├── index.ts          # 插件入口（必须）
├── package.json      # { "name": "<plugin-id>" }（必须）
└── README.md         # 说明文档（推荐）
```

### 最小可运行插件

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { ok, fail } from 'xcli';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: 'my-plugin',
    url: 'https://example.com',
  });

  site.command('hello', {
    description: '打个招呼',
    parameters: z.object({ name: z.string().describe('你的名字') }),
    handler: async (params) => {
      return ok({ message: `你好, ${params.name}!` });
    },
  });
}
```

### 完整示例（带错误处理）

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { ok, fail } from 'xcli';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: 'my-plugin',
    url: 'https://example.com',
  });

  site.command('scrape', {
    description: '采集页面数据',
    parameters: z.object({
      query: z.string().describe('搜索关键词'),
      limit: z.number().optional().default(10),
    }),
    handler: async (params, ctx) => {
      if (!ctx.page) return fail('浏览器页面不可用');

      await ctx.page.goto(ctx.site.url);
      await ctx.page.waitForSelector('h2');
      const items = await ctx.page.evaluate(() => {
        return Array.from(document.querySelectorAll('h2')).map((el) => ({
          title: el.textContent?.trim() || '',
          url: el.querySelector('a')?.getAttribute('href') || '',
        }));
      });

      if (items.length === 0) return fail('未找到结果', ['请检查选择器或关键词']);
      return ok(items.slice(0, params.limit), [`共 ${items.length} 条`]);
    },
  });
}
```

## 核心 API

### XCLIAPI

| 方法 | 签名 | 说明 |
|------|------|------|
| `createSite` | `(config: SiteConfig) => SiteInstance` | 创建站点，注册独立命名空间 |
| `registerCommand` | `(cmd: Command & { handler }) => this` | 注册全局命令（无站点前缀） |
| `registerFlag` | `(flag: FlagConfig) => this` | 注册全局 CLI 标志 |
| `registerTool` | `(tool: ToolConfig) => this` | 注册工具（供 AI agent 调用） |
| `overrideTool` | `(name: string, tool: ToolConfig) => this` | 覆盖已有工具 |
| `onLoad` | `(handler: () => void \| Promise<void>) => this` | 插件加载后回调 |
| `onUnload` | `(handler: () => void \| Promise<void>) => this` | 插件卸载前回调 |
| `onEvent` | `(event: string, handler: EventHandler) => this` | 订阅全局事件 |

### SiteConfig

```typescript
interface SiteConfig {
  name: string;                    // kebab-case，与目录名一致
  url?: string;                    // 站点基础 URL
  description?: string;
  requiresLogin?: boolean;         // 是否需要登录才能执行命令
  isLogin?: (ctx: CommandContext) => Promise<boolean>;  // 自定义登录检测
}
```

### SiteInstance

| 方法 | 签名 | 说明 |
|------|------|------|
| `command` | `(name, config) => SiteInstance` | 注册站点命令（链式调用） |
| `login` | `(handler: (ctx) => Promise<void>) => SiteInstance` | 注册登录处理 |
| `logout` | `(handler: (ctx) => Promise<void>) => SiteInstance` | 注册退出处理 |
| `isLoggedIn` | `() => Promise<boolean>` | 检测登录状态 |
| `requireLogin` | `() => Promise<void>` | 未登录抛 CommandError |
| `getStorage` | `() => StorageContext` | 获取站点存储实例 |

### command() 参数配置

```typescript
site.command<P, R>(name: string, {
  description: string,           // 命令描述（必须）
  parameters?: P,                // Zod schema，定义入参
  result?: R,                    // Zod schema，定义返回值
  requiresLogin?: boolean,       // 默认 false
  examples?: Array<{ cmd: string; description: string }>,
  tips?: string[],
  handler: (params: z.infer<P>, ctx: CommandContext) => Promise<CommandResult>,
}): SiteInstance
```

## CommandContext 速查

| 字段 | 类型 | 说明 |
|------|------|------|
| `ctx.args` | `string[]` | 命令行位置参数 |
| `ctx.options` | `Record<string, unknown>` | 解析后的命名参数 |
| `ctx.cwd` | `string` | 当前工作目录 |
| `ctx.page` | `Page \| null` | Playwright Page 实例 |
| `ctx.storage` | `StorageContext` | 插件持久化存储 |
| `ctx.output` | `OutputContext` | 输出配置（mode/color/emoji） |
| `ctx.error` | `(msg: string) => void` | 报错并终止命令 |
| `ctx.config` | `Record<string, unknown>` | 站点配置 |
| `ctx.site` | `SiteInstance` | 当前站点实例 |
| `ctx.browser` | `{ executablePath: string }` | 浏览器可执行文件路径 |

> **Param Coercion**: CLI 传入的字符串参数会自动转为 number/boolean（根据 Zod schema 类型），
> 无需手动使用 `z.coerce.number()`，直接写 `z.number()` 即可。

### StorageContext

| 方法 | 签名 | 说明 |
|------|------|------|
| `get` | `<T>(key: string) => Promise<T \| null>` | 读取 |
| `set` | `<T>(key: string, value: T) => Promise<void>` | 写入 |
| `delete` | `(key: string) => Promise<void>` | 删除 |
| `clear` | `() => Promise<void>` | 清空 |
| `keys` | `() => Promise<string[]>` | 列出所有 key |

## 插件管理命令

| 命令 | 说明 |
|------|------|
| `xcli create <name> --template <type>` | 快速创建插件（static/dynamic/login/api） |
| `xcli plugins list` | 列出所有已加载插件及状态 |
| `xcli plugins doctor` | 诊断所有插件问题（缺失文件、缺少 null 检查等） |
| `xcli plugins install <path>` | 从路径安装插件 |
| `xcli plugins reload <id>` | 热重载指定插件 |
| `xcli plugins remove <id>` | 卸载指定插件 |
| `xcli <site> <command> [options]` | 执行站点命令 |

## 返回值约定（ok/fail 模式）

所有 handler 返回 `CommandResult<T>`，使用 `ok()` / `fail()` 构造：

```typescript
import { ok, fail, withMeta } from 'xcli';

// CommandResult<T> = { success, data, message?, tips, meta? }

// 成功
return ok({ items: [...] }, ['共 10 条']);

// 失败（业务错误）
return fail('未找到结果', ['请检查关键词']);

// 附加元数据
return withMeta(ok(data), { duration: 1200 });
```

### ok() vs fail() vs ctx.error()

| 场景 | 方式 | 说明 |
|------|------|------|
| 成功返回数据 | `return ok(data, tips?)` | 正常结果 |
| 业务错误 | `return fail(message, tips?)` | token 过期、数据为空、参数无效 |
| 系统错误 | `ctx.error(msg)` + `return fail(msg)` | 网络异常、page 为 null |

**Tips 引擎**: 当 handler 抛出异常时，框架自动匹配错误消息生成上下文建议（如 ctx.page 相关、网络超时等）。

**规则**: 不要在 handler 中直接 throw，用 `fail()` 返回结构化错误。

## 生命周期

```
loadPlugin(path)
  │
  ├─ jiti 编译 index.ts
  ├─ 执行 export default(api)  → 注册 site/command/login/logout
  ├─ mount() → 执行 onLoad 回调
  └─ status = 'loaded'

unloadPlugin(id)
  │
  ├─ unmount() → 执行 onUnload 回调
  ├─ 清理: commands / flags / tools / eventHandlers / sites
  └─ status = 'unloaded'

reloadPlugin(id)
  │
  ├─ unmount()
  └─ loadPlugin(path)  ← 重新编译
```

## 插件加载搜索路径

1. `./.xcli/plugins/` — 当前目录
2. `../.xcli/plugins/` — 父目录
3. `~/.xcli/plugins/` — 全局用户目录

同名插件：本地优先于全局，后加载覆盖先加载。

## 命名规范

| 对象 | 规范 | 示例 |
|------|------|------|
| 插件目录 | `{序号}-{名称}` 或纯名称 | `01-static`, `baidu` |
| 站点名 | `kebab-case`，与目录名一致 | `01-static`, `baidu` |
| 命令名 | `kebab-case` | `scrape`, `reveal-phone` |
| 参数名 | `camelCase` | `maxItems`, `sortBy` |

## IDE 类型提示

在插件目录创建 `tsconfig.json` 继承 xcli 提供的类型配置：

```json
{
  "extends": "../tsconfig.plugins.json"
}
```

或将 `tsconfig.plugins.json` 路径配置到 IDE 的 TypeScript 项目中，获得 `xcli` 模块的完整类型提示。

## 详细文档

- API 完整参考: [references/api-reference.md](references/api-reference.md)
- 4 种模板详解: [references/templates.md](references/templates.md)
- 最佳实践与常见问题: [references/best-practices.md](references/best-practices.md)
