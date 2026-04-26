# xcli 插件最佳实践

---

## 命名规范

| 对象 | 规范 | 示例 |
|------|------|------|
| 插件目录名 | `{序号}-{名称}` 或纯名称 | `32-ecommerce`、`baidu` |
| 命令名 | kebab-case | `scrape`、`reveal-phone`、`export` |
| 站点名（name） | kebab-case，与目录名一致 | `32-ecommerce` |
| 文件名 | kebab-case | `index.ts`、`plugin-loader.ts` |
| 类名 | PascalCase | `PluginLoader` |

---

## 错误处理模式（ok/fail）

### 基本原则

- 使用 `ok()` 返回成功，`fail()` 返回失败
- 使用 `ctx.error(msg)` 报告错误，不要 `console.error`
- handler 中 `try/catch` 包裹网络请求
- 返回 `CommandResult` 结构化错误，不要直接 `throw`

### 推荐模式

```typescript
import { ok, fail } from 'xcli';

site.command('fetch', {
  description: '获取数据',
  handler: async (_params, ctx) => {
    try {
      const res = await fetch('https://example.com/api');
      if (!res.ok) {
        ctx.error(`HTTP ${res.status}: ${await res.text()}`);
        return fail(`HTTP ${res.status}`);
      }
      const data = await res.json();
      return ok(data);
    } catch (err) {
      ctx.error(err instanceof Error ? err.message : '未知错误');
      return fail(err instanceof Error ? err.message : '未知错误');
    }
  },
});
```

### ok() / fail() / ctx.error() 的区别

| 场景 | 方式 | 说明 |
|------|------|------|
| 成功返回数据 | `return ok(data, tips?)` | 正常结果 |
| 业务错误 | `return fail(message, tips?)` | token 过期、数据为空、参数无效 |
| 系统错误 | `ctx.error(msg)` + `return fail(msg)` | 网络异常、page 为 null、文件读写失败 |

**禁止在 handler 中 throw Error**（除非是框架未捕获的真正异常）。
Tips 引擎会在未捕获异常时自动生成上下文建议。

### 提取公共 fetchJSON

在文件顶部定义 helper，避免每个 handler 重复错误处理：

```typescript
import { ok, fail } from 'xcli';

async function fetchJSON(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}
```

handler 中直接使用：

```typescript
handler: async (params, ctx) => {
  try {
    const data = await fetchJSON(`https://example.com/api/data?id=${params.id}`);
    return ok(data);
  } catch (err) {
    ctx.error(err instanceof Error ? err.message : '未知错误');
    return fail(err instanceof Error ? err.message : '未知错误');
  }
},
```

---

## 登录状态管理

### 推荐流程

```
login 命令 → 获取 token → ctx.storage.set('auth_token', token)
业务命令 → ctx.storage.get<string>('auth_token') → 携带 token 请求
logout 命令 → ctx.storage.delete('auth_token')
```

### 完整示例

```typescript
import { ok, fail } from 'xcli';

const site = xcli.createSite({
  name: 'my-site',
  requiresLogin: true,
  isLogin: async (ctx) => {
    const token = await ctx.storage.get('auth_token');
    return token !== null;
  },
});

// 登录
site.command('login', {
  description: '登录',
  requiresLogin: false, // 注意：login 命令自身不需要登录
  parameters: z.object({
    username: z.string(),
    password: z.string(),
  }),
  handler: async (params, ctx) => {
    const { token } = await doLogin(params);
    await ctx.storage.set('auth_token', token);
    return ok({ loggedIn: true }, ['登录成功']);
  },
});

// 业务命令
site.command('data', {
  description: '获取数据',
  requiresLogin: true,
  handler: async (_params, ctx) => {
    const token = await ctx.storage.get<string>('auth_token');
    if (!token) return fail('请先登录', ['使用 xcli my-site login']);
    // 使用 token 请求...
    return ok(data);
  },
});

