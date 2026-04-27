# TDD Architecture Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复架构评审中发现的 6 个高/中优先级 bug 和设计缺陷，采用 TDD 模式（先写测试 → 验证失败 → 修复 → 验证通过）

**Architecture:** 每个修复独立成 Task，按严重度从高到低排序。mpage 使用 `node:test` 测试框架，测试文件放在 `tests/` 目录下，运行命令为 `npm test`。

**Tech Stack:** Node.js built-in test runner (`node:test` + `node:assert`), TypeScript, Playwright (仅 E2E 测试需要 mock)

---

## Task 1: 修复 `deleteSessionInfo` 无效重试逻辑

**Files:**
- Modify: `src/session/storage.ts:38-54`
- Test: `tests/session/storage.test.ts`

**Bug:** `setTimeout(() => {}, 100)` 是空操作，重试之间没有任何延迟。三次重试实际上是瞬间连续执行。

### Step 1: 写失败测试 — 验证重试有实际延迟

在 `tests/session/storage.test.ts` 的 `describe('deleteSessionInfo')` 块内添加测试：

```typescript
it('should retry deletion with actual delay between attempts', async () => {
  const { mock } = await import('node:test');
  const rmSyncCalls: number[] = [];
  const originalRmSync = fs.rmSync;

  const info = makeSessionInfo({ name: 'retry-delay-test' });
  saveSessionInfo(info);

  let callCount = 0;
  const startTime = Date.now();

  // Temporarily make rmSync fail twice then succeed
  const originalExistsSync = fs.existsSync;
  let existsCallCount = 0;

  // We just verify the function completes successfully with a locked dir
  // by checking it doesn't throw even when first attempt fails
  const lockedDir = getSessionPath('retry-delay-test');
  
  // Simulate: first 2 rmSync calls fail, third succeeds
  let rmAttempts = 0;
  const patchedRmSync = (...args: Parameters<typeof fs.rmSync>) => {
    rmAttempts++;
    rmSyncCalls.push(Date.now() - startTime);
    if (rmAttempts < 3) {
      const err = new Error('EBUSY: resource busy or locked') as NodeJS.ErrnoException;
      err.code = 'EBUSY';
      throw err;
    }
    return originalRmSync(...args);
  };

  // Patch fs.rmSync temporarily
  const original = fs.rmSync;
  (fs as Record<string, unknown>)['rmSync'] = patchedRmSync;

  try {
    deleteSessionInfo('retry-delay-test');
    // After fix: should have 3 attempts
    assert.strictEqual(rmAttempts, 3, 'Expected 3 retry attempts');
    // After fix: should have actual delay between attempts (> 50ms each)
    if (rmSyncCalls.length >= 3) {
      const gap1 = rmSyncCalls[1] - rmSyncCalls[0];
      const gap2 = rmSyncCalls[2] - rmSyncCalls[1];
      assert.ok(gap1 >= 50, `Expected >= 50ms delay between retry 1-2, got ${gap1}ms`);
      assert.ok(gap2 >= 50, `Expected >= 50ms delay between retry 2-3, got ${gap2}ms`);
    }
  } finally {
    (fs as Record<string, unknown>)['rmSync'] = original;
    // Cleanup
    if (fs.existsSync(lockedDir)) {
      originalRmSync(lockedDir, { recursive: true, force: true });
    }
  }
});
```

### Step 2: 运行测试验证失败

Run: `npx tsx --test tests/session/storage.test.ts`
Expected: FAIL — `rmAttempts` 为 3 但延迟为 0ms（`setTimeout(() => {}, 100)` 无效）

### Step 3: 修复实现 — 将 `deleteSessionInfo` 改为异步 + 真正延迟

```typescript
export async function deleteSessionInfo(name: string): Promise<void> {
  const sessionPath = getSessionPath(name);
  if (fs.existsSync(sessionPath)) {
    for (let i = 0; i < 3; i++) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        break;
      } catch (e) {
        if (i < 2) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else {
          console.error(`Failed to delete session directory: ${e}`);
        }
      }
    }
  }
}
```

**注意:** 函数签名从同步改为异步（`void` → `Promise<void>`），需检查所有调用方并加 `await`。使用 grep 查找所有调用点：
- `bin/mpage.ts` 中的调用需要加 `await`

### Step 4: 运行测试验证通过

Run: `npx tsx --test tests/session/storage.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/session/storage.ts tests/session/storage.test.ts
git commit -m "fix(mpage): fix broken retry delay in deleteSessionInfo"
```

---

## Task 2: 修复 `async forEach` 未等待完成

