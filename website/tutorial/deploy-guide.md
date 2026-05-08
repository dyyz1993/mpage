---
title: 端到端：从零创建 CLI 到发布 npm - xcli 文档
description: 完整项目生命周期教程：创建 CLI 项目、编写命令、本地调试、编写测试、配置 CI，到最终发布 npm。
---

# 端到端：从零创建 CLI 到发布 npm

本教程将带你完成一个完整的项目生命周期：从创建 CLI 项目、编写命令、本地调试、编写测试、配置 CI，到最终发布到 npm。我们将以「天气查询 CLI」为例贯穿全文。

## 前置条件

- Node.js >= 18
- pnpm（推荐）或 npm
- GitHub 账号
- npm 账号（用于发布）

## 第一步：创建项目

使用 `create-xcli` 脚手架快速创建项目：

```bash
npx create-xcli weather-cli
```

脚手架提供 5 个模板，按需选择：

| 模板名 | 适用场景 | 关键依赖 |
|--------|---------|----------|
| `base` | 通用 CLI 起步 | xcli-core + zod |
| `api` | API 交互 | + undici |
| `browser` | 浏览器自动化 | + playwright |
| `database` | 数据库管理 | + better-sqlite3 |
| `minimal-plugin` | 最小插件 | — |

天气查询 CLI 是纯 API 调用，选择 `api` 模板。生成完成后进入项目：

```bash
cd weather-cli
pnpm install
```

## 第二步：编写你的命令

创建天气查询命令 `src/commands/weather.ts`：

```typescript
import { z } from 'zod';
import { ok, fail } from '@dyyz1993/xcli-core';
import type { Core } from '@dyyz1993/xcli-core';

interface WeatherData {
  city: string;
  temperature: number;
  description: string;
  humidity: number;
}

export function registerWeatherCommand(app: Core): void {
  const site = app.loader.getAPI().createSite({
    name: 'weather',
    url: 'https://wttr.in',
  });

  site.command('weather', {
    description: '查询城市天气',
    scope: 'action',
    parameters: z.object({
      city: z.string().min(1).describe('城市名称（英文）'),
      format: z.enum(['simple', 'detail']).default('simple').describe('输出格式'),
    }),
    handler: async (params) => {
      const url = `https://wttr.in/${encodeURIComponent(params.city)}?format=j1`;

      let response: Response;
      try {
        response = await fetch(url);
      } catch (err) {
        return fail(`网络请求失败: ${(err as Error).message}`, [
          '请检查网络连接',
          `请求地址: ${url}`,
        ]);
      }

      if (!response.ok) {
        return fail(`API 返回错误: ${response.status} ${response.statusText}`, [
          `城市 "${params.city}" 可能不存在`,
          `状态码: ${response.status}`,
        ]);
      }

      const json = (await response.json()) as {
        current_condition: Array<{
          temp_C: string;
          weatherDesc: Array<{ value: string }>;
          humidity: string;
        }>;
      };

      const current = json.current_condition?.[0];
      if (!current) {
        return fail('API 返回数据格式异常', ['未找到 current_condition 字段']);
      }

      const data: WeatherData = {
        city: params.city,
        temperature: Number(current.temp_C),
        description: current.weatherDesc?.[0]?.value ?? 'unknown',
        humidity: Number(current.humidity),
      };

      const tips =
        params.format === 'detail'
          ? [
              `${data.city}: ${data.temperature}°C, ${data.description}`,
              `湿度 ${data.humidity}%`,
            ]
          : [`${data.city}: ${data.temperature}°C, ${data.description}`];

      return ok(data, tips);
    },
  });
}
```

在入口文件 `src/index.ts` 中注册：

```typescript
import { Core } from '@dyyz1993/xcli-core';
import { registerWeatherCommand } from './commands/weather.js';

export function createApp(): Core {
  const app = new Core({
    name: 'weather-cli',
    version: '0.1.0',
    description: '天气查询 CLI',
    configDirName: '.weather-cli',
    envPrefix: 'WEATHER_CLI',
    pluginDirs: [],
  });

  registerWeatherCommand(app);
  return app;
}
```

CLI 入口 `bin/cli.ts`：

```typescript
#!/usr/bin/env node
import { createApp } from '../src/index.js';

