# 能力实践计划 - 通过插件填充缺失能力

> 本计划通过具体插件的开发，逐步填充 mpage 和 xcli 的缺失能力

## 📊 缺失能力概览

### mpage 缺失能力（11 个）

| 能力 | 优先级 | 适用插件 | 难度 | 预计时间 |
|------|--------|----------|------|----------|
| hover | 低 | 06-infinite-scroll, 24-social-media | ⭐⭐ | 0.5天 |
| press | 低 | 06-infinite-scroll, 24-social-media | ⭐⭐ | 0.5天 |
| select | 低 | 04-pagination | ⭐⭐ | 0.5天 |
| check | 低 | 所有表单相关插件 | ⭐⭐ | 0.5天 |
| structure | 中 | 所有插件（通用） | ⭐⭐⭐ | 1天 |
| a11y | 中 | 所有插件（通用） | ⭐⭐⭐ | 1天 |
| snapshot | 低 | 所有插件（通用） | ⭐⭐ | 0.5天 |
| humanize | 高 | 验证码相关插件（12-16） | ⭐⭐⭐⭐⭐ | 3-5天 |
| recorder | 高 | 录制回放插件 | ⭐⭐⭐⭐ | 2-3天 |
| network-intercept | 高 | 29-document-fragment, 30-xhr-intercept | ⭐⭐⭐⭐ | 2-3天 |
| cookie-manager | 中 | 10-login, 11-session | ⭐⭐⭐ | 1-2天 |

### xcli 缺失能力（6 个）

| 能力 | 优先级 | 适用插件 | 难度 | 预计时间 |
|------|--------|----------|------|----------|
| retry-policy | 中 | 所有插件（通用） | ⭐⭐⭐ | 1-2天 |
| session-storage | 中 | 10-login, 11-session | ⭐⭐⭐ | 1-2天 |
| captcha-integration | 高 | 验证码插件（12-16） | ⭐⭐⭐⭐⭐ | 3-5天 |
| iframe-switch | 中 | 18-iframe-login | ⭐⭐⭐ | 1-2天 |
| portal-tracker | 低 | 22-portal-teleport | ⭐⭐ | 0.5天 |
| data-export | 低 | 所有插件（通用） | ⭐⭐ | 1天 |

---

## 🎯 实践计划

### 第一阶段：基础能力填充（1-2 天）

#### 任务 1.1: hover 能力
**目标**: 在实际插件中练习鼠标悬停操作

**适用插件**: 06-infinite-scroll, 24-social-media

**实现步骤**:
1. 在 06-infinite-scroll 中使用 hover 检测"加载更多"按钮
2. 在 24-social-media 中使用 hover 展开"全文"链接

**代码示例**:
```typescript
// 06-infinite-scroll
await ctx.page.hover('.load-more-button');
const isExpanded = await ctx.page.evaluate(() => {
  const button = document.querySelector('.load-more-button');
  return button?.classList.contains('expanded');
});
```

**验证**: 测试 hover 操作是否触发期望的交互

#### 任务 1.2: press 能力
**目标**: 在实际插件中练习键盘操作

**适用插件**: 06-infinite-scroll, 24-social-media

**实现步骤**:
1. 在 24-social-media 中使用 press 模拟键盘滚动（PageDown）

**代码示例**:
```typescript
// 24-social-media
// 使用键盘滚动
await ctx.page.press('PageDown');
await ctx.page.waitForTimeout(500);

// 或使用 Enter 打开全文
await ctx.page.press('Enter');
```

**验证**: 测试键盘操作是否正常工作

#### 任务 1.3: select 能力
**目标**: 在实际插件中练习下拉框选择

**适用插件**: 04-pagination

**实现步骤**:
1. 添加一个参数 `pageSize` 用于选择每页显示数量
2. 使用 select 操作下拉框

**代码示例**:
```typescript
// 04-pagination
plugin.command('scrape', {
  parameters: z.object({
    pageSize: z.enum(['10', '20', '50']).default('20'),
  }),
  handler: async (params, ctx) => {
    // 选择每页显示数量
    await ctx.page.select('select[name="pageSize"]', params.pageSize);
    
    // 等待页面更新
    await ctx.page.waitForTimeout(1000);
    
    // 继续提取数据...
  },
});
```

**验证**: 测试下拉框选择是否生效

#### 任务 1.4: check 能力
**目标**: 在实际插件中练习复选框操作

