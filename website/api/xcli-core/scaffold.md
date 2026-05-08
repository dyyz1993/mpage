---
title: ScaffoldEngine
---

# ScaffoldEngine

模板化项目生成引擎，内置 5 种模板。

## API

```typescript
class ScaffoldEngine {
  generate(options: ScaffoldOptions): Promise<ScaffoldResult>;
  loadTemplate(name: string): ScaffoldTemplate;
  registerTemplate(name: string, template: ScaffoldTemplate): void;
}
```

## 使用示例

```typescript
import { ScaffoldEngine } from '@dyyz1993/xcli-core';

const engine = new ScaffoldEngine();
engine.registerTemplate(BASE_CLI_TEMPLATE);

const result = await engine.generate('base', 'my-cli', {
  variables: { description: 'My awesome CLI' },
});
```

## 内置模板

| 模板 | 常量 | 适用场景 |
|------|------|---------|
| base | `BASE_CLI_TEMPLATE` | 通用 CLI |
| browser | `BROWSER_APP_TEMPLATE` | 浏览器自动化 |
| database | — | 数据库管理 |
| api | — | API 交互 |
| minimal-plugin | `MINIMAL_PLUGIN_TEMPLATE` | 最小插件 |

## 插件模板生成

```typescript
await engine.generate({
  template: MINIMAL_PLUGIN_TEMPLATE,
  targetDir: './my-plugin',
  variables: {
    projectName: 'my-plugin',
  },
});
```
