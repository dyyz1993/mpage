# xcli 插件 API 参考

## xcli.createSite(config)

注册一个站点插件，返回 `SiteInstance`（支持链式调用）。

```typescript
const site = xcli.createSite({
  name: 'my-site',
  url: 'https://example.com',
  description: '示例站点',
  requiresLogin: false,
  isLogin: async (ctx) => {
    const token = await ctx.storage.get('auth_token');
    return !!token;
  },
});
```

### 参数表

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 站点唯一标识，kebab-case，如 `32-ecommerce` |
| `url` | `string` | 否 | 站点首页 URL |
| `description` | `string` | 否 | 站点描述 |
| `requiresLogin` | `boolean` | 否 | 是否需要登录，默认 `false` |
| `isLogin` | `(ctx) => Promise<boolean>` | 否 | 自定义登录状态检测函数 |

返回值：`SiteInstance`

---

## site.command(name, config)

注册一个命令。支持链式调用。

```typescript
site.command('scrape', {
  description: '采集数据',
  parameters: z.object({
    keyword: z.string().describe('搜索关键词'),
    page: z.number().optional().default(1).describe('页码'),
  }),
  result: z.object({
    data: z.array(z.unknown()),
    total: z.number(),
  }),
  requiresLogin: false,
  examples: [
    { cmd: 'xcli my-site scrape --keyword 手机', description: '搜索手机' },
  ],
  tips: ['支持分页，使用 --page 指定页码'],
  handler: async (params, ctx) => {
    return ok({ data: [], total: 0 });
  },
});
```

### 参数表

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 命令名，kebab-case，如 `scrape`、`reveal-phone` |
| `description` | `string` | 是 | 命令描述 |
| `scope` | `CommandScope` | 否 | 命令作用域，默认 `'page'` |
| `override` | `boolean` | 否 | 是否可被同名命令覆盖，默认 `true` |
| `parameters` | `ZodSchema` | 否 | Zod schema，定义输入参数 |
| `result` | `ZodSchema` | 否 | Zod schema，定义输出结构 |
| `requiresLogin` | `boolean` | 否 | 此命令是否需要登录，默认 `false` |
| `examples` | `Array<{cmd, description}>` | 否 | 使用示例 |
| `tips` | `string[]` | 否 | 提示信息 |
| `handler` | `(params, ctx) => Promise<CommandResult>` | 是 | 命令处理函数 |

### handler 函数签名

```typescript
handler: async (params, ctx) => {
  // params: 由 Zod schema 解析和验证后的参数
  // ctx: CommandContext
  return ok(data);       // 或 fail(message)
}
```

---

## CommandScope — 命令作用域

命令按资源依赖分为 4 个 scope 层级：

```typescript
type CommandScope = 'project' | 'browser' | 'page' | 'element';
```

| Scope | 需要的资源 | 典型命令 | ctx.page |
|-------|-----------|---------|----------|
| `project` | 无 | config, plugins, create, install | `null` |
| `browser` | 浏览器实例 | open, close | `null` |
| `page` | 活跃页面 | goto, screenshot, html | 可用 |
| `element` | 页面 + 选择器 | click, fill, get, press | 可用 |

默认 scope 为 `'page'`。框架在执行前自动检查 scope 可用性。

### scope 声明

```typescript
// 纯 API 命令，不需要浏览器
site.command('query', {
  scope: 'project',
  handler: async (params) => { /* fetch... */ },
});

// 需要页面 + 选择器的交互命令
site.command('click', {
  scope: 'element',
  handler: async (params, ctx) => { /* ctx.page 可用 */ },
});
```

### scope 与 override 配合

```typescript
// 插件覆盖内建的 screenshot 命令
site.command('screenshot', {
  scope: 'page',
  override: true,  // 默认 true
  handler: async (params, ctx) => { /* ... */ },
});

// 禁止被其他插件覆盖
site.command('core-action', {
  scope: 'page',
  override: false,
  handler: async (params, ctx) => { /* ... */ },
});
```

---

## CommandResult<T> — 统一返回值

所有 handler 应返回 `CommandResult<T>` 结构：

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

## ok() / fail() / withMeta() — helper 函数

从 `'xcli'` 导入，用于构造 `CommandResult`。

### ok(data, tips?)