**适用插件**: 所有表单相关插件（08-search, 10-login）

**实现步骤**:
1. 在 08-search 中添加复选框过滤器
2. 使用 check 操作

**代码示例**:
```typescript
// 08-search
plugin.command('scrape', {
  parameters: z.object({
    filters: z.object({
      includeImages: z.boolean().default(true),
      includeVideos: z.boolean().default(true),
    }),
  }),
  handler: async (params, ctx) => {
    // 设置过滤条件
    if (params.filters.includeImages) {
      await ctx.page.check('input[name="includeImages"]');
    }
    
    if (params.filters.includeVideos) {
      await ctx.page.check('input[name="includeVideos"]');
    }
    
    // 触发搜索
    await ctx.page.click('button[type="submit"]');
    await ctx.page.waitForSelector('.results');
    
    // 提取数据...
  },
});
```

**验证**: 测试复选框操作是否正确

#### 任务 1.5: snapshot 能力
**目标**: 在所有插件中添加截图功能

**适用插件**: 所有插件（通用）

**实现步骤**:
1. 在 scrape 命令完成后，可选地保存截图
2. 在 verify 命令失败时，自动保存错误截图

**代码示例**:
```typescript
// 通用改进
plugin.command('scrape', {
  parameters: z.object({
    saveSnapshot: z.boolean().default(false),
  }),
  handler: async (params, ctx) => {
    // 提取数据...
    const data = await extractData();
    
    // 可选：保存截图
    if (params.saveSnapshot) {
      const timestamp = Date.now();
      const screenshotPath = `.xcli/screenshots/${pluginId}-${timestamp}.png`;
      await ctx.page.screenshot({ path: screenshotPath });
      console.log(`📸 截图已保存: ${screenshotPath}`);
    }
    
    return { data };
  },
});

plugin.command('verify', {
  handler: async (params, ctx) => {
    // 验证数据...
    const errors = await verifyData();
    
    if (errors.length > 0) {
      // 失败时自动保存截图
      const timestamp = Date.now();
      const screenshotPath = `.xcli/screenshots/${pluginId}-error-${timestamp}.png`;
      await ctx.page.screenshot({ path: screenshotPath });
      console.log(`❌ 验证失败，截图已保存: ${screenshotPath}`);
    }
    
    return { status: errors.length === 0 ? 'pass' : 'fail', errors };
  },
});
```

**验证**: 测试截图功能是否正常保存

**预计时间**: 1-2 天

---

### 第二阶段：高级能力填充（3-5 天）

#### 任务 2.1: structure 能力
**目标**: 为所有插件添加页面结构提取能力

**适用插件**: 所有插件（通用）

**实现步骤**:
1. 使用 `structure` 命令提取页面结构
2. 将结构信息用于调试和分析

**代码示例**:
```typescript
// 在所有插件中添加 structure 命令
plugin.command('structure', {
  description: '提取页面结构',
  parameters: z.object({}),
  handler: async (params, ctx) => {
    const structure = await ctx.page.evaluate(() => {
      // 提取页面结构
      const extractStructure = (element: Element, depth = 0) => {
        const result: any = {
          tagName: element.tagName.toLowerCase(),
          attributes: {},
          children: [],
        };
        
        // 提取属性
        for (const attr of element.attributes) {
          if (attr.name === 'class' || attr.name === 'id') {
            result.attributes[attr.name] = attr.value;
          }
        }
        
        // 提取文本（最多50个字符）
        const text = element.textContent?.trim().slice(0, 50);
        if (text) {
          result.text = text + (text.length >= 50 ? '...' : '');
        }
        
        // 递归提取子元素（最多3层）
        if (depth < 3) {
          for (const child of element.children) {
            result.children.push(extractStructure(child, depth + 1));
          }
        }
        
        return result;
      };
      
      return extractStructure(document.body);
    });
    
    return { structure };
  },
});
```

**验证**: 测试结构提取是否正常

#### 任务 2.2: a11y 能力
**目标**: 为所有插件添加无障碍信息提取

**适用插件**: 所有插件（通用）

**实现步骤**:
1. 使用 `a11y` 命令提取无障碍树
2. 用于调试和验证