**Files:**
- Modify: `src/server/recorder/controller.ts:214-223`
- Test: `tests/server/recorder.test.ts`

**Bug:** `this.trackedPages.forEach(async ...)` 不等待 async 回调完成，`clear()` 在注入停止脚本之前就执行了。

### Step 1: 写失败测试 — 验证 stop() 等待所有页面

在 `tests/server/recorder.test.ts` 中添加测试，验证 `stop()` 时所有 trackedPages 的 `addScriptTag` 都被调用后才 `clear()`：

```typescript
it('should await all trackedPages addScriptTag before clearing', async () => {
  const { mock } = await import('node:test');
  
  const addScriptTagCalls: string[] = [];
  const mockPages: Page[] = [];
  
  for (let i = 0; i < 3; i++) {
    const mockPage = {
      addScriptTag: mock.fn(async (opts: { content: string }) => {
        addScriptTagCalls.push(`page-${i}-${Date.now()}`);
        // Simulate async work
        await new Promise(r => setTimeout(r, 50));
      }),
      url: mock.fn(() => 'http://example.com'),
      title: mock.fn(async () => 'Test'),
      on: mock.fn(),
      off: mock.fn(),
    } as unknown as Page;
    mockPages.push(mockPage);
    controller.trackedPages.add(mockPage);
  }

  await controller.stop();

  // After fix: all addScriptTag should be called before trackedPages is cleared
  assert.strictEqual(addScriptTagCalls.length, 3, 'All tracked pages should receive stop script');
  assert.strictEqual(controller.trackedPages.size, 0, 'trackedPages should be cleared after stop');
});
```

### Step 2: 运行测试验证失败

Run: `npx tsx --test tests/server/recorder.test.ts`
Expected: FAIL — `addScriptTagCalls.length` 为 0（forEach 不等待）

### Step 3: 修复实现

将 `controller.ts:214-223` 替换为：

```typescript
await Promise.all(
  Array.from(this.trackedPages).map(async (trackedPage) => {
    try {
      await trackedPage.addScriptTag({
        content: `if (window.__pageRecorder) { window.__pageRecorder.stop(); }`,
      });
    } catch {
      // Ignore errors if page is already closed
    }
  })
);
this.trackedPages.clear();
```

### Step 4: 运行测试验证通过

Run: `npx tsx --test tests/server/recorder.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/server/recorder/controller.ts tests/server/recorder.test.ts
git commit -m "fix(mpage): await all trackedPages stop script injection in RecorderController.stop()"
```

---

## Task 3: 修复 `a11y` 命令 selector 字符串注入

**Files:**
- Modify: `src/server/commands/snapshot.ts:22-156`
- Test: `tests/server/commands/snapshot.test.ts`（新建）

**Bug:** `('${selector}')` 直接拼接用户输入到 JS 字符串中，selector 含单引号会注入代码。

### Step 1: 写失败测试 — 验证 selector 安全传递

创建 `tests/server/commands/snapshot.test.ts`：

