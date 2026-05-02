# 插件开发经验沉淀

> 本文档记录了在开发 36 个爬虫案例插件过程中积累的经验和最佳实践

## 📋 目录

- [常见陷阱](#常见陷阱)
- [开发模式](#开发模式)
- [数据提取技巧](#数据提取技巧)
- [验证逻辑](#验证逻辑)
- [错误处理](#错误处理)
- [性能优化](#性能优化)

---

## 🚨 常见陷阱

### 1. Playwright/JavaScript 混用

**问题描述**:
在 `ctx.page.evaluate()` 中使用了 Playwright 特定的选择器语法（如 `:has-text()`），但 `evaluate` 是在浏览器上下文中执行纯 JavaScript。

**错误示例**:
```typescript
const data = await ctx.page.evaluate(() => {
  const button = document.querySelector('button:has-text("发送单个请求")'); // ❌ 错误
  // ...
});
```

**正确示例**:
```typescript
const data = await ctx.page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button'));
  const button = buttons.find((b) => b.textContent?.includes('发送单个请求')); // ✅ 正确
  // ...
});
```

**解决方法**:
- `ctx.page.evaluate()` 中使用纯 JavaScript API
- Playwright 特定的选择器只能用在 `ctx.page` 方法中（如 `waitForSelector`, `click` 等）
- 在 `evaluate` 中需要通过 `textContent.includes()` 或其他方式查找元素

### 2. 多参数传递给 evaluate

**问题描述**:
`ctx.page.evaluate()` 不支持多个参数，需要包装成对象。

**错误示例**:
```typescript
const data = await ctx.page.evaluate(async (requestCount, requestDelay) => { // ❌ 错误
  // ...
}, params.requests, params.delay);
```

**正确示例**:
```typescript
const data = await ctx.page.evaluate(async ({ requestCount, requestDelay }) => { // ✅ 正确
  // ...
}, { requestCount: params.requests, requestDelay: params.delay });
```

**解决方法**:
- 将多个参数包装成一个对象
- 在 evaluate 函数中解构对象参数

### 3. 等待选择器超时

**问题描述**:
使用 `waitForSelector()` 等待不存在的元素，导致超时。

**错误示例**:
```typescript
await ctx.page.waitForSelector('h2'); // ❌ 页面可能只有 h1
```

**正确示例**:
```typescript
// 方法1：先访问页面，查看实际元素
const hasH2 = await ctx.page.evaluate(() => !!document.querySelector('h2'));
if (hasH2) {
  await ctx.page.waitForSelector('h2');
}

// 方法2：使用更宽松的选择器
await ctx.page.waitForSelector('h1, h2'); // ✅ 匹配任意一个
```

**解决方法**:
- 先访问页面查看实际 HTML 结构
- 使用更宽松的选择器（如 `h1, h2`）
- 或者先检查元素是否存在，再等待

### 4. TypeScript 类型注解在 .mjs 文件中

**问题描述**:
在 `.mjs` 文件中使用 TypeScript 类型注解导致语法错误。

**错误示例** (`tools/test-plugins.mjs`):
```javascript
const results = []; // const 不能重新赋值
function testPlugin(pluginId: string) { // TypeScript 语法
  // ...
}
```

**正确示例**:
```javascript
let results = []; // 使用 let
function testPlugin(pluginId) { // 移除类型注解
  // ...
}
```

**解决方法**:
- `.mjs` 文件只使用纯 JavaScript
- 移除所有 TypeScript 类型注解（`type`, `: string`, `: boolean` 等）
- 使用 `let` 替代 `const`（如果需要重新赋值）

---

## 🛠️ 开发模式

### 开发新插件的最佳流程

#### 步骤 1: 访问并分析页面

```bash
# 使用 curl 或 webfetch 查看页面结构
curl -s https://example.com | grep "<h"
```

#### 步骤 2: 创建插件模板

```bash
# 使用生成器创建模板
node tools/generate-plugins.mjs
```

#### 步骤 3: 实现 scrape 命令

```typescript
handler: async (params, ctx) => {
  // 1. 导航到页面
  await ctx.page.goto(url);
  
  // 2. 等待关键元素
  await ctx.page.waitForSelector('h1');
  
  // 3. 提取数据
  const data = await ctx.page.evaluate(() => {
    // 纯 JavaScript 逻辑
    const results = [];
    // ...
    return results;
  });
  
  return { data, tips: ['采集成功'] };
}
```

#### 步骤 4: 实现 verify 命令（可选但推荐）

```typescript
handler: async (params, ctx) => {
  // 复用 scrape 逻辑
  const data = await scrapeLogic(params, ctx);
  
  const errors = [];
  
  // 验证数据
  if (!Array.isArray(data)) {
    errors.push({ field: 'data', expected: 'array', actual: typeof data });
  }
  
  if (data.length === 0) {
    errors.push({ field: 'length', expected: '> 0', actual: '0' });
  }
  
  const status = errors.length === 0 ? 'pass' : 'fail';
  return { status, data, errors, tips: status === 'pass' ? ['校验通过'] : ['校验失败'] };
}
```

#### 步骤 5: 测试单个插件

```bash
# 测试 scrape
xcli/dist/bin/xcli.js {plugin-id} scrape

# 测试 verify
xcli/dist/bin/xcli.js {plugin-id} verify
```

#### 步骤 6: 运行完整测试

```bash
node tools/test-plugins.mjs
```

---

## 🎯 数据提取技巧

### 1. 使用 textContent 而不是 innerText

**推荐**:
```typescript
const text = element.textContent?.trim() || '';
```

**不推荐**:
```typescript
const text = element.innerText; // 可能为 undefined
```

### 2. 处理 emoji 和特殊字符

**问题**: `textContent` 可能包含 emoji，导致验证失败。

**解决方法**:
```typescript
// 移除 emoji
const author = authorEl?.textContent?.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() || '';
```

### 3. 提取数字和日期

**提取数字**:
```typescript
const viewsMatch = viewsEl?.textContent?.replace(/[^\d]/g, '');
const views = parseInt(viewsMatch || '0', 10);
```

**提取日期**:
```typescript
const dateMatch = dateEl?.textContent?.match(/\d{4}-\d{2}-\d{2}/);
const date = dateMatch?.[0] || '';
```

### 4. 查找包含特定文本的元素

**方法 1: Array.from + find**
```typescript
const buttons = Array.from(document.querySelectorAll('button'));
const button = buttons.find((b) => b.textContent?.includes('发送单个请求'));
```

**方法 2: XPath（如果 Playwright 支持）**
```typescript
const button = document.evaluate(
  "//button[contains(text(), '发送单个请求')]",
  document,
  null,
  XPathResult.FIRST_ORDERED_NODE_TYPE
).singleNodeValue;
```

### 5. 处理相对路径和 URL 拼接

```typescript
const url = link.getAttribute('href') || '';

// 如果是相对路径，拼接完整 URL
if (url.startsWith('/') || !url.startsWith('http')) {
  const fullUrl = new URL(url, window.location.href).href;
  return fullUrl;
}

return url;
```

---

## ✅ 验证逻辑

### 1. 验证数据结构

```typescript
// 验证是否为数组
if (!Array.isArray(data)) {
  errors.push({ field: 'data', expected: 'array', actual: typeof data });
}

// 验证长度
if (data.length < expectedLength) {
  errors.push({ field: 'length', expected: `>= ${expectedLength}`, actual: String(data.length) });
}
```

### 2. 验证每个字段

```typescript
data.forEach((item, i) => {
  // 验证必需字段
  if (!item.title || typeof item.title !== 'string') {
    errors.push({
      field: `[${i}].title`,
      expected: 'non-empty string',
      actual: String(item.title || 'undefined'),
    });
  }
  
  // 验证字段类型
  if (typeof item.views !== 'number' || !Number.isInteger(item.views)) {
    errors.push({
      field: `[${i}].views`,
      expected: 'integer',
      actual: typeof item.views,
    });
  }
  
  // 验证正则表达式
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
    errors.push({
      field: `[${i}].date`,
      expected: 'YYYY-MM-DD format',
      actual: item.date,
    });
  }
});
```

### 3. 验证特定值

```typescript
// 验证第一个元素的特定字段
if (data.length > 0) {
  const first = data[0];
  if (!first.title.includes('关键词')) {
    errors.push({
      field: '[0].title',
      expected: 'contains "关键词"',
      actual: first.title,
    });
  }
}
```

---

## 🚨 错误处理

### 1. 元素不存在

```typescript
const element = document.querySelector('.some-class');
if (!element) {
  console.error('元素未找到');
  return []; // 或者 throw new Error()
}
```

### 2. 属性未定义

```typescript
const href = link.getAttribute('href') || ''; // 提供默认值
const text = element.textContent?.trim() || ''; // 使用可选链
```

### 3. JSON 解析失败

```typescript
try {
  const data = JSON.parse(jsonString);
  return data;
} catch (e) {
  console.error('JSON 解析失败:', e);
  return null;
}
```

### 4. 网络请求超时

```typescript
try {
  await ctx.page.goto(url, { timeout: 30000 });
} catch (e) {
  if (e.message.includes('Timeout')) {
    console.error('页面加载超时');
    return { data: [], tips: ['页面加载超时'] };
  }
  throw e;
}
```

---

## ⚡ 性能优化

### 1. 减少页面等待时间

**不推荐**:
```typescript
await new Promise((resolve) => setTimeout(resolve, 5000)); // 固定等待 5 秒
```

**推荐**:
```typescript
// 等待特定元素
await ctx.page.waitForSelector('.data-loaded');

// 或者使用超时
await ctx.page.waitForSelector('.data-loaded', { timeout: 5000 });
```

### 2. 批量提取数据

**不推荐**:
```typescript
const results = [];
for (const item of items) {
  const data = await ctx.page.evaluate(() => {
    // 提取单个元素
  });
  results.push(data);
}
```

**推荐**:
```typescript
const data = await ctx.page.evaluate(() => {
  return items.map((item) => {
    // 批量提取所有元素
    return { ...item };
  });
});
```

### 3. 使用 Page.evaluate 代替多次交互

**不推荐**:
```typescript
for (let i = 0; i < 10; i++) {
  await ctx.page.click('.next-button');
  await new Promise((resolve) => setTimeout(resolve, 500));
  const data = await ctx.page.evaluate(() => ...);
  results.push(data);
}
```

**推荐**:
```typescript
const data = await ctx.page.evaluate(async () => {
  const results = [];
  for (let i = 0; i < 10; i++) {
    const button = document.querySelector('.next-button');
    if (button) {
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      results.push(extractData());
    }
  }
  return results;
});
```

---

## 📝 插件模板

### 完整的插件模板

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

// 数据 schema
const itemSchema = z.object({
  field1: z.string().describe('字段说明'),
  field2: z.number().int().describe('字段说明'),
});

// 结果 schema
const resultSchema = z.object({
  data: z.array(itemSchema),
  tips: z.array(z.string()).optional().default([]),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '{id}-{name}',
    url: 'https://example.com',
    requiresLogin: false, // 或 true
  });

  // scrape 命令
  plugin.command('scrape', {
    description: '描述采集功能',
    parameters: z.object({
      // 参数定义
      count: z.number().optional().default(10),
    }),
    result: z.object({
      data: resultSchema,
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli {id}-{name} scrape',
        output: `data:
  - field1: "值1"
tips:
  - "采集成功"`,
      },
    ],
    handler: async (params, ctx) => {
      // 1. 导航到页面
      await ctx.page.goto('https://example.com');
      await ctx.page.waitForSelector('h1');
      
      // 2. 提取数据
      const data = await ctx.page.evaluate(() => {
        const results: Array<{ field1: string; field2: number }> = [];
        
        // 提取逻辑
        const elements = document.querySelectorAll('.item');
        elements.forEach((el) => {
          const field1 = el.querySelector('.field1')?.textContent?.trim() || '';
          const field2Text = el.querySelector('.field2')?.textContent?.replace(/[^\d]/g, '') || '0';
          const field2 = parseInt(field2Text, 10);
          
          results.push({ field1, field2 });
        });
        
        return results;
      });
      
      // 3. 返回结果
      return {
        data,
        tips: [`采集到 ${data.length} 条数据`],
      };
    },
  });

  // verify 命令（可选但推荐）
  plugin.command('verify', {
    description: '自动验证采集结果',
    parameters: z.object({}),
    result: z.object({
      status: z.enum(['pass', 'fail']),
      data: z.array(itemSchema),
      errors: z.array(z.object({
        field: z.string(),
        expected: z.string(),
        actual: z.string(),
      })),
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli {id}-{name} verify',
        output: `status: pass
data:
  - field1: "值1"
errors: []
tips:
  - "校验通过"`,
      },
    ],
    handler: async (params, ctx) => {
      // 复用 scrape 逻辑
      await ctx.page.goto('https://example.com');
      await ctx.page.waitForSelector('h1');
      
      const data = await ctx.page.evaluate(() => {
        // 同 scrape 的提取逻辑
        const results: Array<any> = [];
        // ...
        return results;
      });
      
      // 验证数据
      const errors: Array<{ field: string; expected: string; actual: string }> = [];
      
      if (!Array.isArray(data)) {
        errors.push({ field: 'data', expected: 'array', actual: typeof data });
      }
      
      if (data.length === 0) {
        errors.push({ field: 'length', expected: '> 0', actual: '0' });
      }
      
      data.forEach((item: any, i: number) => {
        if (!item.field1 || typeof item.field1 !== 'string') {
          errors.push({
            field: `[${i}].field1`,
            expected: 'non-empty string',
            actual: String(item.field1),
          });
        }
      });
      
      const status = errors.length === 0 ? 'pass' : 'fail';
      const tips = status === 'pass' ? ['校验通过'] : [`发现 ${errors.length} 个问题`];
      
      return { status, data, errors, tips };
    },
  });
}
```

---

## 🔍 调试技巧

### 1. 查看页面结构

```bash
# 使用 curl 查看页面 HTML
curl -s https://example.com | grep -A 10 "<h1"
```

### 2. 在浏览器中测试 JavaScript

```typescript
// 在 ctx.page.evaluate() 中使用 console.log
const data = await ctx.page.evaluate(() => {
  console.log('开始提取数据...');
  console.log('元素数量:', document.querySelectorAll('.item').length);
  // ...
});
```

### 3. 截图查看页面

```bash
# 使用 xcli 截图
xcli --session {session-name} screenshot
```

### 4. 分步调试

```typescript
// 分步测试每个步骤
await ctx.page.goto(url);
await ctx.page.waitForSelector('h1');

// 测试选择器
const hasElement = await ctx.page.evaluate(() => {
  return !!document.querySelector('.some-class');
});
console.log('元素存在:', hasElement);

// 测试提取
const data = await ctx.page.evaluate(() => {
  return document.querySelector('.some-class')?.textContent;
});
console.log('提取的文本:', data);
```

---

## 📚 参考资料

- [Playwright API 文档](https://playwright.dev/docs/api/class-page)
- [Zod 验证库文档](https://zod.dev/)
- [xCLI 插件开发指南](./PLUGINS-README.md)
- [36 个案例实施方案](./36-cases-implementation-plan.md)

---

## 🎓 最佳实践总结

1. **先访问页面，分析结构** - 不要假设页面结构
2. **使用纯 JavaScript** - 在 evaluate 中只使用标准 API
3. **参数包装成对象** - 多个参数传递给 evaluate
4. **验证关键元素** - 提取前检查元素是否存在
5. **实现 verify 命令** - 提高插件质量
6. **错误处理** - 不要让异常导致整个插件崩溃
7. **性能优化** - 减少不必要的等待和交互
8. **充分测试** - 单个插件测试 + 完整测试
9. **记录经验** - 遇到问题及时记录
10. **持续改进** - 根据测试结果优化代码