**代码示例**:
```typescript
// 在所有插件中添加 a11y 命令
plugin.command('a11y', {
  description: '提取无障碍信息',
  parameters: z.object({}),
  handler: async (params, ctx) => {
    const a11yTree = await ctx.page.evaluate(() => {
      // 提取无障碍树
      const extractA11yTree = (element: Element, depth = 0) => {
        const result: any = {
          role: element.getAttribute('role') || '',
          name: element.getAttribute('aria-label') || element.getAttribute('name') || '',
          children: [],
        };
        
        // 递归提取子元素
        for (const child of element.children) {
          const childTree = extractA11yTree(child, depth + 1);
          if (childTree.role || childTree.name) {
            result.children.push(childTree);
          }
        }
        
        return result;
      };
      
      return extractA11yTree(document.body);
    });
    
    return { a11yTree };
  },
});
```

**验证**: 测试无障碍信息提取是否正常

#### 任务 2.3: humanize 能力
**目标**: 为验证码相关插件添加人性化操作

**适用插件**: 验证码插件（12-16）

**实现步骤**:
1. 使用 Bezier 曲线生成鼠标轨迹
2. 添加随机延迟和微动

**代码示例**:
```typescript
// 13-captcha-slider
plugin.command('solve', {
  description: '解决滑块验证码',
  parameters: z.object({}),
  handler: async (params, ctx) => {
    // 计算滑动距离
    const distance = await ctx.page.evaluate(() => {
      const slider = document.querySelector('.slider-track');
      const handle = document.querySelector('.slider-handle');
      const trackRect = slider.getBoundingClientRect();
      const handleRect = handle.getBoundingClientRect();
      return trackRect.width - handleRect.width;
    });
    
    // 使用 humanize 模拟拖拽
    const humanize = new HumanizedPage(ctx.page);
    await humanize.drag({
      from: { x: 0, y: 0 }, // 相对坐标，会被计算
      to: { x: distance, y: 0 },
      steps: 20,
      duration: 1500,
    });
    
    return { success: true };
  },
});
```

**验证**: 测试人性化操作是否通过验证码

#### 任务 2.4: network-intercept 能力
**目标**: 实现网络请求拦截和数据提取

**适用插件**: 29-document-fragment, 30-xhr-intercept

**实现步骤**:
1. 拦截 XHR/Fetch 请求
2. 提取响应数据
3. 可选：修改请求或响应

**代码示例**:
```typescript
// 30-xhr-intercept
plugin.command('scrape', {
  handler: async (params, ctx) => {
    const responses: any[] = [];
    
    // 拦截网络请求
    await ctx.page.route('**/api/**', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      
      // 记录响应
      responses.push({
        url: route.request().url(),
        method: route.request().method(),
        status: response.status(),
        data,
      });
      
      // 返回响应
      return response;
    });
    
    // 触发 API 请求
    await ctx.page.goto(url);
    await ctx.page.click('.load-button');
    await ctx.page.waitForTimeout(2000);
    
    return { data: responses };
  },
});
```

**验证**: 测试网络拦截是否正常

#### 任务 2.5: cookie-manager 能力
**目标**: 实现 Cookie 管理和持久化

**适用插件**: 10-login, 11-session

**实现步骤**:
1. 实现保存和加载 Cookie
2. 实现跨会话 Cookie 持久化

**代码示例**:
```typescript
// 10-login
plugin.command('save-cookies', {
  description: '保存当前 Cookie',
  parameters: z.object({}),
  handler: async (params, ctx) => {
    const cookies = await ctx.context.cookies();
    
    // 保存到文件
    const cookiePath = `.xcli/cookies/${pluginId}.json`;
    await fs.promises.writeFile(cookiePath, JSON.stringify(cookies, null, 2));
    
    return { saved: cookies.length, path: cookiePath };
  },
});

plugin.command('load-cookies', {
  description: '加载保存的 Cookie',
  parameters: z.object({}),
  handler: async (params, ctx) => {
    const cookiePath = `.xcli/cookies/${pluginId}.json`;
    const cookies = JSON.parse(await fs.promises.readFile(cookiePath, 'utf-8'));
    
    // 加载 Cookie
    await ctx.context.addCookies(cookies);
    
    return { loaded: cookies.length, path: cookiePath };
  },
});
```

**验证**: 测试 Cookie 保存和加载是否正常

**预计时间**: 3-5 天

---

### 第三阶段：xcli 能力填充（3-5 天）

#### 任务 3.1: retry-policy 能力
**目标**: 为所有插件添加自动重试机制