```typescript
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { Page } from 'playwright-core';

describe('a11y command', () => {
  it('should pass selector as function argument, not string interpolation', async () => {
    const dangerousSelector = `'); throw new Error('injected');//`;
    let evaluateArg: unknown = null;
    let usedStringEval = false;

    const mockPage = {
      evaluate: mock.fn(async (arg: unknown, ...rest: unknown[]) => {
        if (typeof arg === 'string') {
          usedStringEval = true;
          // If string eval contains the raw selector, it's injection-vulnerable
          if (arg.includes(dangerousSelector)) {
            throw new Error('Injection vulnerability: selector interpolated into eval string');
          }
        }
        // Correct pattern: function + argument
        evaluateArg = rest[0] || arg;
        return { json: {}, yaml: '' };
      }),
    } as unknown as Page;

    const { snapshotCommands } = await import('../../../src/server/commands/snapshot.js');
    await snapshotCommands.a11y!(mockPage, { selector: dangerousSelector });

    // After fix: should NOT use string interpolation
    assert.ok(!usedStringEval, 'Should not pass selector via string interpolation');
  });

  it('should handle selector with single quotes safely', async () => {
    const selectorWithQuotes = "[data-value='test']";
    let capturedSelector: string | undefined;

    const mockPage = {
      evaluate: mock.fn(async (fn: unknown, arg: unknown) => {
        if (typeof fn === 'function') {
          capturedSelector = arg as string;
          return fn({ querySelector: (s: string) => null, body: {} });
        }
        return { json: {}, yaml: '' };
      }),
    } as unknown as Page;

    const { snapshotCommands } = await import('../../../src/server/commands/snapshot.js');
    
    // Should NOT throw
    await assert.doesNotThrow(async () => {
      await snapshotCommands.a11y!(mockPage, { selector: selectorWithQuotes });
    });
  });
});
```

### Step 2: 运行测试验证失败

Run: `npx tsx --test tests/server/commands/snapshot.test.ts`
Expected: FAIL — 注入漏洞测试抛出异常

### Step 3: 修复实现

将 `snapshot.ts:22-156` 的 `a11y` 方法改为使用函数参数传递 selector：

```typescript
a11y: async (page: Page, args: Record<string, unknown>) => {
  const selector = (args.selector as string) || 'body';
  const format = (args.format as string) || 'yaml';
  
  const snapshot = await page.evaluate(
    (sel: string) => {
      function walk(node: Element | null, depth: number) {
        if (!node || node.nodeType !== 1) return null;

        var tag = node.tagName;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK', 'HEAD', 'HTML'].indexOf(tag) !== -1) return null;

        var role = node.getAttribute('role') ||
          (tag === 'BUTTON' ? 'button' :
           tag === 'A' ? 'link' :
           tag === 'INPUT' ? 'textbox' :
           tag === 'TEXTAREA' ? 'textbox' :
           tag === 'SELECT' ? 'combobox' :
           tag === 'IMG' ? 'img' :
           tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4' || tag === 'H5' || tag === 'H6' ? 'heading' :
           tag === 'UL' || tag === 'OL' ? 'list' :
           tag === 'LI' ? 'listitem' :
           tag === 'NAV' ? 'navigation' :
           tag === 'MAIN' ? 'main' :
           tag === 'HEADER' ? 'banner' :
           tag === 'FOOTER' ? 'contentinfo' :
           tag === 'FORM' ? 'form' :
           tag === 'TABLE' ? 'table' :
           tag === 'TR' ? 'row' :
           tag === 'TD' || tag === 'TH' ? 'cell' :
           tag === 'SPAN' ? 'text' : '');

        var directText = '';
        for (var i = 0; i < node.childNodes.length; i++) {
          var child = node.childNodes[i];
          if (child.nodeType === 3) {
            directText += child.textContent || '';
          }
        }
        directText = directText.trim();

        var name = node.getAttribute('aria-label') ||
          node.getAttribute('alt') ||
          node.getAttribute('title') ||
          (tag === 'INPUT' || tag === 'TEXTAREA' ? node.getAttribute('placeholder') : '') ||
          (directText ? directText.slice(0, 100) : '');

        var cssSelector = '';
        if (node.id) {
          cssSelector = '#' + node.id;
        } else if (node.className && typeof node.className === 'string') {
          var classes = node.className.trim().split(/\s+/).filter(function(c: string) { return c && !c.startsWith('reds-'); });
          if (classes.length > 0) {
            cssSelector = '.' + classes.slice(0, 2).join('.');
          }
        }

        var result: Record<string, unknown> = {};
        if (role) result.role = role;
        if (name) result.name = name;
        result.tag = tag.toLowerCase();
        if (cssSelector) result.selector = cssSelector;
        if (node.id) result.id = node.id;
        if (node.getAttribute('href')) result.href = node.getAttribute('href');
        if ((node as HTMLInputElement).disabled) result.disabled = true;

        var children: unknown[] = [];
        for (var j = 0; j < node.children.length; j++) {
          var childResult = walk(node.children[j], depth + 1);
          if (childResult) children.push(childResult);
        }

        if (children.length > 0) {
          result.children = children;
        }

        if (!role && !name && children.length === 0) return null;

        return result;
      }

      function toYaml(node: Record<string, unknown> | null, indent: number): string {
        if (!node) return '';
        var spaces = '  '.repeat(indent);
        var lines: string[] = [];

        var header = '';
        if (node.role) {
          header = node.role as string;
          if (node.name) header += ' "' + (node.name as string) + '"';
        } else if (node.name) {
          header = node.name as string;
        } else {
          header = node.tag as string;
        }

        if (node.selector && (node.selector as string).includes('.active')) {
          header = '✓ ' + header;
        }

        lines.push(spaces + '- ' + header);

        if (node.selector && node.selector !== '.' + node.tag) {
          lines.push(spaces + '  selector: ' + (node.selector as string));
        }
        if (node.href) {
          lines.push(spaces + '  href: ' + (node.href as string));
        }
        if (node.disabled) {
          lines.push(spaces + '  disabled: true');
        }

        if (node.children && Array.isArray(node.children)) {
          for (var k = 0; k < node.children.length; k++) {
            lines.push(toYaml(node.children[k] as Record<string, unknown>, indent + 1));
          }
        }

        return lines.join('\n');
      }

      var root = document.querySelector(sel) || document.body;
      var result = walk(root, 0);

      return {
        json: result,
        yaml: result ? toYaml(result as Record<string, unknown>, 0) : ''
      };
    },
    selector
  );

  if (format === 'json') {
    return { snapshot: (snapshot as { json: unknown; yaml: string }).json };
  }
  return { snapshot: (snapshot as { json: unknown; yaml: string }).yaml };
},
```

**关键变化:** `page.evaluate(`...('${selector}')`)` → `page.evaluate((sel) => {...}, selector)`，使用 Playwright 的参数传递机制而非字符串拼接。

### Step 4: 运行测试验证通过

Run: `npx tsx --test tests/server/commands/snapshot.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/server/commands/snapshot.ts tests/server/commands/snapshot.test.ts
git commit -m "fix(mpage): prevent selector injection in a11y command via page.evaluate argument passing"
```

---

## Task 4: 消除 `structure` 命令的临时文件

**Files:**
- Modify: `src/server/commands/query.ts:127-160`
- Test: `tests/server/commands/structure.test.ts`

**Bug:** 用 `Date.now()` 生成临时文件名存在竞态条件，且 `addScriptTag({ path })` 完全可以用 `addScriptTag({ content })` 替代，消除临时文件。

### Step 1: 写失败测试 — 验证不创建临时文件

在 `tests/server/commands/structure.test.ts` 中添加测试：

```typescript
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { Page } from 'playwright-core';

