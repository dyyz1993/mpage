# xcli 插件模板

四种基本模板，覆盖最常见的插件开发场景。

---

## static — 静态页面采集

### 适用场景

目标网站无登录、无反爬，页面内容可直接通过 HTTP 请求或简单 DOM 提取获取。

### 模板代码

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: 'static-site',
    url: 'https://example.com',
  });

  site.command('list', {
    description: '获取列表数据',
    parameters: z.object({
      page: z.coerce.number().optional().default(1),
    }),
    handler: async (params, _ctx) => {
      const res = await fetch(`https://example.com/api/list?page=${params.page}`);
      return res.json();
    },
  });
}
```

### Case Study: `01-static` 插件

采集静态 HTML 博客页面。使用 `ctx.page.goto()` 导航到页面，`page.waitForSelector()` 等待内容加载，`page.evaluate()` 在浏览器上下文中提取 DOM 数据。

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

const articleSchema = z.object({
  title: z.string(),
  url: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  author: z.string(),
  views: z.number().int().nonnegative(),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '01-static',
    url: 'https://example.com/static.html',
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '采集静态HTML页面数据',
    parameters: z.object({}),
    result: z.object({
      data: z.array(articleSchema),
      tips: z.array(z.string()).optional().default([]),
    }),
    handler: async (_params, ctx) => {
      await ctx.page.goto('https://example.com/static.html');
      await ctx.page.waitForSelector('h2');

      const articles = await ctx.page.evaluate(() => {
        const results: Array<{
          title: string; url: string; date: string; author: string; views: number;
        }> = [];
        document.querySelectorAll('h2').forEach((h2) => {
          const parent = h2.parentElement;
          if (!parent) return;
          results.push({
            title: h2.textContent?.trim() || '',
            url: h2.querySelector('a')?.getAttribute('href') || '',
            date: parent.querySelector('span:first-child')?.textContent?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '',
            author: parent.querySelectorAll('span')[1]?.textContent?.trim() || '',
            views: parseInt(parent.querySelectorAll('span')[2]?.textContent?.replace(/[^\d]/g, '') || '0', 10),
          });
        });
        return results;
      });

      return { data: articles, tips: [`采集到 ${articles.length} 篇文章`] };
    },
  });
}
```

**要点**：
- 无需登录，`requiresLogin: false`
- 通过 `page.evaluate()` 在浏览器环境中操作 DOM
- 用 Zod schema 定义 `result` 结构，确保输出类型安全

---

## dynamic — 动态页面采集

### 适用场景

页面需要 JavaScript 渲染，或需要模拟用户交互（点击、滚动、搜索等）。

### 模板代码

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

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

### Case Study: `08-search` 插件

搜索类动态页面：先导航到搜索页面，再通过 `page.evaluate()` 发起 POST 请求获取搜索结果。

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '08-search',
    url: 'https://example.com/search.html',
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '采集搜索结果数据',
    parameters: z.object({
      keyword: z.string().default('iPhone').describe('搜索关键词'),
    }),
    handler: async (params, ctx) => {
      await ctx.page.goto('https://example.com/search.html');
      await ctx.page.waitForLoadState('domcontentloaded');

      // 通过 page.evaluate 在浏览器上下文中发起 API 请求
      const body = JSON.stringify({ keyword: params.keyword || 'iPhone' });
      const response = await ctx.page.evaluate(async (b) => {
        const res = await fetch('https://example.com/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: b,
        });
        return res.json();
      }, body);

      return {
        data: response.results,
        tips: [`采集到 ${response.results.length} 条搜索结果，总计 ${response.total} 条`],
      };
    },
  });
}
```

**要点**：
- 用 `page.evaluate()` 在浏览器上下文中发起 fetch，可自动携带页面 cookie
- `waitForLoadState('domcontentloaded')` 确保页面基础结构加载完成
- 适合搜索、筛选等需要 POST 请求的场景

### Case Study: `04-pagination` 插件

分页采集：遍历所有页面，逐页提取数据后合并。

```typescript
// 核心模式：先采集第一页获取总页数，再循环采集剩余页
const firstPageData = await scrapePage(1);
allThreads.push(...firstPageData.threads);
totalPages = firstPageData.totalPages;

