# 36个爬虫案例自动化验证方案

## 📋 方案概述

本方案为 36 个爬虫练习案例提供完整的自动化验证框架，包括插件开发、测试框架、分阶段实施计划和改进点追踪机制。

### 核心目标

1. 将 36 个案例每个做成一个 xcli 插件
2. 每个插件封装对应场景的爬虫能力
3. 自动化测试：只给目标（如"提取所有文章标题"），让插件自主执行并验证
4. 过程中发现 mpage/xcli 的不足并改进
5. 最终形成可复用的插件生态

### 方案文档

- **[完整实施方案](./docs/36-cases-implementation-plan.md)** - 详细的实施指南
- **[元数据配置](./.xcli/plugins/metadata.json)** - 插件元数据
- **[测试框架](./tests/framework)** - 测试工具和配置

## 🏗️ 项目结构

```
mpage/
├── .xcli/plugins/           # 插件目录
│   ├── 01-static/           # 静态HTML读取
│   ├── 02-extract-urls/     # URL提取
│   ├── ...
│   ├── 36-stock-trading/    # 证券交易
│   └── metadata.json        # 插件元数据
│
├── tests/                   # 测试目录
│   ├── e2e/                # E2E测试
│   │   ├── plugin-e2e.spec.ts
│   │   ├── plugin-test-runner.ts
│   │   └── fixtures/       # 测试fixture
│   └── framework/          # 测试框架
│       └── test-config.ts
│
├── tools/                  # 工具脚本
│   ├── improvement-tracker.ts   # 改进点追踪
│   ├── metadata-query.ts       # 元数据查询
│   └── test-reporter.ts        # 测试报告
│
├── docs/                   # 文档
│   ├── 36-cases-implementation-plan.md
│   └── improvements/      # 改进点文档
│       ├── mpage/
│       ├── xcli/
│       └── plugins/
│
└── .github/workflows/      # CI/CD
    └── test-plugins.yml
```

## 🎯 插件开发流程

### 1. 创建插件

```bash
# 创建插件目录
mkdir -p .xcli/plugins/{id}-{name}

# 创建基础文件
cd .xcli/plugins/{id}-{name}
touch index.ts package.json README.md VERIFICATION.md
```

### 2. 插件模板

参见 `docs/36-cases-implementation-plan.md` 中的标准模板。

### 3. 实现命令

每个插件必须实现两个命令：

- **`scrape`**: 采集数据，返回 `{ data, tips }`
- **`verify`**: 自动验证，返回 `{ status, data, errors, tips }`

### 4. 运行测试

```bash
# 测试单个插件
npm run test:plugins -- 01-static

# 测试所有插件
npm run test:plugins

# 生成测试报告
npm run test:plugins:report
```

## 📅 分阶段实施计划

### Phase 1: 基础难度（1-5）✅ 已完成
- 01-static: 静态HTML页面读取
- 02-extract-urls: 提取页面URL
- 03-extract-content: 提取文章内容
- 04-pagination: 简单分页
- 05-url-params: URL参数控制

### Phase 2: 中等难度（6-12）⚠️ 进行中
- 06-infinite-scroll: 无限滚动加载 ✅
- 07-lazy-load: 懒加载/点击加载 ✅
- 08-search: 搜索功能 ✅
- 09-rate-limit: IP限流模拟 ⚠️
- 10-login: 简单登录 ⚠️
- 11-session: Session/Cookie保持 ⚠️
- 12-captcha-numeric: 图片验证码 ⚠️

### Phase 3-8: 其他阶段 📋 规划中
详见 `docs/36-cases-implementation-plan.md`

## 🔧 工具使用

### 元数据查询

```bash
# 查看插件信息
npm run metadata:report

# 查看缺失能力
npm run metadata:report | grep -A 10 "缺失能力"
```

### 改进点追踪

```bash
# 查看改进点报告
npm run improvement:report

# 添加新改进点
tsx tools/improvement-tracker.ts add \
  --title "简化DOM操作API" \
  --priority "high" \
  --source "Phase 1 - 01-static"
```

### 测试报告

```bash
# 生成测试报告
npm run test:plugins:report

# 查看HTML报告
open test-results/report.html
```

## 📊 进度追踪

当前进度：

- **Phase 1**: 5/5 (100%) ✅
- **Phase 2**: 3/7 (43%) ⚠️
- **Phase 6**: 1/4 (25%) ⚠️
- **Phase 8**: 3/6 (50%) ⚠️

总体进度: 12/36 (33%)

## 🚀 快速开始

### 1. 运行现有插件

```bash
# 测试静态HTML读取插件
xcli 01-static scrape

# 验证结果
xcli 01-static verify
```

### 2. 开发新插件

参考 `docs/36-cases-implementation-plan.md` 中的插件开发指南。

### 3. 运行E2E测试

```bash
# 运行所有E2E测试
npm run test:plugins

# 运行特定测试
npm run test:plugins -- --reporter=verbose 01-static
```

## 📖 文档索引

- [完整实施方案](./docs/36-cases-implementation-plan.md) - 详细的设计和实施指南
- [插件开发指南](./docs/plugin-development-guide.md) - 插件开发教程
- [改进点追踪](./docs/improvement-tracking.md) - 改进点管理说明

## 🤝 贡献指南

1. 选择一个待实现的案例（查看元数据配置）
2. 创建对应的插件目录和文件
3. 实现 `scrape` 和 `verify` 命令
4. 运行 E2E 测试确保通过
5. 更新元数据配置
6. 提交 PR

## 📝 许可证

MIT License

## 🔗 相关链接

- [爬虫练习场](https://tools.docker.19930810.xyz:8443/tools/crawler-practice/index.html)
- [mpage 文档](./README.md)
- [xcli 文档](./xcli/README.md)
