# 36个爬虫案例自动化验证方案

## 📋 目录结构

```
.xcli/plugins/
├── 01-static/                    # ✅ 已完成
│   ├── index.ts                  # 插件入口
│   ├── package.json              # 包配置
│   ├── VERIFICATION.md           # 手动验证文档
│   └── README.md                 # 插件说明（推荐）
├── 02-extract-urls/             # ✅ 已完成
├── 03-extract-content/          # ✅ 已完成
├── 04-pagination/               # ✅ 已完成
├── 05-url-params/                # ✅ 已完成
├── 06-infinite-scroll/           # ✅ 已完成
├── 07-lazy-load/                # ✅ 已完成
├── 08-search/                    # ✅ 已完成
├── 09-rate-limit/               # ⚠️ 需要实现
├── 10-login/                     # ⚠️ 需要实现
├── 11-session/                   # ⚠️ 需要实现
├── 12-captcha-numeric/           # ⚠️ 需要实现
├── 13-captcha-slider/            # ⚠️ 需要实现
├── 14-captcha-click/             # ⚠️ 需要实现
├── 15-captcha-rotate/            # ⚠️ 需要实现
├── 16-captcha-arithmetic/        # ⚠️ 需要实现
├── 17-file-upload/               # ⚠️ 需要实现
├── 18-iframe-login/              # ⚠️ 需要实现
├── 19-dynamic-captcha/           # ⚠️ 需要实现
├── 20-comprehensive/             # ⚠️ 需要实现
├── 21-shadow-dom/                # ⚠️ 需要实现
├── 22-portal-teleport/           # ⚠️ 需要实现
├── 23-css-in-js/                 # ⚠️ 需要实现
├── 24-social-media/              # ✅ 已完成
├── 25-video-website/              # ⚠️ 需要实现
├── 26-job-site/                  # ⚠️ 需要实现
├── 27-real-estate/               # ⚠️ 需要实现
├── 28-virtual-scroll/            # ⚠️ 需要实现
├── 29-document-fragment/         # ⚠️ 需要实现
├── 30-xhr-intercept/             # ⚠️ 需要实现
├── 31-comprehensive-challenge/   # ⚠️ 需要实现
├── 32-ecommerce-seller/          # ✅ 已完成
├── 33-government-tender/         # ⚠️ 需要实现
├── 34-secondhand-market/         # ✅ 已完成
├── 35-qa-community/              # ✅ 已完成
├── 36-stock-trading/             # ⚠️ 需要实现
│
tests/
├── plugins/                      # 插件自动化测试
│   ├── e2e/
│   │   ├── fixtures/             # 测试 fixture
│   │   ├── plugin-test-runner.ts # 测试运行器
│   │   └── *.spec.ts            # 插件测试用例
│   ├── integration/              # 集成测试
│   └── unit/                     # 单元测试
├── framework/                   # 测试框架核心
│   ├── test-config.ts            # Vitest 配置
│   ├── test-helpers.ts           # 测试辅助函数
│   └── assertions.ts             # 自定义断言
│
docs/
├── 36-cases-implementation-plan.md   # 36个案例实施计划
├── plugin-development-guide.md      # 插件开发指南
└── improvement-tracking.md           # 改进点追踪
│
.github/
└── workflows/
    └── test-plugins.yml         # CI/CD 工作流
```

## 🎯 插件命名规范

### 基本规则
- **格式**: `{序号}-{简短名称}`
- **序号**: 两位数，01-36，对齐 36 个案例
- **名称**: kebab-case，不超过 20 字符
- **示例**:
  - `01-static` ✅
  - `12-captcha-numeric` ✅
  - `24-social-media` ✅

### 验证码场景命名
- `12-captcha-numeric` - 数字验证码
- `13-captcha-slider` - 滑块验证码
- `14-captcha-click` - 点选验证码
- `15-captcha-rotate` - 旋转验证码
- `16-captcha-arithmetic` - 算术验证码

### 业务场景命名
- `24-social-media` - 社交媒体
- `25-video-website` - 视频网站
- `26-job-site` - 招聘网站
- `27-real-estate` - 房产网站
- `32-ecommerce-seller` - 电商卖家中心
- `33-government-tender` - 政府招标网
- `34-secondhand-market` - 二手交易平台
- `35-qa-community` - 知识问答社区
- `36-stock-trading` - 证券交易行情

## 📦 插件目录结构

### 标准结构
```
{id}-{name}/
├── index.ts                    # 插件入口（必须）
├── package.json                # 包配置（必须）
├── VERIFICATION.md             # 手动验证文档（推荐）
├── README.md                   # 插件说明（推荐）
├── types.ts                    # 类型定义（可选，复杂场景）
├── helpers.ts                  # 辅助函数（可选）
└── schemas.ts                  # Zod schemas（可选，复杂场景）
```