成功时使用。自动设置 `success: true`。

```typescript
import { ok, fail, withMeta } from 'xcli';

// 基本用法
return ok({ items: [...], total: 10 });

// 带 tips
return ok({ items: [...] }, ['共 10 条', '支持分页']);

// 不需要 data 时
return ok(null, ['操作完成']);
```

### fail(message, tips?)

失败时使用。自动设置 `success: false, data: null`。

```typescript
// 业务错误
return fail('未找到结果');
return fail('token 已过期', ['请使用 xcli <site> login 重新登录']);
return fail('参数错误', ['limit 必须 > 0']);
```

### withMeta(result, meta)

给已有 `CommandResult` 附加元数据。

```typescript
const start = Date.now();
// ... 执行操作
return withMeta(ok(data), { duration: Date.now() - start });
```

### wrapResult(raw) — 兼容旧格式

如果 handler 返回的不是 `CommandResult` 结构，`wrapResult` 会自动包装为 `ok(raw)`。
框架内部使用，插件一般不需要直接调用。

---

## Tips 引擎

当 handler 执行过程中抛出未捕获异常时，框架自动分析错误消息并生成上下文建议。

### 自动匹配规则

| 错误关键词 | 生成的 Tips |
|------------|-------------|
| `ctx.page` | 提醒做 null 检查、纯 API 插件不需要 page |
| `NOT_LOGGED_IN` | 提示登录命令或 `site.requireLogin()` |
| `INVALID_ARGS` | 提示使用 `z.coerce.number()` 或 coercion 已自动处理 |
| `ECONNREFUSED` | 检查目标网站可访问性 |
| `Timeout` / `waiting for selector` | 建议用 `waitForSelector` 替代固定等待 |

### 手动提供 tips

handler 正常返回时，通过 `ok()` / `fail()` 第二个参数传递：

```typescript
return ok(data, [`共 ${data.length} 条结果`]);
return fail('未找到数据', ['请检查选择器', '尝试放宽搜索条件']);
```

---

## Param Coercion — 参数自动转换

CLI 参数全部为字符串。框架在 Zod 解析前自动根据 schema 类型转换：

- `z.number()` → 字符串 `"3"` 自动转为数字 `3`
- `z.boolean()` → 字符串 `"true"` / `"1"` 自动转为 `true`
- `z.string()` → 保持不变

**无需手动使用 `z.coerce.number()`**，直接写 `z.number()` 即可：

```typescript
parameters: z.object({
  page: z.number().optional().default(1),   // CLI 传入 "3" 自动转为 3
  limit: z.number().default(10),
  verbose: z.boolean().default(false),       // CLI 传入 "true" 自动转为 true
  keyword: z.string().describe('关键词'),    // 字符串不转换
}),
```

> **注意**: `z.coerce.number()` 仍然可用（框架先 coerce 再传给 Zod），但不再必须。

---

## CommandContext 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `args` | `string[]` | 原始命令行参数 |
| `options` | `Record<string, unknown>` | 解析后的选项 |
| `cwd` | `string` | 当前工作目录 |
| `page` | `Page \| null` | Playwright Page 实例（由 worker 进程提供） |
| `storage` | `StorageContext` | 插件持久化存储 |
| `output` | `OutputContext` | 输出配置（mode/color/emoji） |
| `error` | `(msg: string) => void` | 报告错误 |
| `config` | `Record<string, unknown>` | 插件配置 |
| `site` | `SiteInstance` | 当前站点实例 |
| `browser` | `{ executablePath: string }` | 浏览器可执行路径 |

> **Daemon 不直接操作浏览器**。所有浏览器操作通过 IPC 路由到 session 对应的 worker 进程执行。CommandContext 中的 `page` 由 worker 进程注入。

---

## ctx.page — Playwright Page

浏览器页面实例，用于页面操作。

**何时可用**：当 daemon 已启动浏览器并打开页面时 `ctx.page` 非 null。纯 API 调用场景（直接用 fetch）不需要 page。

**务必做 null 检查**：

```typescript
if (!ctx.page) {
  return fail('浏览器页面不可用，请确认 daemon 已启动');
}
```

### 常用方法

