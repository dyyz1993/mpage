# xcli 插件开发指南

## 1. 快速开始

### 创建插件目录

```
.xcli/plugins/my-plugin/
├── index.ts      # 插件入口（必须）
└── package.json  # 包配置（如有额外依赖）
```

### 最小插件代码

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: 'my-plugin',
    url: 'https://example.com',
  });

  site.command('hello', {
    description: '打个招呼',
    parameters: z.object({
      name: z.string().describe('你的名字'),
    }),
    handler: async (params, ctx) => {
      return { message: `你好, ${params.name}!` };
    },
  });
}
```

### 安装和运行

插件放在以下目录会自动加载（优先级从高到低）：

1. `./.xcli/plugins/` — 当前目录
2. `../.xcli/plugins/` — 父目录
3. `~/.xcli/plugins/` — 全局用户目录

同名插件：本地优先于全局，后加载覆盖先加载。

`.ts` 文件由 jiti 运行时编译，无需预编译。

---

## 2. 插件 API 参考

### `xcli.createSite(config)`

注册一个站点插件，返回 `SiteInstance`。

```typescript
const site = xcli.createSite({
  name: 'my-site',                  // 站点唯一标识，kebab-case
  url: 'https://example.com',       // 站点首页（可选）
  description: '示例站点',           // 描述（可选）
  requiresLogin: false,             // 是否需要登录（默认 false）
  isLogin: async (ctx) => {         // 自定义登录状态检测（可选）
    const token = await ctx.storage.get('auth_token');
    return !!token;
  },
});
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 站点标识，kebab-case |
| `url` | `string` | 否 | 站点首页 URL |
| `description` | `string` | 否 | 站点描述 |
| `requiresLogin` | `boolean` | 否 | 是否需要登录，默认 false |
| `isLogin` | `(ctx) => Promise<boolean>` | 否 | 自定义登录状态检测函数 |

返回值：`SiteInstance`（链式调用）

### `site.command(name, config)`

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
    return { data: [], total: 0 };
  },
});
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 命令名，kebab-case |
| `description` | `string` | 是 | 命令描述 |
| `parameters` | `ZodSchema` | 否 | Zod schema，定义输入参数 |
| `result` | `ZodSchema` | 否 | Zod schema，定义输出结构 |
| `requiresLogin` | `boolean` | 否 | 此命令是否需要登录 |
| `examples` | `Array<{cmd, description}>` | 否 | 使用示例 |
| `tips` | `string[]` | 否 | 提示信息 |
| `handler` | `(params, ctx) => Promise<T>` | 是 | 命令处理函数 |

**命名规范**：命令名使用 kebab-case，如 `scrape`、`reveal-phone`、`export`。

#### `handler` 函数签名

```typescript
handler: async (params, ctx) => {
  // params: 由 Zod schema 解析和验证后的参数
  // ctx: CommandContext
  return result;
}
```

#### `CommandContext` 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `args` | `string[]` | 原始命令行参数 |
| `options` | `Record<string, unknown>` | 解析后的选项 |
| `cwd` | `string` | 当前工作目录 |
| `page` | `Page \| null` | Playwright Page 实例 |
| `storage` | `StorageContext` | 插件持久化存储 |
| `output` | `OutputContext` | 输出配置（mode/color/emoji） |
| `error` | `(msg: string) => void` | 报告错误 |
| `config` | `Record<string, unknown>` | 插件配置 |
| `site` | `SiteInstance` | 当前站点实例 |
| `browser` | `{ executablePath: string }` | 浏览器可执行路径 |

### `ctx.page` — Playwright Page

浏览器页面实例，用于页面操作。

**何时可用**：当 daemon 已启动浏览器并打开页面时 `ctx.page` 非 null。纯 API 调用场景（直接用 fetch）不需要 page。

```typescript
handler: async (params, ctx) => {
  if (!ctx.page) {
    return { error: '浏览器页面不可用' };
  }

  await ctx.page.goto('https://example.com', {
    waitUntil: 'domcontentloaded',
  });

  const title = await ctx.page.title();
  await ctx.page.fill('#search', params.keyword);
  await ctx.page.click('.search-btn');
  await ctx.page.waitForTimeout(2000);

  const results = await ctx.page.locator('.result-item').allTextContents();
  return { results };
}
```

**常用方法**：

| 方法 | 说明 |
|------|------|
| `page.goto(url, options)` | 导航到 URL |
| `page.fill(selector, value)` | 填充输入框 |
| `page.click(selector)` | 点击元素 |
| `page.waitForTimeout(ms)` | 等待指定时间 |
| `page.waitForSelector(sel)` | 等待元素出现 |
| `page.locator(selector)` | 获取元素定位器 |
| `page.title()` | 获取页面标题 |
| `page.evaluate(fn)` | 在页面中执行 JS |
| `page.screenshot(options)` | 截图 |

**务必做 null 检查**：`ctx.page` 可能为 null。

### `ctx.storage` — 持久化存储

键值对存储，数据持久化到 `~/.xcli/storage/<plugin-id>.json`。