### index.ts 模板
```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

// 数据 schema（如果复杂，提取到 schemas.ts）
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
    url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/{id}.html',
    requiresLogin: false, // 或 true
  });

  // scrape 命令：采集数据
  plugin.command('scrape', {
    description: '描述采集功能',
    parameters: z.object({
      // 参数定义
    }),
    result: z.object({
      data: resultSchema,
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli {id}-{name} scrape',
        output: '输出示例',
      },
    ],
    handler: async (params, ctx) => {
      // 采集逻辑
      return { data, tips };
    },
  });

  // verify 命令：自动验证
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
        output: '输出示例',
      },
    ],
    handler: async (params, ctx) => {
      // 验证逻辑
      return { status, data, errors, tips };
    },
  });
}
```

### package.json 模板
```json
{
  "name": "{id}-{name}",
  "version": "1.0.0",
  "type": "module"
}
```

### VERIFICATION.md 模板
```markdown
# {案例标题} - 手动验证文档

## 案例 URL
https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/{id}.html

## 验证目标
- 目标1：描述
- 目标2：描述

## 预期结果
```
{
  "data": [
    {
      "field1": "值1",
      "field2": 123
    }
  ],
  "tips": ["提示信息"]
}
```

## 验证步骤
1. 运行命令: `xcli {id}-{name} scrape`
2. 检查输出是否符合预期
3. 运行命令: `xcli {id}-{name} verify`
4. 确认验证通过

## 已知问题
- 问题1：描述
- 问题2：描述

## 改进建议
- 建议1：描述
- 建议2：描述
```

## 🧪 自动化测试框架

### 测试分层

```
tests/
├── e2e/                         # E2E 测试（完整流程）
│   ├── plugin-e2e.spec.ts      # 所有插件的 E2E 测试
│   ├── fixtures/               # 测试 fixture
│   │   ├── cases/              # 36 个案例的 fixture
│   │   │   ├── 01-static.ts
│   │   │   ├── 02-extract-urls.ts
│   │   │   └── ...
│   │   └── common.ts           # 公共 fixture
│   └── plugin-test-runner.ts  # 测试运行器
├── integration/                # 集成测试（模块交互）
│   ├── mpage-xcli.spec.ts     # mpage + xcli 集成
│   └── plugin-loader.spec.ts  # 插件加载器测试
└── unit/                       # 单元测试（函数级别）
    └── helpers.spec.ts        # 辅助函数测试
```

### E2E 测试示例

```typescript
// tests/e2e/plugin-e2e.spec.ts
import { describe, it, expect } from 'vitest';
import { runPluginCommand } from './plugin-test-runner';

describe('36个爬虫案例 E2E 测试', () => {
  describe('Phase 1: 基础难度（1-5）', () => {
    it('01-static: 静态HTML页面读取', async () => {
      const result = await runPluginCommand('01-static', 'scrape');
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].title).toContain('Python爬虫');
    });

    it('01-static: 自动验证', async () => {
      const result = await runPluginCommand('01-static', 'verify');
      expect(result.status).toBe('pass');
      expect(result.errors).toHaveLength(0);
    });

    it('02-extract-urls: 提取页面URL', async () => {
      const result = await runPluginCommand('02-extract-urls', 'scrape');
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].url).toMatch(/^\/blog\//);
    });

    // ... 其他测试用例
  });

  describe('Phase 2: 中等难度（6-12）', () => {
    it('06-infinite-scroll: 无限滚动加载', async () => {
      const result = await runPluginCommand('06-infinite-scroll', 'scrape', {
        base_url: 'https://...',
        page_size: 20,
      });
      expect(result.data.total).toBeGreaterThan(0);
      expect(result.data.pages).toBeGreaterThan(0);
    });

    // ... 其他测试用例
  });

  // ... 其他阶段
});
```

### 测试运行器

```typescript
// tests/e2e/plugin-test-runner.ts
import { spawn } from 'child_process';
import { resolve } from 'path';

export interface PluginTestResult {
  pluginId: string;
  command: string;
  status: 'pass' | 'fail';
  data?: unknown;
  errors?: Array<{ field: string; expected: string; actual: string }>;
  tips?: string[];
  duration?: number;
}

export async function runPluginCommand(
  pluginId: string,
  command: string,
  params?: Record<string, unknown>
): Promise<PluginTestResult> {
  const startTime = Date.now();

  // 构造命令
  const cmd = ['xcli', pluginId, command];
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      cmd.push(`--${key}`, String(value));
    });
  }
  cmd.push('--json');

  // 执行命令
  return new Promise((resolve, reject) => {
    const process = spawn(cmd[0], cmd.slice(1), {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      const duration = Date.now() - startTime;

      if (code !== 0) {
        resolve({
          pluginId,
          command,
          status: 'fail',
          errors: [{ field: 'execution', expected: '0', actual: String(code) }],
          tips: [stderr || '命令执行失败'],
          duration,
        });
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve({
          pluginId,
          command,
          status: result.status || 'pass',
          data: result.data,
          errors: result.errors || [],
          tips: result.tips || [],
          duration,
        });
      } catch (e) {
        resolve({
          pluginId,
          command,
          status: 'fail',
          errors: [{ field: 'parse', expected: 'JSON', actual: 'invalid' }],
          tips: [stdout],
          duration,
        });
      }
    });
  });
}

export async function batchTestPlugins(
  pluginIds: string[],
  command: string = 'verify'
): Promise<PluginTestResult[]> {
  const results: PluginTestResult[] = [];

  for (const pluginId of pluginIds) {
    const result = await runPluginCommand(pluginId, command);
    results.push(result);
  }

  return results;
}
```

