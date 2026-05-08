---
title: PluginLoader
---

# PluginLoader

加载、卸载、管理插件。

## API

```typescript
class PluginLoader {
  loadPlugin(pluginPath: string, explicitId?: string): Promise<PluginInstance>;
  unloadPlugin(pluginId: string): Promise<void>;
  reloadPlugin(pluginId: string): Promise<void>;
  scanAndLoad(dirs: string[]): Promise<PluginInstance[]>;
  getLoadedPlugins(): PluginInstance[];
  getAPI(): XCLIAPI;
}
```

## 加载插件

```typescript
const instance = await core.loader.loadPlugin('./plugins/my-plugin/index.ts');
```

## 卸载插件

```typescript
await core.loader.unloadPlugin('my-plugin');
```

## 重新加载

```typescript
await core.loader.reloadPlugin('my-plugin');
```

## 扫描目录加载

```typescript
const plugins = await core.loader.scanAndLoad([
  './.xcli/plugins',
  '../.xcli/plugins',
  '~/.xcli/plugins',
]);
```

## 插件加载机制

插件通过 jiti 运行时编译 TypeScript：

```typescript
const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: { [packageName]: coreEntryPath },
});

const plugin = await jiti.import(importPath);
const setup = plugin?.default ?? plugin;
if (typeof setup === 'function') {
  setup(this.api);
}
```

## PluginInstance

```typescript
interface PluginInstance {
  id: string;
  name: string;
  status: 'loaded' | 'unloaded' | 'error';
  commands: CommandEntry[];
  error?: Error;
}
```
