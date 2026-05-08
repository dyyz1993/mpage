---
title: Core 类
---

# Core 类

`Core` 是整个框架的入口，接收 `CoreConfig` 配置并管理插件加载器。

## 构造函数

```typescript
class Core {
  constructor(config: CoreConfig);
}
```

### CoreConfig

```typescript
interface CoreConfig {
  name: string;           // CLI 名称
  version: string;        // 版本号
  description: string;    // 一句话描述
  configDirName: string;  // 配置目录名
  envPrefix: string;      // 环境变量前缀
  pluginDirs: string[];   // 插件搜索目录
  pluginPackageName?: string; // 插件 import 别名
}
```

## 方法

### run

解析命令行参数并执行。

```typescript
await app.run(process.argv.slice(2));
```

### start

启动 CLI（内部调用 run）。

```typescript
app.start();
```

## 使用示例

```typescript
import { Core } from '@dyyz1993/xcli-core';

const app = new Core({
  name: 'my-cli',
  version: '0.1.0',
  description: '我的 CLI 工具',
  configDirName: '.my-cli',
  envPrefix: 'MY_CLI',
  pluginDirs: ['./plugins'],
});

await app.run(process.argv.slice(2));
```

## loader 属性

通过 `app.loader` 访问 PluginLoader 实例：

```typescript
const api = app.loader.getAPI();
const plugins = app.loader.getLoadedPlugins();
```
