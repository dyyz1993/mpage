---
name: xcli-plugin-development
description: >
  开发 xcli 浏览器自动化插件。Use when: 创建 xcli 插件、编写 site.command handler、
  使用 ctx.page/ctx.storage、插件生命周期管理、安装/卸载/热重载插件。
---

# xcli 插件开发

## Quick Start

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
    result: z.object({
      data: z.array(z.object({ title: z.string(), url: z.string() })),
      tips: z.array(z.string()).optional().default([]),
    }),
    handler: async (params, ctx) => {
      await ctx.page.goto(ctx.site.url);
      await ctx.page.waitForSelector('h2');
      const items = await ctx.page.evaluate(() => {
        return Array.from(document.querySelectorAll('h2')).map((el) => ({
          title: el.textContent?.trim() || '',
          url: el.querySelector('a')?.getAttribute('href') || '',
        }));
      });
      return { data: items.slice(0, params.limit), tips: [`共 ${items.length} 条`] };
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
  handler: (params: z.infer<P>, ctx: CommandContext) => Promise<z.infer<R>>,
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
| `xcli plugins list` | 列出所有已加载插件及状态 |
| `xcli plugins install <path>` | 从路径安装插件 |
| `xcli plugins remove <id>` | 卸载指定插件 |
| `xcli <site> <command> [options]` | 执行站点命令 |

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

## 返回值约定

handler 返回值推荐统一结构：

```typescript
// 成功
{ success: true, data: T, tips?: string[] }

// 失败（业务错误，不抛异常）
{ success: false, message: '错误描述', data?: T }

// 需要 ctx.error() 报告的场景
ctx.error('网络请求失败');
return { success: false, message: '网络请求失败' };
```

**规则**：
- 业务错误（token 过期、数据为空）→ `return { success: false, message }` 
- 系统错误（网络异常、page 为 null）→ `ctx.error(msg)` + return
- `tips` 给 CLI 格式化用的辅助信息，不影响 success 判断
- 不要在 handler 中 throw，用 return 结构化错误

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

## 错误处理

```typescript
import { CommandError } from 'xcli';

// 在 handler 中抛出 CommandError
throw new CommandError('INVALID_ARGS', '参数错误: limit 必须 > 0');

// 或使用 ctx.error
ctx.error('页面加载超时');
```

## 常见模式

### 需要登录的插件

```typescript
const site = xcli.createSite({
  name: 'github',
  url: 'https://github.com',
  requiresLogin: true,
});

site.login(async (ctx) => {
  await ctx.page.goto('https://github.com/login');
  await ctx.page.fill('#login_field', ctx.options.username as string);
  await ctx.page.fill('#password', ctx.options.password as string);
  await ctx.page.click('[type="submit"]');
  await ctx.storage.set('auth_token', { loggedIn: true, at: Date.now() });
});

site.command('stars', {
  description: '列出 starred 仓库',
  requiresLogin: true,
  parameters: z.object({ limit: z.number().optional().default(30) }),
  handler: async (params, ctx) => {
    await ctx.site.requireLogin();
    // ...
  },
});
```

## 详细文档

- API 完整参考: [references/api-reference.md](references/api-reference.md)
- 4 种模板详解: [references/templates.md](references/templates.md)
- 最佳实践与常见问题: [references/best-practices.md](references/best-practices.md)
