# xcli 测试规范

## 测试目标

1. 确保 xcli 基础命令正常工作
2. 确保插件系统正常工作
3. 确保 Hook 异常检测正常工作
4. 回归测试，防止破坏性变更

## 测试分类

### 1. 单元测试 (Unit Tests)
- 测试独立函数/模块
- 不依赖外部资源
- 快速执行

### 2. 集成测试 (Integration Tests)
- 测试命令执行
- 测试插件加载
- 测试 daemon 通信

### 3. E2E 测试 (End-to-End Tests)
- 测试完整命令流程
- 测试真实浏览器操作
- 较慢执行

## 测试目录结构

```
xcli/
├── src/
│   ├── commands/           # 命令实现
│   └── core/              # 核心模块
├── tests/
│   ├── unit/              # 单元测试
│   │   ├── page-hook.test.ts
│   │   └── arg-parser.test.ts
│   ├── integration/       # 集成测试
│   │   ├── commands/
│   │   │   ├── daemon.test.ts
│   │   │   ├── plugins.test.ts
│   │   │   ├── install.test.ts
│   │   │   └── remove.test.ts
│   │   └── session.test.ts
│   └── e2e/               # E2E 测试
│       ├── open.test.ts
│       ├── html.test.ts
│       ├── snapshot.test.ts
│       └── scrape-social.test.ts
├── scripts/
│   └── test-all.sh         # 运行所有测试
└── package.json
```

## 测试命令

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行 E2E 测试
npm run test:e2e

# 运行指定测试
npx vitest run tests/unit/page-hook.test.ts

# 监听模式
npx vitest tests/unit/page-hook.test.ts
```

## 测试框架

使用 **Vitest** + **Playwright**

```bash
npm install -D vitest @vitest/ui playwright
```

## 测试文件命名

```
<module-name>.test.ts
<command-name>.test.ts
<feature>.test.ts
```

## 测试代码规范

### 1. 文件结构

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('模块名称', () => {
  describe('功能分组', () => {
    it('应该描述测试场景', async () => {
      // Arrange - 准备
      const input = 'test';

      // Act - 执行
      const result = myFunction(input);

      // Assert - 断言
      expect(result).toBe('expected');
    });
  });
});
```

### 2. 命名规范

```typescript
// 测试套件: 描述被测试的模块/命令
describe('pageHook', () => {});
describe('xcli install', () => {});
describe('PluginLoader', () => {});

// 测试用例: 描述期望行为
it('应该检测验证码', () => {});
it('应该返回 JSON 格式', () => {});
it('应该抛出错误当插件不存在', () => {});

// 异步测试
it('应该异步加载插件', async () => {});
```

### 3. 断言规范

```typescript
// 基本断言
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toBeTruthy();
expect(value).toBeFalsy();

// 空值
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// 数字
expect(value).toBeGreaterThan(0);
expect(value).toBeLessThanOrEqual(10);

// 字符串
expect(str).toContain('substring');
expect(str).toMatch(/regex/);

// 数组/对象
expect(arr).toHaveLength(3);
expect(obj).toHaveProperty('key');
expect(arr).toContainEqual(item);

// 错误
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(Error);
```

### 4. Mock 规范

```typescript
import { vi } from 'vitest';

// Mock 模块
vi.mock('../src/core/page-hook', () => ({
  analyzePage: vi.fn(),
  formatTips: vi.fn(),
}));

// Mock 函数
const mockFn = vi.fn();

// Spy
vi.spyOn(obj, 'method');
```

### 5. 测试隔离

```typescript
beforeEach(() => {
  // 重置所有 mock
  vi.clearAllMocks();

  // 重置模块
  vi.resetModules();
});
```

## 命令测试规范

### 测试模板

```typescript
describe('xcli <command>', () => {
  const CLI = './bin/xcli.ts';

  it('应该显示帮助', async () => {
    const { stdout } = await execAsync(`npx tsx ${CLI} <command> --help`);
    expect(stdout).toContain('Usage');
  });

  it('应该执行成功', async () => {
    const { stdout } = await execAsync(`npx tsx ${CLI} <command> <args>`);
    expect(stdout).toContain('expected');
  });

  it('应该输出 JSON 格式', async () => {
    const { stdout } = await execAsync(`npx tsx ${CLI} <command> --json`);
    const json = JSON.parse(stdout);
    expect(json).toHaveProperty('data');
  });

  it('应该处理错误', async () => {
    await expect(
      execAsync(`npx tsx ${CLI} <command> invalid`)
    ).rejects.toThrow();
  });
});
```

## 集成测试规范

### Daemon 测试

```typescript
describe('Daemon', () => {
  beforeAll(async () => {
    // 启动 daemon
    await daemon.start();
  });

  afterAll(async () => {
    // 停止 daemon
    await daemon.stop();
  });

  it('应该通过 Unix Socket 通信', async () => {
    const client = new SessionClient();
    await client.connect();
    expect(client.isConnected()).toBe(true);
  });
});
```

### 插件测试

```typescript
describe('Plugin System', () => {
  it('应该加载插件', async () => {
    await loader.loadPlugin('./tests/fixtures/test-plugin/index.ts');
    const plugin = loader.getPlugin('test-plugin');
    expect(plugin).toBeDefined();
  });

  it('应该执行插件命令', async () => {
    const result = await plugin.execute('scrape', {});
    expect(result).toHaveProperty('data');
  });
});
```

## E2E 测试规范

### 浏览器测试

```typescript
import { test, expect } from '@playwright/test';

test.describe('xcli open', () => {
  test('应该打开页面', async ({ page }) => {
    await page.goto('about:blank');

    // 执行 xcli open
    const result = await execAsync('npx tsx xcli/bin/xcli.ts open https://example.com');

    // 验证页面加载
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('example.com');
  });
});
```

## 覆盖率要求

- 单元测试: 80%+
- 集成测试: 覆盖所有命令
- E2E 测试: 核心流程覆盖

## CI 集成

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
```
