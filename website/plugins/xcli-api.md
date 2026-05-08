---
title: XCLIAPI 接口
---

# XCLIAPI 接口

`XCLIAPI` 是插件开发者面对的核心接口。

## 接口定义

```typescript
interface XCLIAPI {
  createSite(config: SiteConfig): SiteInstance;
  registerCommand(cmd: Command & { handler: CommandHandler }): this;
  registerFlag(flag: FlagConfig): this;
  registerTool(tool: ToolConfig): this;
  overrideTool(name: string, tool: ToolConfig): this;
  onLoad(handler: () => void | Promise<void>): this;
  onUnload(handler: () => void | Promise<void>): this;
  onEvent(event: string, handler: EventHandler): this;
}
```

## createSite

创建插件的独立命名空间：

```typescript
const site = xcli.createSite({
  name: 'my-plugin',
  url: 'https://example.com',
  description: '示例插件',
  requiresLogin: false,
});
```

## SiteConfig

```typescript
interface SiteConfig {
  name: string;
  url?: string;
  description?: string;
  requiresLogin?: boolean;
}
```

## SiteInstance 方法

### command — 注册命令

```typescript
site.command('scrape', {
  description: '采集数据',
  scope: 'page',
  parameters: z.object({ selector: z.string() }),
  handler: async (params, ctx) => { /* ... */ },
});
```

### login / logout — 登录/登出

```typescript
site.login(async (ctx) => { /* 登录逻辑 */ });
site.logout(async (ctx) => { /* 登出逻辑 */ });
```

### 其他方法

```typescript
site.isLoggedIn(): Promise<boolean>;
site.requireLogin(): Promise<void>;
site.getStorage(): StorageContext;
site.getAllCommands(): Array<{ name: string; description: string; scope: CommandScope }>;
site.getCommand(name: string): CommandEntry | null;
```

## 生命周期钩子

```typescript
xcli.onLoad(async () => { console.log('插件加载完成'); });
xcli.onUnload(async () => { console.log('插件卸载'); });
```

## 事件系统

```typescript
xcli.onEvent('data:updated', (event) => {
  console.log(`收到事件: ${event.type}`);
});
```