for (let page = 2; page <= totalPages; page++) {
  await new Promise((resolve) => setTimeout(resolve, 500)); // 避免请求过快
  const pageData = await scrapePage(page);
  allThreads.push(...pageData.threads);
}
```

---

## login — 需要登录的站点

### 适用场景

需要登录后才能访问数据，需要管理 token/session。

### 模板代码

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

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

### Case Study: `32-ecommerce` 插件

电商后台采集：登录 + 验证码 + 全分页 + 订单详情。是 login 模板的完整变体。

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

const TARGET = 'https://example.com/api/32';

async function fetchJSON(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '32-ecommerce',
    url: 'https://example.com/admin.html',
    requiresLogin: true,
  });

  // 1. 登录命令（requiresLogin: false，因为尚未登录）
  plugin.command('login', {
    description: '登录电商后台',
    requiresLogin: false,
    parameters: z.object({
      username: z.string().default('admin'),
      password: z.string().default('password'),
    }),
    handler: async (params, ctx) => {
      // 先获取验证码
      const captchaRes = await fetchJSON(`${TARGET}/captcha`);
      // 再登录
      const loginRes = await fetchJSON(`${TARGET}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: params.username,
          password: params.password,
          captcha: captchaRes.captcha,
        }),
      });
      if (!loginRes.success) {
        return { success: false, message: loginRes.message };
      }
      await ctx.storage.set('auth_token', loginRes.token);
      return { success: true, message: '登录成功' };
    },
  });

  // 2. 登出命令
  plugin.command('logout', {
    description: '退出登录',
    requiresLogin: false,
    handler: async (_params, ctx) => {
      await ctx.storage.delete('auth_token');
      return { success: true, message: '已退出登录' };
    },
  });

  // 3. 数据命令（requiresLogin: true，需要先登录）
  plugin.command('orders', {
    description: '采集订单列表',
    parameters: z.object({
      page: z.coerce.number().optional().default(1),
    }),
    handler: async (params, ctx) => {
      const token = await ctx.storage.get<string>('auth_token');
      if (!token) return { success: false, message: '请先登录' };
      return await fetchJSON(`${TARGET}/orders?page=${params.page}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  });

  // 4. 全分页采集
  plugin.command('scrape', {
    description: '采集所有订单（自动遍历全部分页）',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      const token = await ctx.storage.get<string>('auth_token');
      if (!token) return { success: false, message: '请先登录' };
      const headers = { Authorization: `Bearer ${token}` };

      const firstPage = await fetchJSON(`${TARGET}/orders?page=1`, { headers });
      const allOrders = [...firstPage.orders];

      for (let page = 2; page <= firstPage.totalPages; page++) {
        const res = await fetchJSON(`${TARGET}/orders?page=${page}`, { headers });
        allOrders.push(...res.orders);
      }

      return {
        summary: { totalOrders: firstPage.totalOrders, totalPages: firstPage.totalPages },
        orders: allOrders,
      };
    },
  });

  // 5. 详情命令
  plugin.command('detail', {
    description: '获取订单详情',
    parameters: z.object({ orderId: z.string() }),
    handler: async (params, ctx) => {
      const token = await ctx.storage.get<string>('auth_token');
      if (!token) return { success: false, message: '请先登录' };
      return await fetchJSON(`${TARGET}/order/${params.orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  });
}
```

**要点**：
- `login` 命令自身设 `requiresLogin: false`（因为尚未登录）
- 登录成功后将 token 存入 `ctx.storage`
- 所有需要登录的命令从 `ctx.storage` 取 token
- 文件顶部定义 `fetchJSON` 等 helper，保持 handler 简洁

---

## api — 纯 API 调用

### 适用场景

目标提供 API 接口，无需浏览器，直接 HTTP 请求。

### 模板代码

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

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
      const res = await fetch(
        `https://api.example.com/search?q=${encodeURIComponent(params.keyword)}`
      );
      return res.json();
    },
  });
}
```

### Case Study: `34-secondhand-market` 插件

二手市场采集：纯 API 调用 + 登录 + 全分页 + FormData 上传。

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

const TARGET = 'https://example.com/api/34';

async function fetchJSON(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '34-secondhand-market',
    url: 'https://example.com/market.html',
    requiresLogin: true,
  });

  plugin.command('login', { /* ... */ });

  // 全分页采集（while + hasMore 模式）
  plugin.command('scrape', {
    description: '采集所有商品',
    requiresLogin: true,
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      const token = await ctx.storage.get<string>('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      const firstPage = await fetchJSON(`${TARGET}/items?page=1`, { headers });
      const allItems = [...firstPage.items];

      let page = 2;
      while (firstPage.hasMore) {
        const res = await fetchJSON(`${TARGET}/items?page=${page}`, { headers });
        allItems.push(...res.items);
        if (!res.hasMore) break;
        page++;
      }

      return { summary: { total: allItems.length }, items: allItems };
    },
  });

  // FormData 上传
  plugin.command('publish', {
    description: '发布商品',
    requiresLogin: true,
    parameters: z.object({
      title: z.string(),
      description: z.string(),
      price: z.string(),
    }),
    handler: async (params, ctx) => {
      const token = await ctx.storage.get<string>('auth_token');
      const formData = new FormData();
      formData.append('title', params.title);
      formData.append('description', params.description);
      formData.append('price', params.price);

      const res = await fetch(`${TARGET}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      return res.json();
    },
  });
}
```

**要点**：
- 不需要浏览器，`ctx.page` 不使用
- 分页用 `while (hasMore)` 模式（适合不确定总页数的场景）
- 上传用 `FormData`，不要手动设置 `Content-Type`（浏览器自动加 boundary）

---

## 组合模式

真实插件往往是多种模板的组合。

### Case Study: `35-qa-community` 插件 — dynamic + login 组合

知识问答社区：需要登录才能投票，公开接口可浏览问题，Shadow DOM 内容提取。

```typescript
// 核心特征：
// 1. requiresLogin: true 但部分命令 requiresLogin: false（公开可浏览）
// 2. 登录流程包含验证码（先获取验证码再登录）
// 3. 使用 page.evaluate 提取 Shadow DOM 内容

plugin.command('user', {
  description: '获取用户信息（包含Shadow DOM内容）',
  requiresLogin: true,
  parameters: z.object({ questionId: z.string() }),
  handler: async (params, ctx) => {
    const userInfo = await ctx.page.evaluate((qId) => {
      const question = document.querySelector(`[data-id="${qId}"]`);
      const shadowHost = question?.querySelector('.author-info');
      const shadow = shadowHost?.shadowRoot;
      return {
        name: shadow?.querySelector('.author-name')?.textContent,
        avatar: shadow?.querySelector('.author-avatar')?.textContent,
      };
    }, params.questionId);
    return { questionId: params.questionId, user: userInfo };
  },
});
```

**要点**：
- 同一插件内命令可混合 `requiresLogin` 设置
- Shadow DOM 内容需要通过 `element.shadowRoot` 访问
- 验证码登录：先调用 captcha 接口获取验证码，再连同用户名密码一起提交
