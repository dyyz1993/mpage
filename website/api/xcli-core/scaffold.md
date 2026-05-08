---
title: ScaffoldEngine
---

# ScaffoldEngine

模板化项目生成引擎，内置 5 种模板。

## API

```typescript
class ScaffoldEngine {
  registerTemplate(template: ScaffoldTemplate): void;
  getTemplate(name: string): ScaffoldTemplate | undefined;
  listTemplates(): Array<{ name: string; description: string }>;
  generate(
    templateName: string,
    projectName: string,
    options?: ScaffoldOptions
  ): Promise<ScaffoldResult>;
}
```

## 使用示例

```typescript
import { ScaffoldEngine, BASE_CLI_TEMPLATE } from '@dyyz1993/xcli-core';

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
| database | `DATABASE_CLI_TEMPLATE` | 数据库管理 |
| api | `API_CLI_TEMPLATE` | API 交互 |
| minimal-plugin | `MINIMAL_PLUGIN_TEMPLATE` | 最小插件 |

## 类型定义

### ScaffoldTemplate

```typescript
interface ScaffoldTemplate {
  name: string;
  description: string;
  variables: TemplateVariable[];
  files: TemplateFile[];
  postGenerate?: (projectDir: string, variables: Record<string, string>) => Promise<void>;
}
```

### TemplateVariable

```typescript
interface TemplateVariable {
  name: string;
  description: string;
  default?: string;
  required?: boolean;
  validate?: (value: string) => boolean | string;
}
```

### TemplateFile

```typescript
interface TemplateFile {
  path: string;
  content: string;
  skipIfExists?: boolean;
  mode?: number;
}
```

### ScaffoldOptions

```typescript
interface ScaffoldOptions {
  targetDir?: string;
  variables?: Record<string, string>;
  force?: boolean;
  skipPostGenerate?: boolean;
}
```

### ScaffoldResult

```typescript
interface ScaffoldResult {
  projectDir: string;
  files: string[];
  skipped: string[];
  overwritten: string[];
}
```

## 插件模板生成

```typescript
import { MINIMAL_PLUGIN_TEMPLATE } from '@dyyz1993/xcli-core';

await engine.generate('minimal-plugin', 'my-plugin', {
  targetDir: './my-plugin',
  variables: {
    projectName: 'my-plugin',
  },
});
```