```typescript
// 写入
await ctx.storage.set('auth_token', 'xxx');
await ctx.storage.set('config', { theme: 'dark', lang: 'zh' });

// 读取
const token = await ctx.storage.get<string>('auth_token');

// 删除
await ctx.storage.delete('auth_token');

// 所有 key
const allKeys = await ctx.storage.keys();

// 清空
await ctx.storage.clear();
```

| 方法 | 签名 | 说明 |
|------|------|------|
| `get<T>` | `(key: string) => Promise<T \| null>` | 读取，不存在返回 null |
| `set<T>` | `(key: string, value: T) => Promise<void>` | 写入（立即持久化） |
| `delete` | `(key: string) => Promise<void>` | 删除指定 key |
| `clear` | `() => Promise<void>` | 清空所有数据 |
| `keys` | `() => Promise<string[]>` | 获取所有 key |

**存储位置**：`~/.xcli/storage/<plugin-id>.json`，其中 plugin-id 为插件目录名。

### `site.login(handler)` / `site.logout(handler)`

注册登录/登出处理器。

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

site.logout(async (ctx) => {
  await ctx.storage.delete('auth_token');
});
```

### 其他 XCLIAPI 方法

```typescript
// 注册全局 flag
xcli.registerFlag({
  name: 'verbose',
  short: 'v',
  type: 'boolean',
  description: '详细输出',
  global: true,
});

// 注册 tool
xcli.registerTool({
  name: 'my-tool',
  description: '自定义工具',
  execute: async (params, signal) => {
    return { result: 'done' };
  },
});

// 生命周期回调
xcli.onLoad(async () => {
  console.log('插件加载完成');
});
xcli.onUnload(async () => {
  console.log('插件卸载');
});

// 事件监听
xcli.onEvent('command:after', (event) => {
  console.log(`命令执行完成: ${event.type}`);
});
```

---

## 3. 插件生命周期

```
加载阶段：
  jiti 编译 index.ts → 调用 export default 函数 → 执行 onLoad 回调 → status: 'loaded'

卸载阶段：
  执行 onUnload 回调 → 清理注册的命令/flags/tools/事件 → status: 'unloaded'

重载阶段：
  unmount → 重新 jiti import → mount → status: 'loaded'
```

### onLoad / onUnload

```typescript
export default function (xcli: XCLIAPI) {
  let timer: NodeJS.Timeout;

  xcli.onLoad(async () => {
    timer = setInterval(() => console.log('heartbeat'), 60000);
  });

  xcli.onUnload(async () => {
    clearInterval(timer);
  });

  // ...
}
```

**注意事项**：
- `onLoad` 在插件函数执行完毕后调用
- `onUnload` 中抛出的错误会被静默吞掉，不影响其他插件卸载
- 卸载时所有注册的命令、flags、tools、事件处理器都会被自动清理

---

## 4. 插件管理命令

| 命令 | 说明 |
|------|------|
| `xcli plugins list` | 列出所有已加载插件 |
| `xcli plugins info <name>` | 查看插件详情（命令列表、状态等） |
| `xcli plugins reload <name>` | 热重载指定插件（无需重启） |
| `xcli plugins unload <name>` | 卸载指定插件 |
| `xcli install <source>` | 从指定来源安装插件 |
| `xcli remove <name>` | 删除插件 |

插件状态：
- `loaded` — 已加载，正常工作
- `unloaded` — 已卸载
- `error` — 加载出错

---

## 5. 模板

### static — 静态页面采集

适用场景：目标网站无登录、无反爬，直接 HTTP 请求获取数据。

```typescript
export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: 'static-site',
    url: 'https://example.com',
  });

  site.command('list', {
    description: '获取列表数据',
    parameters: z.object({
      page: z.number().optional().default(1),
    }),
    handler: async (params, _ctx) => {
      const res = await fetch(`https://example.com/api/list?page=${params.page}`);
      return res.json();
    },
  });
}
```

### dynamic — 动态页面采集

适用场景：页面需要 JavaScript 渲染，或需要模拟用户交互（点击、滚动等）。

```typescript
export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: 'dynamic-site',
    url: 'https://example.com',
  });

  site.command('scrape', {
    description: '采集动态内容',
    handler: async (_params, ctx) => {
      if (!ctx.page) return { error: '需要浏览器页面' };
      await ctx.page.goto('https://example.com/data', { waitUntil: 'networkidle' });
      await ctx.page.waitForSelector('.data-loaded');
      const items = await ctx.page.locator('.item').allTextContents();
      return { items };
    },
  });
}
```

### login — 需要登录的站点

适用场景：需要登录后才能访问数据，需要管理 token/session。

```typescript
export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: 'login-site',
    url: 'https://example.com',
    requiresLogin: true,
  });

  site.command('login', {
    description: '登录',
    requiresLogin: false,
    parameters: z.object({
      username: z.string(),
      password: z.string(),
    }),
    handler: async (params, ctx) => {
      const res = await fetch('https://example.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.token) {
        await ctx.storage.set('auth_token', data.token);
        return { success: true };
      }
      return { success: false, message: data.message };
    },
  });

  site.command('data', {
    description: '获取需登录的数据',
    requiresLogin: true,
    handler: async (_params, ctx) => {
      const token = await ctx.storage.get<string>('auth_token');
      const res = await fetch('https://example.com/api/data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });
}
```

### api — 纯 API 调用

适用场景：目标提供 API 接口，无需浏览器，直接 HTTP 请求。

```typescript
export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: 'api-site',
  });

  site.command('query', {
    description: '查询数据',
    parameters: z.object({
      keyword: z.string(),
    }),
    handler: async (params, _ctx) => {
      const res = await fetch(`https://api.example.com/search?q=${encodeURIComponent(params.keyword)}`);
      return res.json();
    },
  });
}
```

---

## 6. 最佳实践

### 命名规范

- 插件目录名：`{序号}-{名称}`（如 `32-ecommerce`）或纯名称（如 `baidu`）
- 命令名：kebab-case（如 `reveal-phone`、`scrape`）
- 站点名：kebab-case，与目录名一致

### 错误处理

```typescript
site.command('fetch', {
  description: '获取数据',
  handler: async (_params, ctx) => {
    try {
      const res = await fetch('https://example.com/api');
      if (!res.ok) {
        ctx.error(`HTTP ${res.status}: ${await res.text()}`);
        return { success: false };
      }
      return await res.json();
    } catch (err) {
      ctx.error(err instanceof Error ? err.message : '未知错误');
      return { success: false };
    }
  },
});
```

- 使用 `ctx.error(msg)` 报告错误
- handler 中 try/catch 包裹网络请求
- 返回结构化的错误信息，不要直接抛异常

### 登录状态管理

```typescript
// 推荐：登录后存 token，后续命令从 storage 取
site.command('login', {
  handler: async (params, ctx) => {
    const { token } = await doLogin(params);
    await ctx.storage.set('auth_token', token);
    return { success: true };
  },
});

