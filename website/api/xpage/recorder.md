---
title: 录制器
---

# RecorderController

录制用户在真实浏览器中的操作，生成结构化 YAML。

## API

```typescript
class RecorderController {
  constructor(page: Page);
  start(options: StartOptions): Promise<void>;
  stop(outputPath?: string): Promise<RecordingResult>;
  getEvents(): RecordedEvent[];
}
```

## start

开始录制。

```typescript
interface StartOptions {
  url?: string;
  name?: string;
  session?: string;
}

const recorder = new RecorderController(page);
await recorder.start({
  url: 'https://example.com',
  name: 'my-recording',
});
```

## stop

停止录制并保存。

```typescript
interface RecordingResult {
  path: string;
  session: RecordingSession;
}

const { path } = await recorder.stop('./recording.yaml');
```

## getEvents

获取已录制的事件列表。

```typescript
const events = recorder.getEvents();
```

## RecordedEvent

```typescript
interface RecordedEvent {
  type: string;
  selector: string;
  tagName: string;
  data?: Record<string, unknown>;
  timestamp: number;
  pageState?: PageState;
}
```

## RecordingSession

```typescript
interface RecordingSession {
  id: string;
  name: string;
  startUrl: string;
  startTime: string;
  duration: number;
  events: RecordedEvent[];
}
```
