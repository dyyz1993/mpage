---
title: 插件测试 - xcli 文档
description: 使用 vitest 编写可运行的 xcli 插件测试，包括测试环境搭建、mock 技巧和完整示例。
---

# 插件测试

本文介绍如何使用 vitest 编写可运行的插件测试。

## 测试环境搭建

```bash
npm install -D vitest
```

`vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { globals: true, testTimeout: 10000 } });
```

## Mock XCLIAPI

通过 `PluginLoader` + mock `Core` 加载插件，无需手动 mock 整个 API：

```typescript
import { resolve } from 'path';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { PluginLoader, ok, fail } from '@dyyz1993/xcli-core';
import type { Core, CoreConfig } from '@dyyz1993/xcli-core';

function createMockCore(): Core {
  const tmp = mkdtempSync(resolve(tmpdir(), 'xcli-test-'));
  return {
    config: {
      name: 'test-cli', version: '0.0.1', description: 'test',
      configDirName: '.test-cli', envPrefix: 'TEST_CLI',
      pluginDirs: [], pluginPackageName: '@dyyz1993/xcli-core',
    } as CoreConfig,
    configDir: tmp, sessionDir: resolve(tmp, 'sessions'), storageDir: resolve(tmp, 'storage'),
  } as Core;
}

function createTmpPlugin(code: string): string {
  const dir = mkdtempSync(resolve(tmpdir(), 'xcli-plugin-'));
  writeFileSync(resolve(dir, 'package.json'), JSON.stringify({ name: 'tmp', version: '1.0.0' }));
  writeFileSync(resolve(dir, 'index.ts'), code);
  return dir;
}
```

## 测试 handler 返回值

```typescript
let loader: PluginLoader;

beforeEach(() => {
  loader = new PluginLoader(createMockCore());
});

afterEach(() => {
  loader.unloadAll();
});

it('should return correct data', async () => {
  const dir = createTmpPlugin(`
    import { ok } from '@dyyz1993/xcli-core';
    export default function(cli) {
      const site = cli.createSite({ name: 'test', url: 'https://example.com' });
      site.command('scrape', {
        description: 'Scrape',
        handler: async () => ok({ items: [1, 2, 3] }, ['采集到 3 条数据']),
      });
    }
  `);

  await loader.loadPlugin(resolve(dir, 'index.ts'));
  const site = loader.getSite('test')!;
  const cmd = site.getCommand('scrape')!;

  const result = await cmd.handler({}, {
    args: [], options: {}, cwd: '/tmp', storage: site.getStorage(),
    output: { mode: 'text', showTips: false, color: false, emoji: false },
    error: () => {}, config: {}, site, cliName: 'test-cli',
  });

  expect(result.success).toBe(true);
  expect(result.tips).toContain('采集到 3 条数据');
});
```

## 测试参数校验

```typescript
it('should validate parameters via Zod schema', async () => {
  const dir = createTmpPlugin(`
    import { z } from 'zod';
    import { ok } from '@dyyz1993/xcli-core';
    export default function(cli) {
      const site = cli.createSite({ name: 'param-test', url: 'https://example.com' });
      site.command('search', {
        description: 'Search',
        parameters: z.object({ query: z.string() }),
        handler: async (params) => ok(params),
      });
    }
  `);

  await loader.loadPlugin(resolve(dir, 'index.ts'));
  const cmd = loader.getSite('param-test')!.getCommand('search')!;
  expect(cmd.parameters!.parse({ query: 'test' })).toEqual({ query: 'test' });
});
```

## 测试插件加载（jiti）

```typescript
it('should load .ts plugin via jiti', async () => {
  const dir = createTmpPlugin(`
    export default function(cli) {
      cli.createSite({ name: 'ts-test', url: 'https://example.com' });
    }
  `);

  const instance = await loader.loadPlugin(resolve(dir, 'index.ts'));
  expect(instance.status).toBe('loaded');
});
```

## 测试命令覆盖

```typescript
it('should override plugin when loading same id', async () => {
  const dir1 = createTmpPlugin(`
    export default function(cli) {
      cli.createSite({ name: 'override', url: 'https://v1.com' });
    }`);
  const dir2 = createTmpPlugin(`
    export default function(cli) {
      cli.createSite({ name: 'override', url: 'https://v2.com' });
    }`);

  await loader.loadPlugin(resolve(dir1, 'index.ts'), 'same-id');
  expect(loader.getSite('override')!.url).toBe('https://v1.com');

  await loader.loadPlugin(resolve(dir2, 'index.ts'), 'same-id');
  expect(loader.getSite('override')!.url).toBe('https://v2.com');
});
```

## 测试生命周期钩子

```typescript
it('should execute onLoad and onUnload', async () => {
  const dir = createTmpPlugin(`
    export default function(cli) {
      cli.onLoad(async () => { globalThis.__loaded = true; });
      cli.onUnload(async () => { globalThis.__loaded = false; });
    }
  `);

  const instance = await loader.loadPlugin(resolve(dir, 'index.ts'));
  expect(globalThis.__loaded).toBe(true);

  await loader.unloadPlugin(instance.id);
  expect(globalThis.__loaded).toBe(false);
});
```

## CI 中运行

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

GitHub Actions：

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test
```
