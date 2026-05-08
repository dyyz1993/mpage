---
title: 安装插件（分步指南） - xcli 文档
description: 5 种 xcli 插件安装方式详解：本地目录、npm、Git URL、远程文件和配置文件，覆盖开发到生产全场景。
---

# 安装插件（分步指南）

框架提供 5 种插件安装方式，覆盖从开发到生产的全场景。

## 方式 1：本地目录（开发阶段）

将插件放到 `.xcli/plugins/` 下，框架自动扫描加载。

```bash
mkdir -p .xcli/plugins/my-plugin
cat > .xcli/plugins/my-plugin/index.ts << 'EOF'
import { ok } from '@dyyz1993/xcli-core';
import type { XCLIAPI } from '@dyyz1993/xcli-core';
export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({ name: 'my-plugin', url: 'https://example.com' });
  site.command('ping', {
    description: 'Ping',
    handler: async () => ok({ pong: true }, ['pong']),
  });
}
EOF
echo '{ "name": "my-plugin", "version": "1.0.0" }' > .xcli/plugins/my-plugin/package.json
```

验证：

```bash
xcli plugin list
# 输出: local:my-plugin  my-plugin  1.0.0  local  ...
```

## 方式 2：npm 安装

```bash
# 安装最新版
xcli plugin install xcli-plugin-foo

# 指定版本
xcli plugin install xcli-plugin-foo --version 1.2.0

# 私有 registry
xcli plugin install @scope/xcli-plugin-foo --registry https://npm.mycompany.com
```

底层执行 `npm install <pkg> --prefix <pluginsDir>`，安装到 `node_modules/` 下。

验证：

```bash
xcli plugin list
# 输出: npm:xcli-plugin-foo  xcli-plugin-foo  1.2.0  npm  ...
```

## 方式 3：Git 仓库

```bash
# HTTPS URL
xcli plugin install https://github.com/user/xcli-plugin-demo.git

# GitHub 简写
xcli plugin install github:user/xcli-plugin-demo

# 强制覆盖
xcli plugin install https://github.com/user/xcli-plugin-demo.git --force
```

底层执行 `git clone <url> <pluginsDir>/<name>`。

更新插件：

```bash
xcli plugin update git:xcli-plugin-demo
# 底层执行 git pull
```

## 方式 4：URL 下载

从远程 URL 下载 `.js` / `.ts` 文件：

```bash
xcli plugin install https://example.com/plugins/my-plugin.js
xcli plugin install https://example.com/plugins/my-plugin.ts
```

底层行为：`fetch(url)` → 写入 `<pluginsDir>/url-plugins/<name>.js`，同时保存 `.meta.json` 记录来源 URL。

更新时使用保存的 URL 重新下载：

```bash
xcli plugin update url:my-plugin
```

## 方式 5：内置插件

随 CLI 一起分发，不需要额外安装。不支持卸载和单独更新。

## 验证安装

```bash
# 列出所有插件
xcli plugin list

# 验证命令可用
xcli my-plugin ping
# 输出: { success: true, data: { pong: true }, tips: ['pong'] }
```

## 卸载插件

```bash
xcli plugin uninstall npm:xcli-plugin-foo
xcli plugin uninstall git:xcli-plugin-demo
xcli plugin uninstall url:my-plugin

# 内置插件无法卸载
xcli plugin uninstall builtin:browse
# 输出: Error: Cannot uninstall built-in plugins
```

## 故障排查

| 现象 | 原因 | 解决方式 |
|------|------|----------|
| `Plugin entry not found` | 缺少 `index.ts` 或 `index.js` | 添加入口文件 |
| `SyntaxError` | TS 语法错误 | 检查代码语法 |
| `Cannot find module 'zod'` | 依赖未安装 | 插件目录运行 `npm install` |
| `Failed to clone` | Git 仓库不可达 | 检查网络或仓库地址 |
| `Failed to download` | URL 返回非 200 | 检查下载链接 |

热重载（无需重启）：

```bash
xcli plugin reload my-plugin
```