### Fixture 定义

```typescript
// tests/e2e/fixtures/cases/01-static.ts
import { z } from 'zod';

export const articleSchema = z.object({
  title: z.string().describe('文章标题'),
  url: z.string().describe('文章链接'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('发布日期'),
  author: z.string().describe('作者'),
  views: z.number().int().nonnegative().describe('阅读数'),
});

export const expectedData = [
  {
    title: 'Python爬虫入门指南（一）：初识爬虫',
    url: '/blog/post/python-crawler-getting-started',
    date: '2024-01-15',
    author: '张三',
    views: 1234,
  },
  // ... 其他预期数据
];

export const testCase = {
  id: '01-static',
  name: '静态HTML页面读取',
  url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/01-static.html',
  schema: articleSchema,
  expectedData,
  validate: (data: unknown[]) => {
    const errors: Array<{ field: string; expected: string; actual: string }> = [];

    if (!Array.isArray(data)) {
      errors.push({ field: 'data', expected: 'array', actual: typeof data });
      return errors;
    }

    if (data.length !== expectedData.length) {
      errors.push({
        field: 'length',
        expected: String(expectedData.length),
        actual: String(data.length),
      });
    }

    expectedData.forEach((expected, i) => {
      const actual = data[i] as any;
      if (actual.title !== expected.title) {
        errors.push({
          field: `[${i}].title`,
          expected: expected.title,
          actual: actual.title,
        });
      }
      // ... 其他字段验证
    });

    return errors;
  },
};
```

## 📅 分阶段实施计划

### Phase 1: 基础难度（1-5）
**目标**: 验证 mpage 基础能力 + 插件开发流程
**时间**: 1 周
**案例**:
- ✅ 01-static: 静态HTML页面读取
- ✅ 02-extract-urls: 提取页面URL
- ✅ 03-extract-content: 提取文章内容
- ✅ 04-pagination: 简单分页
- ✅ 05-url-params: URL参数控制

**验收标准**:
- 所有插件通过 `verify` 命令
- E2E 测试覆盖率 100%
- 生成改进点清单

**依赖的 mpage 能力**:
- ✅ `goto` - 导航到 URL
- ✅ `waitForSelector` - 等待元素
- ✅ `evaluate` - 在页面上下文执行 JS
- ✅ `querySelector` - 查询元素
- ✅ `getAttribute` - 获取属性

**可能的改进点**:
- [ ] 简化 DOM 操作 API
- [ ] 提供更友好的数据提取助手函数
- [ ] 优化 `evaluate` 的类型推导

---

### Phase 2: 中等难度（6-12）
**目标**: 验证动态内容处理 + 状态管理
**时间**: 2 周
**案例**:
- ✅ 06-infinite-scroll: 无限滚动加载
- ✅ 07-lazy-load: 懒加载/点击加载
- ✅ 08-search: 搜索功能
- ⚠️ 09-rate-limit: IP限流模拟
- ⚠️ 10-login: 简单登录
- ⚠️ 11-session: Session/Cookie保持
- ⚠️ 12-captcha-numeric: 图片验证码

**验收标准**:
- 所有插件通过 `verify` 命令
- E2E 测试覆盖率 100%
- 实现自动重试机制
- 实现会话持久化

**依赖的 mpage/xcli 新能力**:
- [ ] mpage: 网络请求拦截
- [ ] mpage: Cookie 管理增强
- [ ] xcli: 重试策略配置
- [ ] xcli: 会话存储 API

**可能的改进点**:
- [ ] 网络请求拦截 API 更简洁
- [ ] Cookie 持久化跨会话
- [ ] 重试策略可配置化
- [ ] 验证码识别集成（OCR）

---

### Phase 3: 进阶难度（13-16）
**目标**: 验证复杂验证码处理
**时间**: 2 周
**案例**:
- ⚠️ 13-captcha-slider: 滑块验证码
- ⚠️ 14-captcha-click: 点选验证码
- ⚠️ 15-captcha-rotate: 旋转验证码
- ⚠️ 16-captcha-arithmetic: 算术验证码

**验收标准**:
- 所有插件通过 `verify` 命令
- E2E 测试覆盖率 100%
- 提供验证码破解工具集成

**依赖的 mpage/xcli 新能力**:
- [ ] mpage: 图像处理工具
- [ ] mpage: 拖拽操作增强
- [ ] xcli: 外部工具集成接口
- [ ] xcli: 验证码识别 API

**可能的改进点**:
- [ ] 拖拽轨迹生成算法
- [ ] 图像识别集成（Tesseract）
- [ ] 验证码破解工具统一接口
- [ ] 图像截图和裁剪 API

---

