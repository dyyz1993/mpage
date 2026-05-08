---
title: 踩坑指南
---

# 踩坑指南

## 常见陷阱

### CoreConfig 必填字段

`name`、`version`、`description`、`configDirName`、`envPrefix`、`pluginDirs` 全部必填，缺一不可。`configDirName` 决定了配置文件存储路径（`~/.configDirName/`），`envPrefix` 决定了环境变量前缀。

### tsup 输出路径与 bin 路径匹配

`package.json` 中 `bin` 字段指向的路径必须与 tsup 配置的输出路径一致：

```json
// package.json
{
  "bin": { "my-cli": "dist/bin/cli.js" }
}
```

```typescript
// tsup.config.ts
export default defineConfig([
  { entry: ['bin/cli.ts'], format: ['esm'] },
]);
```

### 类型断言的正确方式

在 `page.evaluate()` 内部只能使用标准 DOM API，**禁止使用 Playwright 选择器语法**：

```typescript
// ✅ 正确：evaluate 内用标准 DOM API
const data = await ctx.page.evaluate(() => {
  const el = document.getElementById('case-data') as HTMLScriptElement;
  return JSON.parse(el.textContent || '{}');
});

// ❌ 错误：evaluate 内使用 Playwright 选择器
const data = await ctx.page.evaluate(() => {
  document.querySelector(':has-text("hello")'); // 不支持！
});
```

### 插件 dependencies 声明

插件的依赖**必须**在插件自己的 `package.json` 中声明，不能依赖宿主项目的 `node_modules`：

```json
// .xcli/plugins/my-plugin/package.json
{
  "name": "my-plugin",
  "dependencies": {
    "zod": "^3.24.0"
  }
}
```

### CommandContext.storage 是按插件隔离的

每个插件的 `ctx.storage` 是独立的，不会与其他插件冲突：

```typescript
handler: async (params, ctx) => {
  await ctx.storage.set('lastQuery', params.sql);
  const last = await ctx.storage.get<string>('lastQuery');
}
```

### parameters 不是 params

xcli 框架通过 `cmd.parameters` 读取 Zod schema，`site.command()` 中必须用 `parameters: z.object({...})`。

### script 标签用 state: 'attached'

`<script>` 是 hidden 元素，`waitForSelector('#case-data')` 默认等 visible 会超时。

正确：`page.waitForSelector('#case-data', { state: 'attached' })` 或 `page.waitForFunction(...)`

## 调试技巧

### 日志配置

```bash
export MY_CLI_DEBUG=1
node dist/bin/cli.js daemon:status
```

### 插件加载排查

```typescript
const plugins = core.loader.getLoadedPlugins();
for (const p of plugins) {
  console.log(`${p.id}: ${p.status}`);
  if (p.error) {
    console.error('  错误:', p.error.message);
  }
}
```

### Daemon 状态检查

```typescript
import { getDaemonStatus, isDaemonRunning } from '@dyyz1993/xcli-core';

const running = await isDaemonRunning({ configDir: '/path/to/config' });
const status = await getDaemonStatus({ configDir: '/path/to/config' });
// status: { pid, port, startedAt, workers: [...] }
```

### Worker 通信调试

```typescript
async init(ctx: WorkerContext): Promise<void> {
  ctx.ipc.send('debug', { step: 'init-start', config: ctx.config });
  ctx.ipc.send('debug', { step: 'init-done' });
}
```
