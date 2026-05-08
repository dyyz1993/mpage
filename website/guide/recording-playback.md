---
title: 录制与回放
---

# 录制与回放

## 录制器（RecorderController）

录制用户在真实浏览器中的操作，生成结构化 YAML。

```typescript
import { RecorderController } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const recorder = new RecorderController(page);
await recorder.start({ url: 'https://example.com', name: 'my-recording' });

// ... 用户交互 ...

const { path, session } = await recorder.stop('./recordings/my-recording.yaml');
```

### RecorderController API

```typescript
class RecorderController {
  constructor(page: Page);

  start(options: StartOptions): Promise<void>;
  stop(outputPath?: string): Promise<RecordingResult>;
  getEvents(): RecordedEvent[];
}
```

### StartOptions

```typescript
interface StartOptions {
  url?: string;
  name?: string;
  session?: string;
}
```

### RecordingResult

```typescript
interface RecordingResult {
  path: string;
  session: RecordingSession;
}
```

## 回放引擎（PlaybackEngine）

加载录制文件并自动重放。

```typescript
import { PlaybackEngine } from '@dyyz1993/xpage';

const player = await PlaybackEngine.fromFile(page, './recordings/my-recording.yaml');
const result = await player.play({
  slowMo: 100,
  stopOnError: true,
});

console.log(`Replayed ${result.eventsPlayed} events`);
```

### PlaybackEngine API

```typescript
class PlaybackEngine {
  static fromFile(page: Page, filePath: string): Promise<PlaybackEngine>;
  play(options?: PlaybackOptions): Promise<PlaybackResult>;
}
```

### PlaybackOptions

```typescript
interface PlaybackOptions {
  slowMo?: number;       // 动作间延迟（ms）
  stopOnError?: boolean; // 遇错停止
}
```

### PlaybackResult

```typescript
interface PlaybackResult {
  success: boolean;
  eventsPlayed: number;
  errors: Array<{ event: RecordedEvent; error: Error }>;
  duration: number;
}
```

## 完整示例

```typescript
import { RecorderController, PlaybackEngine } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

// 1. 录制
async function record() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const recorder = new RecorderController(page);
  await recorder.start({ url: 'https://example.com', name: 'demo' });

  // 用户在浏览器中操作：点击、输入、导航等

  const { path } = await recorder.stop('./recordings/demo.yaml');
  console.log(`Saved: ${path}`);
  await browser.close();
}

// 2. 回放
async function replay() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const player = await PlaybackEngine.fromFile(page, './recordings/demo.yaml');
  const result = await player.play({ slowMo: 100, stopOnError: true });

  console.log(`Played ${result.eventsPlayed} events in ${result.duration}ms`);
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  }

  await browser.close();
}
```
