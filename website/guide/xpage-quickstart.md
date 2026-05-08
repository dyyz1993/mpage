---
title: mpage 快速开始
---

# mpage 快速开始

## 安装

```bash
npm install @dyyz1993/xpage
```

## 1. 执行页面命令

```typescript
import { executePageCommand } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await executePageCommand(page, 'goto', { url: 'https://example.com' });
  const { title } = await executePageCommand(page, 'title', {});
  console.log(title);

  await executePageCommand(page, 'screenshot', { path: 'example.png' });
  const { text } = await executePageCommand(page, 'text', {});
  console.log(text);

  await browser.close();
}

run();
```

## 2. 录制用户操作

```typescript
import { RecorderController } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

async function record() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const recorder = new RecorderController(page);
  await recorder.start({ url: 'https://example.com', name: 'demo' });

  // 用户在浏览器中交互...

  const { path } = await recorder.stop('./recordings/demo.yaml');
  console.log(`Recording saved to: ${path}`);

  await browser.close();
}

record();
```

## 3. 回放录制

```typescript
import { PlaybackEngine } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

async function replay() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const player = await PlaybackEngine.fromFile(page, './recordings/demo.yaml');
  const result = await player.play({
    slowMo: 100,
    stopOnError: true,
  });

  console.log(`Replayed ${result.eventsPlayed} events`);
  await browser.close();
}

replay();
```

## 4. 提取页面结构

```typescript
import { executePageCommand } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

async function extract() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await executePageCommand(page, 'goto', { url: 'https://example.com' });

  const { structure, yaml } = await executePageCommand(page, 'structure', {
    selector: 'body',
    maxDepth: 5,
  });

  console.log('Structure:', structure);
  console.log('YAML:', yaml);

  await browser.close();
}

extract();
```

## 5. 无障碍树

```typescript
import { executePageCommand } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

async function accessibility() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await executePageCommand(page, 'goto', { url: 'https://example.com' });

  const { snapshot } = await executePageCommand(page, 'a11y', {
    selector: 'main',
    format: 'yaml',
  });

  console.log(snapshot);
  await browser.close();
}

accessibility();
```

## 常用命令速查

### 导航

```typescript
await executePageCommand(page, 'goto', { url: 'https://example.com' });
await executePageCommand(page, 'goBack', {});
await executePageCommand(page, 'goForward', {});
await executePageCommand(page, 'reload', {});
```

### 元素交互

```typescript
await executePageCommand(page, 'click', { selector: '#button' });
await executePageCommand(page, 'fill', { selector: '#input', value: 'Hello' });
await executePageCommand(page, 'type', { selector: '#search', text: 'keyword' });
await executePageCommand(page, 'hover', { selector: '#menu' });
```

### 查询和提取

```typescript
const { text } = await executePageCommand(page, 'text', { selector: '.content' });
const { html } = await executePageCommand(page, 'html', { selector: '#main' });
const { value } = await executePageCommand(page, 'getAttribute', {
  selector: '#link',
  name: 'href',
});
```

### 执行 JavaScript

```typescript
const { result } = await executePageCommand(page, 'evaluate', {
  expression: 'document.title',
});

const { result: asyncResult } = await executePageCommand(page, 'evaluateRaw', {
  script: 'async () => { return await fetch("/api").then(r => r.json()) }',
});
```

## 下一步

- [页面命令](/guide/page-commands) — 全部命令详解
- [录制与回放](/guide/recording-playback) — 录制系统深入
- [API 参考](/api/xpage/overview) — 完整 API 文档
