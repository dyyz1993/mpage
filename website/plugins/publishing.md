---
title: 发布插件 - xcli 文档
description: 将 xcli 插件发布到 npm 供其他用户安装使用，包含 package.json 配置和发布流程。
---

# 发布插件

将插件发布到 npm 供其他用户安装使用。

## 目录结构

```
xcli-plugin-my-plugin/
├── index.ts          # 插件入口（必须）
├── package.json      # 包配置（必须）
├── README.md         # 说明文档（必须）
└── _shared.ts        # 共享工具（可选）
```

## package.json 配置

```json
{
  "name": "xcli-plugin-my-plugin",
  "version": "1.0.0",
  "description": "My awesome xcli plugin",
  "main": "index.ts",
  "files": ["index.ts", "_shared.ts"],
  "keywords": ["xcli", "xcli-plugin"],
  "peerDependencies": {
    "@dyyz1993/xcli-core": ">=0.1.0"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/user/xcli-plugin-my-plugin"
  }
}
```

关键字段：

| 字段 | 说明 |
|------|------|
| `name` | 以 `xcli-plugin-` 开头，便于搜索 |
| `main` | 入口文件，通常为 `index.ts`（jiti 运行时编译） |
| `files` | 只发布必要文件，减小包体积 |
| `peerDependencies` | 声明对框架的依赖，避免重复安装 |

## npm publish 流程

```bash
# 1. 登录
npm login

# 2. 预览发布内容
npm pack --dry-run
# npm notice 📦  xcli-plugin-my-plugin@1.0.0
# npm notice Tarball Contents
# npm notice 1.1kB index.ts
# npm notice 0.3kB package.json

# 3. 发布
npm publish

# scoped 包需指定公开
npm publish --access public

# 4. 验证
npm info xcli-plugin-my-plugin
```

## 版本管理

遵循 semver 语义化版本：

```bash
npm version patch   # 修复 bug:  1.0.0 → 1.0.1
npm version minor   # 新增功能:  1.0.0 → 1.1.0
npm version major   # 破坏变更:  1.0.0 → 2.0.0
npm publish         # 发布新版本
```

版本号规则：

| 变更类型 | 版本变化 | 示例 |
|----------|----------|------|
| 修复 bug | patch | 1.0.0 → 1.0.1 |
| 新增命令/参数 | minor | 1.0.0 → 1.1.0 |
| 删除/重命名命令 | major | 1.0.0 → 2.0.0 |
| 修改返回结构 | major | 1.0.0 → 2.0.0 |

## 让其他用户安装

```bash
# npm 安装
xcli plugin install xcli-plugin-my-plugin

# 指定版本
xcli plugin install xcli-plugin-my-plugin --version 1.2.0

# Git 安装
xcli plugin install github:user/xcli-plugin-my-plugin
```

## README 模板

```markdown
# xcli-plugin-my-plugin

xcli 插件，用于 example.com 数据采集。

## 安装

\`\`\`bash
xcli plugin install xcli-plugin-my-plugin
\`\`\`

## 命令

### scrape

采集商品列表数据。

\`\`\`bash
xcli my-plugin scrape --keyword "手机" --limit 20
\`\`\`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 是 | 搜索关键词 |
| limit | number | 否 | 最大条数，默认 10 |

## 开发

\`\`\`bash
git clone https://github.com/user/xcli-plugin-my-plugin.git
cd xcli-plugin-my-plugin && npm install && npm test
\`\`\`

## License

MIT
```

## 常见问题

**Q: 插件使用了第三方依赖（如 zod），如何处理？**

在 `dependencies` 中声明（不是 `peerDependencies`），npm 安装时会自动下载到插件目录。

**Q: `.ts` 文件需要预编译吗？**

不需要。`jiti` 在运行时编译 TypeScript，`main` 指向 `.ts` 文件即可。

**Q: 如何撤回已发布版本？**

72 小时内可撤回：`npm unpublish xcli-plugin-my-plugin@1.0.0`

**Q: 插件需要访问 CLI 内部状态怎么办？**

通过 `CommandContext` 获取，不要直接访问全局状态：

```typescript
handler: async (params, ctx) => {
  // ctx.storage — 插件隔离存储
  // ctx.site — 当前站点实例
  // ctx.args — 命令行参数
  // ctx.options — 选项参数
}
```
