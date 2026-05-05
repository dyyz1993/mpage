# Quick Start Guide

Get started with `@dyyz1993/xpage` in minutes.

## Installation

```bash
npm install @dyyz1993/xpage
```

Requires Node.js >= 18.0.0.

## Basic Usage

### 1. Execute Page Commands

All page operations use a unified command interface:

```typescript
import { executePageCommand } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to a page
  await executePageCommand(page, 'goto', { url: 'https://example.com' });

  // Get page title
  const { title } = await executePageCommand(page, 'title', {});
  console.log(title); // "Example Domain"

  // Take a screenshot
  await executePageCommand(page, 'screenshot', { path: 'example.png' });

  // Get page text
  const { text } = await executePageCommand(page, 'text', {});
  console.log(text);

  await browser.close();
}

run();
```

### 2. Record User Actions

Record user interactions in a real browser:

```typescript
import { RecorderController } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

async function record() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const recorder = new RecorderController(page);
  await recorder.start({ url: 'https://example.com', name: 'demo' });

  // User interacts with browser...
  // Click buttons, fill forms, navigate, etc.

  // Stop recording and save
  const { path } = await recorder.stop('./recordings/demo.yaml');
  console.log(`Recording saved to: ${path}`);

  await browser.close();
}

record();
```

### 3. Replay Recordings

Load and replay recorded actions:

```typescript
import { PlaybackEngine } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

async function replay() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Load recording from file
  const player = await PlaybackEngine.fromFile(page, './recordings/demo.yaml');

  // Replay with options
  const result = await player.play({
    slowMo: 100,        // 100ms delay between actions
    stopOnError: true,  // Stop on first error
  });

  console.log(`Replayed ${result.eventsPlayed} events`);
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  }

  await browser.close();
}

replay();
```

### 4. Extract Page Structure

Get semantic layout tree:

```typescript
import { executePageCommand } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

async function extract() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await executePageCommand(page, 'goto', { url: 'https://example.com' });

  // Extract structure as YAML
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

### 5. Accessibility Tree

Get ARIA accessibility tree:

```typescript
import { executePageCommand } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

async function accessibility() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await executePageCommand(page, 'goto', { url: 'https://example.com' });

  // Get accessibility snapshot
  const { snapshot } = await executePageCommand(page, 'a11y', {
    selector: 'main',
    format: 'yaml',
  });

  console.log(snapshot);

  await browser.close();
}

accessibility();
```

## Common Commands

### Navigation

```typescript
await executePageCommand(page, 'goto', { url: 'https://example.com' });
await executePageCommand(page, 'goBack', {});
await executePageCommand(page, 'goForward', {});
await executePageCommand(page, 'reload', {});
```

### Element Interaction

```typescript
await executePageCommand(page, 'click', { selector: '#button' });
await executePageCommand(page, 'fill', { selector: '#input', value: 'Hello' });
await executePageCommand(page, 'type', { selector: '#search', text: 'keyword' });
await executePageCommand(page, 'hover', { selector: '#menu' });
```

### Query and Extract

```typescript
// Get element text
const { text } = await executePageCommand(page, 'text', { selector: '.content' });

// Get HTML
const { html } = await executePageCommand(page, 'html', { selector: '#main' });

// Get attribute
const { value } = await executePageCommand(page, 'getAttribute', {
  selector: '#link',
  name: 'href',
});

// Find element by text
const { element } = await executePageCommand(page, 'find', {
  text: 'Login',
  tag: 'a',
});
```

### Wait and Scroll

```typescript
// Wait for element
await executePageCommand(page, 'waitForSelector', {
  selector: '#content',
  timeout: 5000,
});

// Scroll page
await executePageCommand(page, 'scroll', { y: 500 });

// Wait for timeout
await executePageCommand(page, 'wait', { timeout: 1000 });
```

### Evaluate JavaScript

```typescript
// Evaluate expression
const { result } = await executePageCommand(page, 'evaluate', {
  expression: 'document.title',
});

// Evaluate async script
const { result } = await executePageCommand(page, 'evaluateRaw', {
  script: 'async () => { return await fetch("/api").then(r => r.json()) }',
});
```

## Command Chaining

Use `executeCommandChain` to chain multiple commands:

```typescript
import { executeCommandChain } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

async function chain() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Chain commands with &&
  const result = await executeCommandChain(page, `
    goto url=https://example.com &&
    title &&
    text selector=body &&
    screenshot path=example.png
  `);

  console.log('Result:', result);

  await browser.close();
}

chain();
```

## API Reference

See [API Documentation](./api.md) for complete API reference.

## Next Steps

- Learn about all available commands in [API Documentation](./api.md)
- Understand the recording/playback system
- Explore session management APIs
- Check out related projects:
  - **@dyyz1993/xcli-core** — Plugin-based CLI framework
  - **@dyyz1993/xbrowser** — Browser automation CLI tool

## Examples

More examples are available in the [examples](../examples/) directory (if it exists).

## Support

- Report issues: [GitHub Issues](https://github.com/dyyz1993/mpage/issues)
- Documentation: [Full Docs](../README.md)
