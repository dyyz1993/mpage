---
title: CI 配置 - xcli 文档
description: 为 create-xcli 生成的项目配置 GitHub Actions CI，覆盖 lint、build、test 自动化验证。
---

# CI 配置

为 `create-xcli` 生成的项目配置 GitHub Actions CI，确保每次提交都经过自动化验证。

## 最小 CI 配置

以下是一个覆盖 lint、build、test 的最小 workflow：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Test
        run: npm test
```

保存到 `.github/workflows/ci.yml` 即可生效。

## 覆盖率上传

使用 `c8` 或 `vitest --coverage` 生成覆盖率报告后，上传到 Codecov：

```yaml
      - name: Generate coverage
        run: npm run test -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          token: ${{ secrets.CODECOV_TOKEN }}
```

需要在仓库 Settings > Secrets 中添加 `CODECOV_TOKEN`。

## 自动发布

使用 semantic-release 或 Changesets 自动管理版本和发布：

```yaml
      - name: Release
        if: github.ref == 'refs/heads/main'
        run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Changesets 方案

如果你的项目使用 Changesets：

```yaml
      - name: Create Release Pull Request
        uses: changesets/action@v1
        with:
          publish: npm run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 模板参考

不同模板的 CI 侧重点不同：

| 模板 | 推荐检查项 |
|------|-----------|
| base | lint + build + test |
| minimal-plugin | lint + build |
| browser | lint + build + E2E（需要浏览器环境） |
| database | lint + build + 集成测试（需要数据库服务） |
| api | lint + build + 契约测试 |

### Browser 模板 CI

需要安装浏览器依赖：

```yaml
      - name: Install browsers
        run: npx playwright install --with-deps chromium

      - name: E2E tests
        run: npm run test:e2e
```

### Database 模板 CI

使用 service container 运行数据库：

```yaml
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
```

## 缓存优化

加快 CI 执行速度，缓存 node_modules 和构建产物：

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Cache build
        uses: actions/cache@v4
        with:
          path: dist
          key: build-${{ hashFiles('src/**') }}
          restore-keys: build-
```

## 触发条件建议

按路径过滤避免不必要的 CI 运行：

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'package.json'
      - 'package-lock.json'
```