// 登出
site.command('logout', {
  description: '退出登录',
  requiresLogin: false,
  handler: async (_params, ctx) => {
    await ctx.storage.delete('auth_token');
    return ok(null, ['已退出登录']);
  },
});
```

### 注意事项

- `login` 命令必须设 `requiresLogin: false`，否则会形成循环依赖
- token 可存字符串，也可存对象（含过期时间等元数据）
- 每个需要登录的命令内部做 token null 检查，给出明确提示

---

## 全分页采集模式

### 模式一：已知总页数

适用于 API 返回 `totalPages` 的场景。

```typescript
handler: async (_params, ctx) => {
  const token = await ctx.storage.get<string>('auth_token');
  const headers = { Authorization: `Bearer ${token}` };

  // 先请求第一页，获取总页数
  const firstPage = await fetchJSON(`${API}/items?page=1`, { headers });
  const allItems = [...firstPage.items];

  // 循环采集剩余页
  for (let page = 2; page <= firstPage.totalPages; page++) {
    const res = await fetchJSON(`${API}/items?page=${page}`, { headers });
    allItems.push(...res.items);
  }

  return ok({
    summary: { total: firstPage.totalItems, collected: allItems.length },
    data: allItems,
  });
},
```

### 模式二：hasMore 标志

适用于 API 返回 `hasMore` 布尔值的场景（不确定总页数）。

```typescript
handler: async (_params, ctx) => {
  const token = await ctx.storage.get<string>('auth_token');
  const headers = { Authorization: `Bearer ${token}` };

  const firstPage = await fetchJSON(`${API}/items?page=1`, { headers });
  const allItems = [...firstPage.items];

  let page = 2;
  while (firstPage.hasMore) {
    const res = await fetchJSON(`${API}/items?page=${page}`, { headers });
    allItems.push(...res.items);
    if (!res.hasMore) break;
    page++;
  }

  return ok({
    summary: { totalCollected: allItems.length },
    data: allItems,
  });
},
```

### 模式三：DOM 分页

适用于需要通过浏览器翻页的场景。在请求间加延迟避免过快。

```typescript
handler: async (params, ctx) => {
  if (!ctx.page) return fail('需要浏览器页面');

  const allData: Array<Record<string, string>> = [];

  for (let page = 1; page <= maxPage; page++) {
    const url = page === 1 ? params.url : `${params.url}?page=${page}`;
    await ctx.page.goto(url);
    await ctx.page.waitForSelector('.data-loaded');

    const items = await ctx.page.evaluate(() => {
      return Array.from(document.querySelectorAll('.item')).map((el) => ({
        title: el.querySelector('.title')?.textContent?.trim() || '',
      }));
    });

    allData.push(...items);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return ok(allData, [`共采集 ${allData.length} 条`]);
},
```

---

## 提取公共工具函数

在 `index.ts` 文件顶部定义 helper 函数，handler 内直接调用。

### 常用 helper

```typescript
// 带错误处理的 fetch
async function fetchJSON(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

// 带认证头的 fetch
async function authFetch(url: string, token: string, options: RequestInit = {}) {
  return fetchJSON(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

// 带延迟
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
```

### 使用示例

```typescript
site.command('orders', {
  handler: async (params, ctx) => {
    const token = await ctx.storage.get<string>('auth_token');
    if (!token) return fail('请先登录', ['使用 xcli <site> login']);
    const data = await authFetch(`${TARGET}/orders?page=${params.page}`, token);
    return ok(data);
  },
});
```

### 多命令插件共享逻辑

当多个命令有相同的 DOM 提取或数据处理逻辑时，提取到文件顶部的 helper 函数：

```typescript
function extractItems(page: Page) {
  return page.evaluate(() => {
    const items = document.querySelectorAll('.item');
    return Array.from(items).map(el => ({
      title: el.querySelector('.title')?.textContent?.trim() || '',
      url: el.querySelector('a')?.href || '',
    }));
  });
}

site.command('scrape', {
  handler: async (_params, ctx) => {
    if (!ctx.page) return fail('需要浏览器');
    await ctx.page.goto(BASE_URL);
    const items = await extractItems(ctx.page);
    return ok(items);
  },
});

site.command('search', {
  handler: async (params, ctx) => {
    if (!ctx.page) return fail('需要浏览器');
    await ctx.page.goto(`${BASE_URL}/search?q=${params.keyword}`);
    const items = await extractItems(ctx.page);
    return ok(items);
  },
});
```

---

## Zod 参数类型注意事项

CLI 字符串参数会由框架自动转换（Param Coercion），直接用 `z.number()` / `z.boolean()` 即可。

### z.coerce.number() vs z.number()

```typescript
parameters: z.object({
  page: z.number().default(1),          // ✅ 框架自动将 "3" 转为 3
  page: z.coerce.number().default(1),   // ✅ 也可以，但不再必须
})
```

### 常用 Zod 模式

```typescript
// 可选带默认值
page: z.number().optional().default(1)

// 枚举
mode: z.enum(['fast', 'slow']).default('fast')

// 字符串日期
date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// 可选字符串
keyword: z.string().optional()

// 带 describe 的参数（自动生成帮助文档）
keyword: z.string().describe('搜索关键词')
```

---

## 快速开发工作流

### xcli create — 一键创建

```bash
# 创建插件（默认 static 模板）
xcli create my-scraper

# 指定模板
xcli create my-api --template api

# 创建到项目目录（而非全局）
xcli create my-plugin --template dynamic --project
```

可用模板：`static`、`dynamic`、`login`、`api`

### xcli plugins doctor — 诊断问题

```bash
# 检查所有插件的健康状态
xcli plugins doctor
```

自动检测：
- 缺失 `index.ts` 或 `package.json`
- 缺少 `export default function` 签名
- 使用了 Zod 但未导入
- 访问 `ctx.page` 但未做 null 检查
- 插件加载错误

### 开发循环

```bash
# 1. 创建插件
xcli create my-plugin --template static

# 2. 编辑
vim .xcli/plugins/my-plugin/index.ts

# 3. 测试
xcli my-plugin scrape --keyword test

# 4. 修改后热重载
xcli plugins reload my-plugin

# 5. 诊断
xcli plugins doctor
```

---

## IDE 类型提示

插件开发时获得 TypeScript 类型提示，在插件目录创建 `tsconfig.json`：

```json
{
  "extends": "../tsconfig.plugins.json"
}
```

`tsconfig.plugins.json` 内容（xcli 项目自带）：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "paths": {
      "xcli": ["./src/index.ts"]
    }
  },
  "include": [".xcli/plugins/**/*.ts"]
}
```

配合 `xcli.d.ts` 声明文件，IDE 可提供：
- `XCLIAPI`、`SiteInstance`、`CommandContext` 等类型
- `ok()`、`fail()`、`withMeta()` 函数签名
- `CommandResult<T>` 接口定义

---

## 常见问题

### 插件不加载？

排查步骤：

1. 检查文件路径是否正确：`.xcli/plugins/<name>/index.ts`
2. 检查 `export default function (xcli: XCLIAPI) { ... }` 签名是否正确
3. 运行 `xcli plugins list` 查看状态是否为 `error`
4. 运行 `xcli plugins doctor` 自动诊断问题
5. 运行 `xcli plugins info <name>` 查看具体错误信息
6. 检查 TypeScript 语法错误（jiti 会实时编译，语法错误会阻止加载）

### ctx.page 为 null？

- daemon 未启动浏览器时 `page` 为 null
- 纯 API 调用场景不需要 page，直接用 `fetch`
- 如果必须使用 page，加上 null 检查：

```typescript
if (!ctx.page) {
  return fail('此命令需要浏览器页面，请确认 daemon 已启动');
}
```

### storage 数据丢失？

- 存储文件在 `~/.xcli/storage/<plugin-id>.json`
- `plugin-id` 由插件目录名决定（如 `32-ecommerce` → `32-ecommerce.json`）
- 重命名插件目录会导致 storage 对应不上（数据不会丢失，只是新名字找不到旧文件）
- `clear()` 会清空所有数据，谨慎使用

### 如何热重载插件？

```bash
xcli plugins reload my-plugin
```

无需重启整个进程，插件会重新编译和加载。

### 如何在插件间共享逻辑？

插件之间不得直接 import。如需共享：

1. **npm 包**：将公共逻辑发布为 npm 包，各插件分别依赖
2. **事件系统**：通过 `xcli.onEvent('event-name', handler)` 通信
3. **约定目录**：放到 `~/.xcli/plugins/_shared/` 等约定目录，用 jiti import

### 插件目录命名影响 storage

`plugin-id` 等于插件目录名。如果目录名从 `my-plugin` 改为 `01-my-plugin`，storage 文件从 `my-plugin.json` 变为 `01-my-plugin.json`，之前的存储数据需要手动迁移。

### page.evaluate 的参数传递

`page.evaluate` 的第二个参数会序列化后传入回调函数。只能传可序列化的值（不能传函数、DOM 节点等）：

```typescript
// ✅ 正确
const body = JSON.stringify({ keyword: 'iPhone' });
const result = await ctx.page.evaluate(async (b) => {
  const data = JSON.parse(b);
  return data;
}, body);

// ❌ 错误 — 不能传函数
await ctx.page.evaluate((fn) => fn(), () => doSomething());
```