### Phase 4: 高级难度（17-20）
**目标**: 验证综合场景处理
**时间**: 2 周
**案例**:
- ⚠️ 17-file-upload: 文件上传场景
- ⚠️ 18-iframe-login: iframe嵌套
- ⚠️ 19-dynamic-captcha: 动态验证码
- ⚠️ 20-comprehensive: 综合反爬场景

**验收标准**:
- 所有插件通过 `verify` 命令
- E2E 测试覆盖率 100%
- 支持文件上传
- 支持 iframe 操作

**依赖的 mpage/xcli 新能力**:
- [ ] mpage: 文件上传 API
- [ ] mpage: iframe 操作增强
- [ ] xcli: 动态验证码处理流程
- [ ] xcli: 综合场景编排能力

**可能的改进点**:
- [ ] 文件上传更简单
- [ ] iframe 切换更透明
- [ ] 动态验证码自动检测
- [ ] 场景编排 DSL

---

### Phase 5: 现代前端技术（21-23）
**目标**: 验证现代前端技术处理
**时间**: 2 周
**案例**:
- ⚠️ 21-shadow-dom: Shadow DOM元素提取
- ⚠️ 22-portal-teleport: Portal/Teleport渲染
- ⚠️ 23-css-in-js: CSS-in-JS动态类名

**验收标准**:
- 所有插件通过 `verify` 命令
- E2E 测试覆盖率 100%
- 支持 Shadow DOM 遍历
- 支持 Portal 元素定位

**依赖的 mpage/xcli 新能力**:
- [ ] mpage: Shadow DOM 遍历 API
- [ ] mpage: Portal 元素定位
- [ ] xcli: 语义化属性选择器
- [ ] xcli: 现代前端技术适配层

**可能的改进点**:
- [ ] Shadow DOM 递归遍历
- [ ] Portal 元素自动追踪
- [ ] data-testid/aria-label 支持
- [ ] CSS-in-JS 类名黑名单

---

### Phase 6: 真实业务场景（24-27）
**目标**: 验证真实业务场景
**时间**: 2 周
**案例**:
- ✅ 24-social-media: 社交媒体
- ⚠️ 25-video-website: 视频网站
- ⚠️ 26-job-site: 招聘网站
- ⚠️ 27-real-estate: 房产网站

**验收标准**:
- 所有插件通过 `verify` 命令
- E2E 测试覆盖率 100%
- 处理真实网站特性
- 数据导出功能

**依赖的 mpage/xcli 新能力**:
- [ ] mpage: 虚拟滚动支持
- [ ] mpage: 地图交互 API
- [ ] xcli: 数据导出工具
- [ ] xcli: 真实网站适配层

**可能的改进点**:
- [ ] 虚拟滚动自动检测
- [ ] 地图坐标提取
- [ ] 数据导出格式化
- [ ] 真实网站快速适配模板

---

### Phase 7: 高级数据加载（28-30）
**目标**: 验证高级数据加载技术
**时间**: 2 周
**案例**:
- ⚠️ 28-virtual-scroll: Virtual DOM虚拟滚动
- ⚠️ 29-document-fragment: DocumentFragment动态内容
- ⚠️ 30-xhr-intercept: XHR/Fetch拦截

**验收标准**:
- 所有插件通过 `verify` 命令
- E2E 测试覆盖率 100%
- 支持 Virtual DOM
- 支持 XHR 拦截

**依赖的 mpage/xcli 新能力**:
- [ ] mpage: Virtual DOM 检测
- [ ] mpage: MutationObserver 集成
- [ ] mpage: XHR/Fetch 拦截增强
- [ ] xcli: API 优先策略

**可能的改进点**:
- [ ] Virtual DOM 自动识别
- [ ] DOM 变化监听助手
- [ ] 网络请求录制
- [ ] API 接口自动提取

---

### Phase 8: 终极挑战（31-36）
**目标**: 验证综合能力
**时间**: 3 周
**案例**:
- ⚠️ 31-comprehensive-challenge: 综合挑战
- ✅ 32-ecommerce-seller: 电商卖家中心
- ⚠️ 33-government-tender: 政府招标网
- ✅ 34-secondhand-market: 二手交易平台
- ✅ 35-qa-community: 知识问答社区
- ⚠️ 36-stock-trading: 证券交易行情

**验收标准**:
- 所有插件通过 `verify` 命令
- E2E 测试覆盖率 100%
- 综合运用所有技术
- 生产环境可用

**依赖的 mpage/xcli 新能力**:
- [ ] mpage: WebSocket 支持
- [ ] mpage: Canvas 操作
- [ ] xcli: 加密解密工具
- [ ] xcli: 双因素认证

**可能的改进点**:
- [ ] WebSocket 通信拦截
- [ ] Canvas 数据提取
- [ ] 加密算法集成
- [ ] 验证码、登录、限流综合处理

## 🔍 改进点追踪机制

### 改进点文件结构

