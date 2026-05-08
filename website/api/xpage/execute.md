---
title: 命令执行
---

# 命令执行

## executePageCommand

执行单个页面命令。

```typescript
function executePageCommand(
  page: Page,
  commandName: string,
  args: Record<string, unknown>
): Promise<CommandResult<unknown>>
```

**参数：**
- `page` — Playwright Page 实例
- `commandName` — 命令名称
- `args` — 命令参数（根据命令 schema 校验）

**返回：** `Promise<CommandResult<T>>`

```typescript
const { title } = await executePageCommand(page, 'title', {});
```

## getCommandHandler

获取命令处理函数。

```typescript
function getCommandHandler(commandName: string): CommandHandler | undefined
```

```typescript
const handler = getCommandHandler('click');
if (handler) {
  await handler(page, { selector: '#btn' });
}
```

## hasCommand

检查命令是否存在。

```typescript
function hasCommand(commandName: string): boolean
```

## executeCommandChain

执行命令链。

```typescript
function executeCommandChain(
  page: Page,
  input: string,
  options?: ChainExecutionOptions
): Promise<ChainExecutionResult>
```

```typescript
const result = await executeCommandChain(page, `
  goto url=https://example.com &&
  title &&
  screenshot path=screen.png
`);
```

## 命令定义与解析

```typescript
import { commands, getCommandNames, parseArgsToRecord, parseCommandChain } from '@dyyz1993/xpage';

commands['goto'].schema;
getCommandNames();
const parsed = parseCommandChain('goto url=https://example.com && click selector=#btn');
```