| 方法 | 说明 |
|------|------|
| `page.goto(url, options)` | 导航到 URL，options 含 `waitUntil: 'domcontentloaded' \| 'networkidle'` 等 |
| `page.fill(selector, value)` | 填充输入框 |
| `page.click(selector)` | 点击元素 |
| `page.waitForTimeout(ms)` | 等待指定毫秒数 |
| `page.waitForSelector(sel)` | 等待元素出现 |
| `page.waitForLoadState(state)` | 等待页面加载状态，如 `'domcontentloaded'`、`'networkidle'` |
| `page.locator(selector)` | 获取元素定位器 |
| `page.title()` | 获取页面标题 |
| `page.content()` | 获取页面 HTML |
| `page.evaluate(fn, ...args)` | 在页面中执行 JS 并返回结果 |
| `page.screenshot(options)` | 截图 |

### page.evaluate 典型用法

```typescript
// 传入参数（第二个参数会作为 fn 的参数传入）
const body = JSON.stringify({ keyword: 'iPhone' });
const response = await ctx.page.evaluate(async (b) => {
  const res = await fetch('https://api.example.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: b,
  });
  return res.json();
}, body);
```

```typescript
// DOM 提取
const articles = await ctx.page.evaluate(() => {
  const results: Array<{ title: string; url: string }> = [];
  document.querySelectorAll('h2').forEach((h2) => {
    results.push({
      title: h2.textContent?.trim() || '',
      url: h2.querySelector('a')?.getAttribute('href') || '',
    });
  });
  return results;
});
```

---

## ctx.storage — 持久化存储

键值对存储，数据持久化到 `~/.xcli/storage/<plugin-id>.json`。

`plugin-id` 由插件目录名决定（如 `32-ecommerce` → `32-ecommerce.json`）。

### 方法表

| 方法 | 签名 | 说明 |
|------|------|------|
| `get<T>` | `(key: string) => Promise<T \| null>` | 读取，不存在返回 `null` |
| `set<T>` | `(key: string, value: T) => Promise<void>` | 写入（立即持久化） |
| `delete` | `(key: string) => Promise<void>` | 删除指定 key |
| `clear` | `() => Promise<void>` | 清空所有数据 |
| `keys` | `() => Promise<string[]>` | 获取所有 key |

### 使用示例

```typescript
// 写入 token
await ctx.storage.set('auth_token', loginRes.token);

// 读取 token
const token = await ctx.storage.get<string>('auth_token');

// 删除 token（登出）
await ctx.storage.delete('auth_token');

// 查看所有 key
const allKeys = await ctx.storage.keys();
```

---

## site.login(handler) / site.logout(handler)

注册登录/登出处理器。

### site.login

```typescript
site.login(async (ctx) => {
  if (!ctx.page) throw new Error('需要浏览器页面');
  await ctx.page.goto('https://example.com/login');
  await ctx.page.fill('#username', 'admin');
  await ctx.page.fill('#password', '123456');
  await ctx.page.click('.login-btn');
  await ctx.page.waitForTimeout(2000);
  const token = await ctx.page.evaluate(() => localStorage.getItem('token'));
  await ctx.storage.set('auth_token', token);
});
```

### site.logout

```typescript
site.logout(async (ctx) => {
  await ctx.storage.delete('auth_token');
});
```

---

## 其他 XCLIAPI 方法

### registerFlag — 注册全局 flag

```typescript
xcli.registerFlag({
  name: 'verbose',
  short: 'v',
  type: 'boolean',
  description: '详细输出',
  global: true,
});
```

### registerTool — 注册 tool

```typescript
xcli.registerTool({
  name: 'my-tool',
  description: '自定义工具',
  execute: async (params, signal) => {
    return { result: 'done' };
  },
});
```

### onLoad / onUnload — 生命周期回调

```typescript
xcli.onLoad(async () => {
  console.log('插件加载完成');
});

xcli.onUnload(async () => {
  console.log('插件卸载');
});
```

- `onLoad` 在插件函数执行完毕后调用
- `onUnload` 中抛出的错误会被静默吞掉，不影响其他插件卸载
- 卸载时所有注册的命令、flags、tools、事件处理器都会被自动清理

### onEvent — 事件监听

```typescript
xcli.onEvent('command:after', (event) => {
  console.log(`命令执行完成: ${event.type}`);
});
```

插件之间不得直接 import，可通过事件系统通信。