```
docs/
├── improvement-tracking.md         # 改进点总览
├── improvements/
│   ├── mpage/                       # mpage 改进点
│   │   ├── 001-simplify-dom-api.md
│   │   ├── 002-network-intercept.md
│   │   └── ...
│   ├── xcli/                        # xcli 改进点
│   │   ├── 001-retry-strategy.md
│   │   ├── 002-session-storage.md
│   │   └── ...
│   └── plugins/                     # 插件改进点
│       ├── 12-captcha-numeric.md
│       └── ...
└── changelog.md                     # 变更日志
```

### 改进点模板

```markdown
# IMP-{序号}: {改进标题}

**状态**: {proposed | in-progress | done | blocked}
**优先级**: {high | medium | low}
**来源**: Phase {X} - {案例ID}-{案例名称}
**负责人**: {姓名}
**创建时间**: {YYYY-MM-DD}

## 问题描述

### 当前问题
- 描述当前遇到的具体问题
- 影响范围
- 复现步骤

### 期望行为
- 描述期望的解决方案
- 使用场景

## 影响范围

### 受影响的案例
- 列出所有受影响的案例ID

### 受影响的模块
- mpage / xcli / plugins

## 解决方案

### 方案概述
- 简述解决方案

### 技术细节
- 具体实现思路
- API 设计
- 伪代码

### 迁移指南
- 现有代码如何迁移
- 兼容性说明

## 验收标准

### 功能验收
- [ ] 标准1
- [ ] 标准2

### 测试验收
- [ ] 单元测试
- [ ] 集成测试
- [ ] E2E 测试

## 进度追踪

| 日期 | 进度 | 备注 |
|------|------|------|
| 2024-01-01 | proposed | 创建改进点 |

## 相关讨论

- Issue 链接
- PR 链接
- 设计文档链接
```

### 改进点追踪工具

```typescript
// tools/improvement-tracker.ts
import * as fs from 'fs';
import * as path from 'path';

interface Improvement {
  id: string;
  title: string;
  status: 'proposed' | 'in-progress' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  source: string;
  assignee?: string;
  createdAt: string;
  relatedCases: string[];
  relatedModules: string[];
}

export class ImprovementTracker {
  private improvements: Map<string, Improvement> = new Map();

  constructor(private basePath: string = 'docs/improvements') {
    this.load();
  }

  async load(): Promise<void> {
    const files = await fs.promises.readdir(this.basePath, { recursive: true });
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.promises.readFile(path.join(this.basePath, file), 'utf-8');
        const improvement = this.parseImprovement(content);
        this.improvements.set(improvement.id, improvement);
      }
    }
  }

  parseImprovement(content: string): Improvement {
    // 解析 Markdown 文件中的改进点
    const idMatch = content.match(/# IMP-(\d+):/);
    const titleMatch = content.match(/# IMP-\d+: (.+)/);
    const statusMatch = content.match(/\*\*状态\*\*:\s+(\w+)/);
    const priorityMatch = content.match(/\*\*优先级\*\*:\s+(\w+)/);
    const sourceMatch = content.match(/\*\*来源\*\*:\s+(.+)/);

    return {
      id: `IMP-${idMatch?.[1] || '0'}`,
      title: titleMatch?.[1] || 'Untitled',
      status: (statusMatch?.[1] as Improvement['status']) || 'proposed',
      priority: (priorityMatch?.[1] as Improvement['priority']) || 'medium',
      source: sourceMatch?.[1] || 'Unknown',
      relatedCases: [],
      relatedModules: [],
      createdAt: new Date().toISOString(),
    };
  }

  list(filters?: Partial<Improvement>): Improvement[] {
    let result = Array.from(this.improvements.values());

    if (filters?.status) {
      result = result.filter((imp) => imp.status === filters.status);
    }
    if (filters?.priority) {
      result = result.filter((imp) => imp.priority === filters.priority);
    }
    if (filters?.source) {
      result = result.filter((imp) => imp.source.includes(filters.source!));
    }

    return result.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  async add(improvement: Omit<Improvement, 'id' | 'createdAt'>): Promise<Improvement> {
    const id = `IMP-${this.improvements.size + 1}`;
    const newImprovement: Improvement = {
      ...improvement,
      id,
      createdAt: new Date().toISOString(),
    };

    this.improvements.set(id, newImprovement);
    await this.save(newImprovement);

    return newImprovement;
  }

  async update(id: string, updates: Partial<Improvement>): Promise<Improvement | null> {
    const improvement = this.improvements.get(id);
    if (!improvement) return null;

    const updated = { ...improvement, ...updates };
    this.improvements.set(id, updated);
    await this.save(updated);

    return updated;
  }

  async save(improvement: Improvement): Promise<void> {
    const moduleDir = path.join(this.basePath, improvement.relatedModules[0] || 'mpage');
    await fs.promises.mkdir(moduleDir, { recursive: true });

    const filename = `${improvement.id}-${improvement.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    const filepath = path.join(moduleDir, filename);

    const content = this.generateMarkdown(improvement);
    await fs.promises.writeFile(filepath, content, 'utf-8');
  }

  generateMarkdown(improvement: Improvement): string {
    return `# ${improvement.id}: ${improvement.title}

**状态**: ${improvement.status}
**优先级**: ${improvement.priority}
**来源**: ${improvement.source}
${improvement.assignee ? `**负责人**: ${improvement.assignee}` : ''}
**创建时间**: ${improvement.createdAt}

## 问题描述

### 当前问题

### 期望行为

## 影响范围

### 受影响的案例
${improvement.relatedCases.map((c) => `- ${c}`).join('\n')}

### 受影响的模块
${improvement.relatedModules.map((m) => `- ${m}`).join('\n')}

## 解决方案

### 方案概述

### 技术细节

### 迁移指南

## 验收标准

### 功能验收
- [ ]

### 测试验收
- [ ]

## 进度追踪

| 日期 | 进度 | 备注 |
|------|------|------|
| ${improvement.createdAt} | ${improvement.status} | 创建改进点 |

## 相关讨论

`;
  }

  generateReport(): string {
    const improvements = this.list();

    return `# 改进点追踪报告

生成时间: ${new Date().toISOString()}

## 概览

- 总数: ${improvements.length}
- 待处理: ${improvements.filter((i) => i.status === 'proposed').length}
- 进行中: ${improvements.filter((i) => i.status === 'in-progress').length}
- 已完成: ${improvements.filter((i) => i.status === 'done').length}
- 已阻塞: ${improvements.filter((i) => i.status === 'blocked').length}

## 高优先级改进点

${improvements
  .filter((i) => i.priority === 'high')
  .map((i) => `- [${i.status}] ${i.id}: ${i.title}`)
  .join('\n')}

## 进行中的改进点

${improvements
  .filter((i) => i.status === 'in-progress')
  .map((i) => `- ${i.id}: ${i.title}`)
  .join('\n')}
`;
  }
}