describe('structure command', () => {
  it('should not create temp files, use addScriptTag with content instead', async () => {
    const addScriptTagCalls: { path?: string; content?: string }[] = [];
    
    const mockPage = {
      addScriptTag: mock.fn(async (opts: { path?: string; content?: string }) => {
        addScriptTagCalls.push(opts);
      }),
      evaluate: mock.fn(async () => ({
        layout: { type: 'root' },
        yaml: '- root',
      })),
    } as unknown as Page;

    const { queryCommands } = await import('../../../src/server/commands/query.js');
    await queryCommands.structure!(mockPage, { selector: 'body' });

    // Should use content, not path
    assert.ok(addScriptTagCalls.length > 0, 'addScriptTag should be called');
    const call = addScriptTagCalls[0];
    assert.ok(call.content, 'Should use addScriptTag({ content }) not { path }');
    assert.strictEqual(call.path, undefined, 'Should NOT create temp file');
  });
});
```

### Step 2: 运行测试验证失败

Run: `npx tsx --test tests/server/commands/structure.test.ts`
Expected: FAIL — `call.path` 不为 undefined

### Step 3: 修复实现

将 `query.ts:127-160` 的 `structure` 方法简化：

```typescript
structure: async (page: Page, args: Record<string, unknown>) => {
  const selector = (args.selector as string) || 'body';

  interface ExtractorResult {
    layout: unknown;
    yaml: string;
  }

  await page.addScriptTag({
    content: `window.__structureExtractor = ${STRUCTURE_EXTRACTOR_CODE};`,
  });

  const result = await page.evaluate((sel: string): ExtractorResult => {
    const ext = (window as unknown as Record<string, unknown>).__structureExtractor;
    if (typeof ext === 'function') {
      return (ext as (opts: { selector: string }) => ExtractorResult)({ selector: sel });
    }
    return { layout: null, yaml: 'Extractor not loaded' };
  }, selector);

  return { structure: result.layout, yaml: result.yaml };
},
```

### Step 4: 运行测试验证通过

Run: `npx tsx --test tests/server/commands/structure.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/server/commands/query.ts tests/server/commands/structure.test.ts
git commit -m "fix(mpage): eliminate temp file race condition in structure command, use addScriptTag({ content })"
```

---

## Task 5: `evaluate` 命令增加参数验证

**Files:**
- Modify: `src/server/commands/evaluate.ts`
- Test: `tests/server/commands/evaluate.test.ts`（新建）

**Bug:** `evaluate` 和 `evaluateRaw` 不验证参数是否存在，传 `undefined` 会导致 Playwright 报错不明确。

### Step 1: 写失败测试

创建 `tests/server/commands/evaluate.test.ts`：

```typescript
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { Page } from 'playwright-core';

