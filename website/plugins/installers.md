---
title: 安装器
---

# 插件安装器

框架提供 5 种安装方式，通过 `PluginInstaller` 接口统一抽象。

## 安装方式

| 类型 | 说明 | source 示例 |
|------|------|-------------|
| `local` | 本地路径 | `./plugins/my-plugin` |
| `npm` | npm 包 | `@scope/xcli-plugin-foo` |
| `git` | Git 仓库 | `https://github.com/user/plugin.git` |
| `url` | 远程 URL | `https://example.com/plugin.tar.gz` |
| `builtin` | 内置插件 | 框架自带 |

## PluginInstaller 接口

```typescript
type PluginInstallerType = 'local' | 'npm' | 'git' | 'url' | 'builtin';

interface PluginInstaller {
  readonly type: PluginInstallerType;
  install(source: string, options?: InstallOptions): Promise<PluginInstance>;
  uninstall(pluginId: string): Promise<void>;
  update(pluginId: string): Promise<PluginInstance>;
  list(): Promise<PluginInstance[]>;
}
```

## 手动加载

```typescript
import { PluginLoader } from '@dyyz1993/xcli-core';

const loader = new PluginLoader();

// 加载单个插件
const plugin = loader.loadPlugin('./plugins/my-plugin');

// 扫描目录加载所有
const plugins = loader.scanAndLoad([
  './.xcli/plugins',
  '../.xcli/plugins',
  '~/.xcli/plugins',
]);
```

## 热重载

```typescript
loader.loadPlugin('./plugins/my-plugin');
// 修改插件代码后
loader.reloadPlugin('my-plugin');
```