// CLI 工具
if (import.meta.url === `file://${process.argv[1]}`) {
  const tracker = new ImprovementTracker();
  const command = process.argv[2];

  switch (command) {
    case 'list':
      const filters = process.argv[3] ? JSON.parse(process.argv[3]) : {};
      console.log(JSON.stringify(tracker.list(filters), null, 2));
      break;
    case 'report':
      console.log(tracker.generateReport());
      break;
    default:
      console.log('Usage: improvement-tracker [list|report] [filters]');
  }
}
```

## 🚀 元数据管理

### 元数据配置文件

```json
// .xcli/plugins/metadata.json
{
  "plugins": {
    "01-static": {
      "phase": 1,
      "difficulty": "基础",
      "dependencies": {
        "mpage": ["goto", "waitForSelector", "evaluate"],
        "xcli": []
      },
      "improvements": ["IMP-001", "IMP-002"],
      "status": "done",
      "coverage": 100
    },
    "02-extract-urls": {
      "phase": 1,
      "difficulty": "基础",
      "dependencies": {
        "mpage": ["goto", "waitForSelector", "getAttribute"],
        "xcli": []
      },
      "improvements": [],
      "status": "done",
      "coverage": 100
    },
    "12-captcha-numeric": {
      "phase": 2,
      "difficulty": "中等",
      "dependencies": {
        "mpage": ["screenshot", "ocr"],
        "xcli": ["retry-strategy"]
      },
      "improvements": ["IMP-015", "IMP-016"],
      "status": "in-progress",
      "coverage": 0
    },
    "31-comprehensive-challenge": {
      "phase": 8,
      "difficulty": "终极挑战",
      "dependencies": {
        "mpage": ["shadow-dom", "virtual-scroll", "xhr-intercept", "websocket", "canvas"],
        "xcli": ["retry-strategy", "session-storage", "encryption"]
      },
      "improvements": ["IMP-050", "IMP-051", "IMP-052"],
      "status": "proposed",
      "coverage": 0
    }
  },
  "phases": {
    "1": {
      "name": "基础难度（1-5）",
      "plugins": ["01-static", "02-extract-urls", "03-extract-content", "04-pagination", "05-url-params"],
      "status": "done"
    },
    "2": {
      "name": "中等难度（6-12）",
      "plugins": ["06-infinite-scroll", "07-lazy-load", "08-search", "09-rate-limit", "10-login", "11-session", "12-captcha-numeric"],
      "status": "in-progress"
    }
  },
  "mpageCapabilities": {
    "goto": { "implemented": true, "version": "1.0.0" },
    "waitForSelector": { "implemented": true, "version": "1.0.0" },
    "evaluate": { "implemented": true, "version": "1.0.0" },
    "screenshot": { "implemented": false, "version": null },
    "ocr": { "implemented": false, "version": null },
    "shadow-dom": { "implemented": false, "version": null }
  },
  "xcliFeatures": {
    "retry-strategy": { "implemented": false, "version": null },
    "session-storage": { "implemented": false, "version": null },
    "encryption": { "implemented": false, "version": null }
  }
}
```

### 元数据查询工具

```typescript
// tools/metadata-query.ts
import * as fs from 'fs';
import * as path from 'path';

interface PluginMetadata {
  phase: number;
  difficulty: string;
  dependencies: {
    mpage: string[];
    xcli: string[];
  };
  improvements: string[];
  status: 'proposed' | 'in-progress' | 'done';
  coverage: number;
}