**适用插件**: 所有插件（通用）

**实现步骤**:
1. 实现重试配置
2. 实现指数退避重试
3. 实现最大重试次数限制

**代码示例**:
```typescript
// 在所有插件中添加重试机制
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options = RETRY_CONFIG,
): Promise<T> {
  let lastError: Error;
  let delay = options.initialDelay;
  
  for (let i = 0; i < options.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`重试 ${i + 1}/${options.maxRetries}, 延迟 ${delay}ms: ${error.message}`);
      
      if (i < options.maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * options.backoffFactor, options.maxDelay);
      }
    }
  }
  
  throw lastError;
}

plugin.command('scrape', {
  handler: async (params, ctx) => {
    const data = await retryWithBackoff(async () => {
      await ctx.page.goto(url);
      await ctx.page.waitForSelector('.content');
      
      return await ctx.page.evaluate(() => {
        // 提取数据
        return extractData();
      });
    });
    
    return { data };
  },
});
```

**验证**: 测试重试机制是否正常

#### 任务 3.2: session-storage 能力
**目标**: 实现会话持久化

**适用插件**: 10-login, 11-session

**实现步骤**:
1. 实现会话保存和加载
2. 实现跨会话状态保持
3. 实现会话过期检测

**代码示例**:
```typescript
// 10-login
plugin.command('save-session', {
  description: '保存当前会话',
  parameters: z.object({}),
  handler: async (params, ctx) => {
    const cookies = await ctx.context.cookies();
    const localStorage = await ctx.page.evaluate(() => {
      return JSON.stringify(localStorage);
    });
    const sessionStorage = await ctx.page.evaluate(() => {
      return JSON.stringify(sessionStorage);
    });
    
    const session = {
      cookies,
      localStorage,
      sessionStorage,
      timestamp: Date.now(),
    };
    
    // 保存会话
    const sessionPath = `.xcli/sessions/${pluginId}.json`;
    await fs.promises.writeFile(sessionPath, JSON.stringify(session, null, 2));
    
    return { saved: true, path: sessionPath };
  },
});

plugin.command('load-session', {
  description: '加载保存的会话',
  parameters: z.object({}),
  handler: async (params, ctx) => {
    const sessionPath = `.xcli/sessions/${pluginId}.json`;
    const session = JSON.parse(await fs.promises.readFile(sessionPath, 'utf-8'));
    
    // 加载会话
    await ctx.context.addCookies(session.cookies);
    await ctx.page.evaluate((ls, ss) => {
      Object.assign(localStorage, JSON.parse(ls));
      Object.assign(sessionStorage, JSON.parse(ss));
    }, session.localStorage, session.sessionStorage);
    
    // 刷新页面以应用会话
    await ctx.page.reload();
    
    return { loaded: true, path: sessionPath };
  },
});
```

**验证**: 测试会话保存和加载是否正常

#### 任务 3.3: iframe-switch 能力
**目标**: 实现框架切换操作

**适用插件**: 18-iframe-login

**实现步骤**:
1. 检测 iframe 元素
2. 切换到 iframe 上下文
3. 在 iframe 中执行操作
4. 切换回主文档

**代码示例**:
```typescript
// 18-iframe-login
plugin.command('scrape', {
  handler: async (params, ctx) => {
    // 获取 iframe
    const iframe = ctx.page.frame('iframe[name="login"]');
    
    // 在 iframe 中操作
    await iframe.fill('input[name="username"]', 'admin');
    await iframe.fill('input[name="password"]', 'password');
    await iframe.click('button[type="submit"]');
    
    // 等待登录完成
    await iframe.waitForSelector('.success-message');
    
    // 提取登录信息
    const loginInfo = await iframe.evaluate(() => {
      return {
        username: document.querySelector('.username')?.textContent,
        loginTime: document.querySelector('.time')?.textContent,
      };
    });
    
    return { data: [loginInfo] };
  },
});
```

**验证**: 测试 iframe 操作是否正常

#### 任务 3.4: data-export 能力
**目标**: 为所有插件添加数据导出功能

**适用插件**: 所有插件（通用）

**实现步骤**:
1. 支持导出为 JSON、CSV、Excel 格式
2. 实现数据格式化
3. 实现文件保存