const app = createApp();
await app.run(process.argv.slice(2));
```

## 第三步：本地测试

### 构建验证

```bash
pnpm run build
```

期望输出：无错误，`dist/` 目录生成 `.js` 和 `.d.ts` 文件。

### 全局链接

```bash
npm link
```

这会在全局创建符号链接，之后可像真实 CLI 一样调用：

```bash
weather-cli weather --city Beijing
```

期望输出：

```
Beijing: 22°C, Partly cloudy
```

测试 detail 模式和错误情况：

```bash
# 详细模式
weather-cli weather --city London --format detail
# 输出: London: 15°C, Light rain
#        湿度 78%

# 参数校验（缺少必填参数）
weather-cli weather
# 输出: Missing required argument: --city <string>
```

### 解除链接

开发完成后：

```bash
npm unlink -g weather-cli
```

## 第四步：编写测试

创建 `src/commands/__tests__/weather.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { ok, fail, isCommandResult } from '@dyyz1993/xcli-core';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const handler = async (
  params: { city: string; format: 'simple' | 'detail' }
) => {
  const url = `https://wttr.in/${encodeURIComponent(params.city)}?format=j1`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    return fail(`网络请求失败: ${(err as Error).message}`);
  }

  if (!response.ok) {
    return fail(`API 返回错误: ${response.status}`);
  }

  const json = {
    current_condition: [
      { temp_C: '22', weatherDesc: [{ value: 'Sunny' }], humidity: '45' },
    ],
  };

  return ok(
    {
      city: params.city,
      temperature: 22,
      description: 'Sunny',
      humidity: 45,
    },
    params.format === 'detail'
      ? [`${params.city}: 22°C, Sunny`, `湿度 45%`]
      : [`${params.city}: 22°C, Sunny`]
  );
};

describe('weather command', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should return weather data for a valid city', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current_condition: [
          { temp_C: '22', weatherDesc: [{ value: 'Sunny' }], humidity: '45' },
        ],
      }),
    });

    const result = await handler({ city: 'Beijing', format: 'simple' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      city: 'Beijing',
      temperature: 22,
      description: 'Sunny',
      humidity: 45,
    });
    expect(result.tips).toContain('Beijing: 22°C, Sunny');
  });

  it('should return detail format when requested', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current_condition: [
          { temp_C: '22', weatherDesc: [{ value: 'Sunny' }], humidity: '45' },
        ],
      }),
    });

    const result = await handler({ city: 'Beijing', format: 'detail' });

    expect(result.tips).toHaveLength(2);
    expect(result.tips[1]).toBe('湿度 45%');
  });

  it('should handle network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await handler({ city: 'Beijing', format: 'simple' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('网络请求失败');
  });

  it('should handle API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await handler({ city: 'InvalidCity', format: 'simple' });

    expect(result.success).toBe(false);
    expect(result.message).toContain('404');
  });

  it('should validate parameters schema', () => {
    const schema = z.object({
      city: z.string().min(1),
      format: z.enum(['simple', 'detail']).default('simple'),
    });

    const valid = schema.safeParse({ city: 'Beijing' });
    expect(valid.success).toBe(true);

    const invalid = schema.safeParse({});
    expect(invalid.success).toBe(false);
  });

  it('should return a valid CommandResult', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current_condition: [
          { temp_C: '22', weatherDesc: [{ value: 'Sunny' }], humidity: '45' },
        ],
      }),
    });

    const result = await handler({ city: 'Beijing', format: 'simple' });
    expect(isCommandResult(result)).toBe(true);
  });
});
```

运行测试：

```bash
pnpm run test
```

## 第五步：配置 GitHub CI

创建 `.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      # 检查代码风格
      - name: Lint
        run: pnpm run lint

      # 类型检查，确保 TypeScript 无错误
      - name: Typecheck
        run: pnpm run typecheck

      # 构建验证，确保产物可生成
      - name: Build
        run: pnpm run build

      # 运行测试并收集覆盖率
      - name: Test with coverage
        run: pnpm run test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: false