interface Metadata {
  plugins: Record<string, PluginMetadata>;
  phases: Record<string, {
    name: string;
    plugins: string[];
    status: string;
  }>;
  mpageCapabilities: Record<string, { implemented: boolean; version: string | null }>;
  xcliFeatures: Record<string, { implemented: boolean; version: string | null }>;
}

export class MetadataQuery {
  constructor(private metadataPath: string = '.xcli/plugins/metadata.json') {
    this.load();
  }

  private metadata: Metadata | null = null;

  load(): void {
    const content = fs.readFileSync(this.metadataPath, 'utf-8');
    this.metadata = JSON.parse(content);
  }

  save(): void {
    if (!this.metadata) return;
    fs.writeFileSync(this.metadataPath, JSON.stringify(this.metadata, null, 2), 'utf-8');
  }

  getPlugin(pluginId: string): PluginMetadata | null {
    return this.metadata?.plugins[pluginId] || null;
  }

  getPhase(phase: number): { name: string; plugins: string[]; status: string } | null {
    return this.metadata?.phases[String(phase)] || null;
  }

  getPluginsByStatus(status: string): PluginMetadata[] {
    if (!this.metadata) return [];
    return Object.entries(this.metadata.plugins)
      .filter(([_, meta]) => meta.status === status)
      .map(([_, meta]) => meta);
  }

  getRequiredCapabilities(pluginId: string): { mpage: string[]; xcli: string[] } {
    const plugin = this.getPlugin(pluginId);
    return plugin?.dependencies || { mpage: [], xcli: [] };
  }

  getMissingCapabilities(): { mpage: string[]; xcli: string[] } {
    if (!this.metadata) return { mpage: [], xcli: [] };

    const requiredMpage = new Set<string>();
    const requiredXcli = new Set<string>();

    Object.values(this.metadata.plugins).forEach((plugin) => {
      plugin.dependencies.mpage.forEach((cap) => requiredMpage.add(cap));
      plugin.dependencies.xcli.forEach((feat) => requiredXcli.add(feat));
    });

    const missingMpage = Array.from(requiredMpage).filter(
      (cap) => !this.metadata!.mpageCapabilities[cap]?.implemented
    );
    const missingXcli = Array.from(requiredXcli).filter(
      (feat) => !this.metadata!.xcliFeatures[feat]?.implemented
    );

    return { mpage: missingMpage, xcli: missingXcli };
  }

  getPhaseProgress(phase: number): { total: number; done: number; progress: number } {
    const phaseInfo = this.getPhase(phase);
    if (!phaseInfo) return { total: 0, done: 0, progress: 0 };

    const done = phaseInfo.plugins.filter((id) => this.metadata?.plugins[id]?.status === 'done').length;
    const total = phaseInfo.plugins.length;

    return {
      total,
      done,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }

  generateReport(): string {
    if (!this.metadata) return 'No metadata available';

    const lines: string[] = [];

    lines.push('# 36个案例实施进度报告\n');
    lines.push(`生成时间: ${new Date().toISOString()}\n`);

    // 总体进度
    const allPlugins = Object.values(this.metadata.plugins);
    const done = allPlugins.filter((p) => p.status === 'done').length;
    const inProgress = allPlugins.filter((p) => p.status === 'in-progress').length;
    const proposed = allPlugins.filter((p) => p.status === 'proposed').length;

    lines.push('## 总体进度\n');
    lines.push(`- 总数: ${allPlugins.length}`);
    lines.push(`- 已完成: ${done} (${Math.round((done / allPlugins.length) * 100)}%)`);
    lines.push(`- 进行中: ${inProgress} (${Math.round((inProgress / allPlugins.length) * 100)}%)`);
    lines.push(`- 待开始: ${proposed} (${Math.round((proposed / allPlugins.length) * 100)}%)\n`);

    // 各阶段进度
    lines.push('## 各阶段进度\n');
    for (let i = 1; i <= 8; i++) {
      const phase = this.getPhase(i);
      if (!phase) continue;

      const progress = this.getPhaseProgress(i);
      lines.push(`### Phase ${i}: ${phase.name}`);
      lines.push(`- 进度: ${progress.done}/${progress.total} (${progress.progress}%)`);
      lines.push(`- 状态: ${phase.status}\n`);
    }

    // 缺失能力
    lines.push('## 缺失能力\n');
    const missing = this.getMissingCapabilities();
    if (missing.mpage.length > 0) {
      lines.push('### mpage');
      missing.mpage.forEach((cap) => lines.push(`- ${cap}`));
    }
    if (missing.xcli.length > 0) {
      lines.push('### xcli');
      missing.xcli.forEach((feat) => lines.push(`- ${feat}`));
    }

    return lines.join('\n');
  }
}

// CLI 工具
if (import.meta.url === `file://${process.argv[1]}`) {
  const query = new MetadataQuery();
  const command = process.argv[2];

  switch (command) {
    case 'plugin':
      console.log(JSON.stringify(query.getPlugin(process.argv[3]), null, 2));
      break;
    case 'phase':
      console.log(JSON.stringify(query.getPhase(parseInt(process.argv[3])), null, 2));
      break;
    case 'missing':
      console.log(JSON.stringify(query.getMissingCapabilities(), null, 2));
      break;
    case 'report':
      console.log(query.generateReport());
      break;
    default:
      console.log('Usage: metadata-query [plugin|phase|missing|report] [args]');
  }
}
```

## 📊 CI/CD 集成

### GitHub Actions 工作流

```yaml
# .github/workflows/test-plugins.yml
name: Test Plugins

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    # 每天凌晨2点运行
    - cron: '0 2 * * *'

jobs:
  test-plugins:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run plugin tests
        run: npm run test:plugins

