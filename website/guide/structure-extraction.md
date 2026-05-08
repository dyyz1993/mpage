---
title: 页面结构提取
---

# 页面结构提取

## DOM 结构提取

获取页面的语义化布局树：

```typescript
import { executePageCommand } from '@dyyz1993/xpage';

const { structure, yaml } = await executePageCommand(page, 'structure', {
  selector: 'body',
  maxDepth: 5,
});

console.log('Structure:', structure);
console.log('YAML:', yaml);
```

### StructureArgs

```typescript
interface StructureArgs {
  selector?: string;   // 起始选择器，默认 'body'
  maxDepth?: number;   // 最大深度，默认 5
}
```

## ARIA 无障碍树

提取 ARIA 无障碍信息：

```typescript
const { snapshot } = await executePageCommand(page, 'a11y', {
  selector: 'main',
  format: 'yaml',
});
```

### A11yArgs

```typescript
interface A11yArgs {
  selector?: string;       // 起始选择器
  format?: 'yaml' | 'json'; // 输出格式
}
```

## ARIA 快照

获取页面的 ARIA 快照：

```typescript
const { snapshot } = await executePageCommand(page, 'snapshot', {
  selector: 'body',
});
```

## 使用场景

- **自动化测试** — 验证页面结构是否符合预期
- **无障碍审计** — 检查 ARIA 树是否完整
- **数据提取** — 从页面结构中提取结构化数据
- **页面对比** — 对比不同页面的结构差异