```

每步作用：
- **Lint**：捕获风格问题和潜在错误
- **Typecheck**：编译期类型安全验证
- **Build**：确认产物完整生成
- **Test + coverage**：功能回归 + 覆盖率追踪

## 第六步：配置 npm 发布

### package.json 关键字段

```json
{
  "name": "weather-cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "weather-cli": "dist/bin/cli.js"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "scripts": {
    "build": "tsup",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "prepublishOnly": "npm run lint && npm run typecheck && npm run build"
  }
}
```

字段说明：
- **`bin`**：注册全局命令，用户 `npm install -g` 后可用
- **`main` / `exports`**：库模式入口，供其他项目 `import` 使用
- **`files`**：白名单发布文件，只上传 `dist/` 避免源码泄漏
- **`publishConfig.access`**：`public` 使 scoped 包可公开访问
- **`prepublishOnly`**：发布前自动执行检查，防止发布有问题的版本

### 手动发布流程

```bash
# 登录 npm
npm login

# 验证登录状态
npm whoami

# 发布
npm publish
```

首次发布 scoped 包（如 `@username/weather-cli`）：

```bash
npm publish --access public
```

### GitHub Actions 自动发布

创建 `.github/workflows/publish.yml`：

```yaml
name: Publish

on:
  push:
    branches: [main]
    paths:
      - package.json
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Dry run (skip actual publish)'
        required: false
        default: false
        type: boolean

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: https://registry.npmjs.org/

      - run: pnpm install --frozen-lockfile
      - run: pnpm run build

      - name: Publish to npm
        run: npm publish ${{ github.event.inputs.dry_run == 'true' && '--dry-run' || '' }}
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

配置步骤：
1. 在 npm 生成 Access Token（类型选 Automation）
2. GitHub 仓库 → Settings → Secrets → 添加 `NPM_TOKEN`
3. 推送代码到 main 分支即可自动发布

### 版本管理

```bash
# patch: 修复 bug（0.1.0 → 0.1.1）
npm version patch -m 'fix: 修复城市编码问题'

# minor: 新增功能（0.1.0 → 0.2.0）
npm version minor -m 'feat: 新增 5 天预报命令'

# major: 破坏性变更（0.1.0 → 1.0.0）
npm version major -m 'feat!: 重新设计 API 接口'
```

`npm version` 会自动更新 `package.json`、创建 git tag 并提交。

## 第七步：发布后的维护

### 更新版本流程

```bash
# 1. 修复 bug
git checkout -b fix/encoding main
# 修改代码...
pnpm run lint && pnpm run typecheck && pnpm run test
git commit -m 'fix: 修复城市名编码问题'
git push origin fix/encoding
# 创建 PR，合并后自动发布
```

### Changelog 管理

在项目根目录维护 `CHANGELOG.md`：

```markdown
# Changelog

## [0.2.0] - 2026-05-08
### Added
- `forecast` 命令：支持 5 天天气预报

## [0.1.1] - 2026-05-07
### Fixed
- 修复城市名含空格时请求失败的问题

## [0.1.0] - 2026-05-06
### Added
- 初始版本，支持 `weather` 命令
```

## 完整项目结构

```
weather-cli/
├── .github/
│   └── workflows/
│       ├── ci.yml           # CI 流水线
│       └── publish.yml      # 自动发布
├── bin/
│   └── cli.ts               # CLI 入口
├── src/
│   ├── commands/
│   │   ├── __tests__/
│   │   │   └── weather.test.ts
│   │   └── weather.ts
│   └── index.ts             # 导出 createApp
├── dist/                    # 构建产物（gitignore）
├── tsup.config.ts
├── tsconfig.json
├── package.json
├── CHANGELOG.md
└── README.md
```

## 常见问题

### npm link 后命令找不到？

检查 `package.json` 的 `bin` 字段路径是否与构建产物一致。确保 `dist/bin/cli.js` 存在且文件头有 `#!/usr/bin/env node`。

### 发布后用户安装报错？

1. 确认 `files` 字段包含 `dist`
2. 确认 `prepublishOnly` 构建成功
3. 用 `npm pack --dry-run` 检查实际打包内容
4. 确认 `type: "module"` 时入口使用 `.js` 扩展名

### CI 测试失败怎么办？

1. 本地先跑完整流程：`pnpm run lint && pnpm run typecheck && pnpm run build && pnpm run test`
2. 检查 Node.js 版本是否匹配（本地 20，CI 矩阵 18/20）
3. 查看 CI 日志中具体失败步骤，不要只看最终结果