      - name: Generate test report
        if: always()
        run: npm run test:plugins:report

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/

      - name: Comment PR with test results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('test-results/summary.md', 'utf-8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });
```

### 测试报告生成

```typescript
// tools/test-reporter.ts
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  pluginId: string;
  command: string;
  status: 'pass' | 'fail';
  duration?: number;
  errors?: Array<{ field: string; expected: string; actual: string }>;
}

export class TestReporter {
  private results: TestResult[] = [];

  addResult(result: TestResult): void {
    this.results.push(result);
  }

  generateSummary(): string {
    const passed = this.results.filter((r) => r.status === 'pass').length;
    const failed = this.results.filter((r) => r.status === 'fail').length;

    const lines: string[] = [];
    lines.push('# 插件测试报告\n');
    lines.push(`生成时间: ${new Date().toISOString()}\n`);
    lines.push(`总测试数: ${this.results.length}\n`);
    lines.push(`通过: ${passed} (${Math.round((passed / this.results.length) * 100)}%)\n`);
    lines.push(`失败: ${failed} (${Math.round((failed / this.results.length) * 100)}%)\n`);

    if (failed > 0) {
      lines.push('## 失败的测试\n');
      this.results
        .filter((r) => r.status === 'fail')
        .forEach((result) => {
          lines.push(`### ${result.pluginId} - ${result.command}\n`);
          if (result.errors) {
            result.errors.forEach((error) => {
              lines.push(`- ${error.field}: expected ${error.expected}, got ${error.actual}\n`);
            });
          }
        });
    }

    return lines.join('\n');
  }

  generateHTML(): string {
    const passed = this.results.filter((r) => r.status === 'pass').length;
    const failed = this.results.filter((r) => r.status === 'fail').length;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>插件测试报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; }
    .card { padding: 20px; border-radius: 8px; text-align: center; }
    .pass { background: #4caf50; color: white; }
    .fail { background: #f44336; color: white; }
    .total { background: #2196f3; color: white; }
    .test-item { padding: 10px; border-bottom: 1px solid #eee; }
    .test-item.pass { border-left: 4px solid #4caf50; }
    .test-item.fail { border-left: 4px solid #f44336; }
  </style>
</head>
<body>
  <h1>插件测试报告</h1>
  <p>生成时间: ${new Date().toISOString()}</p>

  <div class="summary">
    <div class="card total">
      <h2>${this.results.length}</h2>
      <p>总测试数</p>
    </div>
    <div class="card pass">
      <h2>${passed}</h2>
      <p>通过</p>
    </div>
    <div class="card fail">
      <h2>${failed}</h2>
      <p>失败</p>
    </div>
  </div>

  <h2>测试详情</h2>
  <div>
    ${this.results
      .map(
        (result) => `
      <div class="test-item ${result.status}">
        <strong>${result.pluginId} - ${result.command}</strong>
        ${result.duration ? `<span style="float: right; color: #666;">${result.duration}ms</span>` : ''}
        ${result.errors ? `<br>${result.errors.map((e) => `${e.field}: expected ${e.expected}, got ${e.actual}`).join('<br>')}` : ''}
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>
    `;
  }

  saveSummary(path: string = 'test-results/summary.md'): void {
    const summary = this.generateSummary();
    writeFileSync(path, summary, 'utf-8');
  }

  saveHTML(path: string = 'test-results/report.html'): void {
    const html = this.generateHTML();
    writeFileSync(path, html, 'utf-8');
  }
}
```

## 📝 总结

本方案提供了：

1. **插件目录结构设计**: 统一的插件组织方式
2. **测试框架设计**: E2E、集成、单元测试三层架构
3. **分阶段实施计划**: 8 个阶段，从易到难逐步推进
4. **改进点追踪机制**: 结构化的改进点管理和追踪
5. **元数据管理**: 插件依赖、能力映射、进度追踪
6. **CI/CD 集成**: 自动化测试和报告生成

这个方案的核心思想是：
- **渐进式开发**: 从简单到复杂，逐步验证能力
- **自动化验证**: 每个插件都有 `verify` 命令自动验证
- **持续改进**: 发现问题立即记录改进点，逐步完善系统
- **可复用生态**: 最终形成可复用的插件生态

下一步建议：
1. 立即开始 Phase 2 的实施
2. 建立 CI/CD 工作流
3. 完善改进点追踪机制