**代码示例**:
```typescript
// 在所有插件中添加 export 命令
plugin.command('export', {
  description: '导出数据',
  parameters: z.object({
    format: z.enum(['json', 'csv', 'excel']).default('json'),
    filename: z.string().optional(),
  }),
  handler: async (params, ctx) => {
    // 获取数据（复用 scrape 逻辑）
    const data = await scrapeData();
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = params.filename || `${pluginId}-${timestamp}.${params.format}`;
    
    // 导出数据
    let content;
    if (params.format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else if (params.format === 'csv') {
      content = convertToCSV(data);
    } else if (params.format === 'excel') {
      content = convertToExcel(data);
    }
    
    // 保存文件
    const exportPath = `.xcli/exports/${filename}`;
    await fs.promises.writeFile(exportPath, content);
    
    return { exported: data.length, path: exportPath, format: params.format };
  },
});

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map((item) => {
    return headers.map((header) => {
      const value = item[header];
      // 处理包含逗号的字段
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return String(value ?? '');
    });
  });
  
  return [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');
}
```

**验证**: 测试数据导出是否正常

**预计时间**: 3-5 天

---

## 📋 实施路线图

### Week 1: 基础能力填充（Day 1-2）
- [x] hover 能力（06-infinite-scroll, 24-social-media）
- [x] press 能力（06-infinite-scroll, 24-social-media）
- [x] select 能力（04-pagination）
- [x] check 能力（08-search, 10-login）
- [x] snapshot 能力（所有插件）

### Week 2: 高级能力填充（Day 3-7）
- [x] structure 能力（所有插件）
- [x] a11y 能力（所有插件）
- [ ] humanize 能力（验证码插件 12-16）
- [ ] network-intercept 能力（29, 30）
- [ ] cookie-manager 能力（10, 11）

### Week 3: xcli 能力填充（Day 8-12）
- [ ] retry-policy 能力（所有插件）
- [ ] session-storage 能力（10, 11）
- [ ] iframe-switch 能力（18）
- [ ] data-export 能力（所有插件）
- [ ] 集成测试

---

## 🎯 验证标准

### 能力验证
1. **功能验证**: 能力是否正常工作
2. **兼容性验证**: 是否与现有功能兼容
3. **性能验证**: 是否影响插件性能
4. **文档验证**: 是否有使用文档和示例

### 插件验证
1. **单元测试**: 测试能力函数
2. **集成测试**: 测试插件中的能力使用
3. **端到端测试**: 测试完整流程
4. **回归测试**: 确保不影响其他插件

---

## 📝 进度追踪

### 基础能力填充进度
- [ ] hover (0%)
- [ ] press (0%)
- [ ] select (0%)
- [ ] check (0%)
- [ ] snapshot (0%)

### 高级能力填充进度
- [ ] structure (0%)
- [ ] a11y (0%)
- [ ] humanize (0%)
- [ ] network-intercept (0%)
- [ ] cookie-manager (0%)

### xcli 能力填充进度
- [ ] retry-policy (0%)
- [ ] session-storage (0%)
- [ ] iframe-switch (0%)
- [ ] data-export (0%)

---

## 🚀 开始实践

### 步骤 1: 选择能力
```bash
# 查看能力实践计划
cat docs/capability-practice-plan.md
```

### 步骤 2: 查看相关插件
```bash
# 列出插件
ls .xcli/plugins/
```

### 步骤 3: 编辑插件
```bash
# 编辑插件文件
vim .xcli/plugins/{plugin-id}/index.ts
```

### 步骤 4: 测试能力
```bash
# 测试插件
xcli/dist/bin/xcli.js {plugin-id} scrape

# 或运行完整测试
node tools/test-plugins.mjs
```

### 步骤 5: 记录进展
```bash
# 更新进度追踪
vim docs/capability-practice-plan.md
```

---

## 💡 最佳实践

1. **逐步实施**: 从简单到复杂，逐步实施
2. **充分测试**: 每个能力都要充分测试
3. **文档记录**: 记录使用方法和注意事项
4. **持续改进**: 根据测试结果持续优化
5. **经验沉淀**: 及时记录经验到 `docs/plugin-development-guide.md`

---

## 📚 参考资料

- 插件开发指南: `docs/plugin-development-guide.md`
- 改进点追踪: `docs/improvements/tracking.md`
- Playwright API: https://playwright.dev/docs/api/class-page
- 最终完成报告: `FINAL-COMPLETE-REPORT.md`