site.command('data', {
  requiresLogin: true,
  handler: async (_params, ctx) => {
    const token = await ctx.storage.get<string>('auth_token');
    if (!token) return { success: false, message: '请先登录' };
    // ...
  },
});
```

### 全分页采集模式

```typescript
site.command('scrape', {
  description: '采集全部分页数据',
  handler: async (_params, ctx) => {
    const token = await ctx.storage.get<string>('auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    const firstPage = await fetchJSON(`${API}/items?page=1`, { headers });
    const allItems = [...firstPage.items];

    for (let page = 2; page <= firstPage.totalPages; page++) {
      const res = await fetchJSON(`${API}/items?page=${page}`, { headers });
      allItems.push(...res.items);
    }

    return {
      summary: { total: firstPage.totalItems, collected: allItems.length },
      data: allItems,
    };
  },
});
```

### 提取公共工具函数

```typescript
async function fetchJSON(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}
```

在文件顶部定义 `fetchJSON` 等 helper，handler 内直接调用，保持代码简洁。

---

## 7. 常见问题

### 插件不加载？

1. 检查文件路径是否正确：`.xcli/plugins/<name>/index.ts`
2. 检查 `export default function (xcli: XCLIAPI) { ... }` 签名是否正确
3. 运行 `xcli plugins list` 查看状态是否为 `error`
4. 运行 `xcli plugins info <name>` 查看具体错误信息
5. 检查 TypeScript 语法错误（jiti 会实时编译）

### `ctx.page` 为 null？

- daemon 未启动浏览器时 `page` 为 null
- 纯 API 调用场景不需要 page，直接用 `fetch`
- 如果必须使用 page，加上 null 检查并给出明确提示

```typescript
if (!ctx.page) {
  return { error: '此命令需要浏览器页面，请确认 daemon 已启动' };
}
```

### storage 数据丢失？

- 存储文件在 `~/.xcli/storage/<plugin-id>.json`
- plugin-id 由插件目录名决定（如 `32-ecommerce` → `32-ecommerce.json`）
- 重命名插件目录会导致 storage 对应不上（不会丢失，只是找不到）
- `clear()` 会清空所有数据，谨慎使用

### 如何热重载插件？

```
xcli plugins reload my-plugin
```

无需重启整个进程，插件会重新编译和加载。

### 如何在插件间共享逻辑？

插件之间不得直接 import。如需共享：

1. 将公共逻辑发布为 npm 包，各插件分别依赖
2. 通过事件系统通信：`xcli.onEvent('event-name', handler)`
3. 放到 `~/.xcli/plugins/_shared/` 等约定目录，jiti import

### parameters 中 `z.coerce.number()` vs `z.number()`

命令行参数都是字符串。如果参数需要转为 number：

- `z.number()` — 严格要求 number 类型，命令行传入的 string 会校验失败
- `z.coerce.number()` — 自动将 string 转为 number，推荐用于命令行参数

```typescript
parameters: z.object({
  page: z.coerce.number().default(1),   // ✅ 推荐
  page: z.number().default(1),           // ❌ 可能失败
})
```