describe('evaluate command', () => {
  const mockPage = {
    evaluate: mock.fn(async (expr: string) => expr),
  } as unknown as Page;

  it('should reject missing expression parameter', async () => {
    const { evaluateCommands } = await import('../../../src/server/commands/evaluate.js');
    await assert.rejects(
      () => evaluateCommands.evaluate!(mockPage, {}),
      /expression.*required/i
    );
  });

  it('should reject non-string expression', async () => {
    const { evaluateCommands } = await import('../../../src/server/commands/evaluate.js');
    await assert.rejects(
      () => evaluateCommands.evaluate!(mockPage, { expression: 123 }),
      /expression.*string/i
    );
  });

  it('should reject missing script parameter for evaluateRaw', async () => {
    const { evaluateCommands } = await import('../../../src/server/commands/evaluate.js');
    await assert.rejects(
      () => evaluateCommands.evaluateRaw!(mockPage, {}),
      /script.*required/i
    );
  });

  it('should accept valid expression', async () => {
    const { evaluateCommands } = await import('../../../src/server/commands/evaluate.js');
    const result = await evaluateCommands.evaluate!(mockPage, { expression: '1+1' });
    assert.ok(result);
  });
});
```

### Step 2: 运行测试验证失败

Run: `npx tsx --test tests/server/commands/evaluate.test.ts`
Expected: FAIL — 当前无验证，不会 reject

### Step 3: 修复实现

```typescript
import type { Page } from 'playwright-core';
import type { CommandModule } from './types.js';

export const evaluateCommands: CommandModule = {
  evaluate: async (page: Page, args: Record<string, unknown>) => {
    if (typeof args.expression !== 'string') {
      throw new Error('evaluate: "expression" parameter is required and must be a string');
    }
    const result = await page.evaluate(args.expression);
    return { result };
  },

  evaluateRaw: async (page: Page, args: Record<string, unknown>) => {
    if (typeof args.script !== 'string') {
      throw new Error('evaluateRaw: "script" parameter is required and must be a string');
    }
    const wrapped = `(async () => { return ${args.script}; })()`;
    const result = await page.evaluate(wrapped);
    return { result };
  },

  wait: async (page: Page, args: Record<string, unknown>) => {
    await page.waitForTimeout(args.timeout as number);
    return { waited: args.timeout };
  },
};
```

### Step 4: 运行测试验证通过

Run: `npx tsx --test tests/server/commands/evaluate.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/server/commands/evaluate.ts tests/server/commands/evaluate.test.ts
git commit -m "fix(mpage): add parameter validation for evaluate commands"
```

---

## Task 6: 收紧 `CommandResult` 类型

**Files:**
- Modify: `src/types.ts:12-17`
- Test: `tests/server/commands/types.test.ts`

**Bug:** `content?: unknown` 太宽泛，每个消费者都需要 `as` 类型断言。`tips` 是 `string` 但经常被拼接。

### Step 1: 写失败测试

在已有的 `tests/server/commands/types.test.ts` 中添加类型检查测试：

```typescript
it('CommandResult should enforce typed content', () => {
  // This test validates at runtime that CommandResult has proper typing
  import type { CommandResult } from '../../../src/types.js';
  
  // These should compile without errors:
  const result1: CommandResult = {
    success: true,
    content: { url: 'http://example.com' },
  };
  const result2: CommandResult = {
    success: false,
    error: 'Something went wrong',
  };
  
  assert.ok(result1.success);
  assert.ok(!result2.success);
});
```

**注意:** 这个 Task 影响面大（所有使用 `CommandResult` 的文件），建议先只做 `content` 的类型收窄为 `Record<string, unknown> | unknown[] | string | number | boolean | null`，而不是 `unknown`。

### Step 2-5: 标准流程

由于 `content` 从 `unknown` 收窄影响范围不确定，建议将此 Task 标记为 **deferred**，先完成 Task 1-5 后再评估影响面。

---

## 执行顺序总结

| Task | 严重度 | 预计时间 | 风险 |
|------|--------|----------|------|
| Task 1 | 高 | 30min | 中（同步→异步签名变更） |
| Task 2 | 高 | 20min | 低（纯 bug fix） |
| Task 3 | 高 | 30min | 低（重构为安全模式） |
| Task 4 | 中 | 15min | 低（消除不必要的 I/O） |
| Task 5 | 中 | 15min | 低（增加验证） |
| Task 6 | 低 | 60min+ | 高（影响面大，建议 deferred） |

**推荐执行顺序:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → (Task 6 deferred)

**每完成一个 Task，运行全量验证:**
```bash
npm run validate
```
