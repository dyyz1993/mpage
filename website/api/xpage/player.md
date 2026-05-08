---
title: 回放引擎
---

# PlaybackEngine

加载录制文件并自动重放。

## API

```typescript
class PlaybackEngine {
  static fromFile(page: Page, filePath: string): Promise<PlaybackEngine>;
  play(options?: PlaybackOptions): Promise<PlaybackResult>;
}
```

## fromFile

从文件加载录制。

```typescript
const player = await PlaybackEngine.fromFile(page, './recording.yaml');
```

## play

回放录制。

```typescript
interface PlaybackOptions {
  slowMo?: number;       // 动作间延迟（ms）
  stopOnError?: boolean; // 遇错停止
}

const result = await player.play({
  slowMo: 100,
  stopOnError: true,
});
```

## PlaybackResult

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
import { PlaybackEngine } from '@dyyz1993/xpage';
import { chromium } from 'playwright-core';

const browser = await chromium.launch();
const page = await browser.newPage();

const player = await PlaybackEngine.fromFile(page, './recordings/demo.yaml');
const result = await player.play({ slowMo: 100, stopOnError: true });

console.log(`Played ${result.eventsPlayed} events in ${result.duration}ms`);
if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
}

await browser.close();
```
