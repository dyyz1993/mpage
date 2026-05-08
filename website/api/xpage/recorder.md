---
title: 录制器
---

# RecorderController

录制用户在真实浏览器中的操作，生成结构化 YAML。

## API

```typescript
class RecorderController {
  constructor(page: Page);
  start(options: { url?: string; name?: string }): Promise<void>;
  stop(outputPath?: string): Promise<{ path: string; session: RecordingSession }>;
  getStatus(): RecorderStatus | null;
  get id(): string;
}
```

## start

开始录制。

```typescript
const recorder = new RecorderController(page);
await recorder.start({
  url: 'https://example.com',
  name: 'my-recording',
});
```

## stop

停止录制并保存为 YAML 文件。

```typescript
const { path, session } = await recorder.stop('./recording.yaml');
console.log(`录制了 ${session.events.length} 个事件`);
```

## getStatus

获取当前录制状态。

```typescript
const status = recorder.getStatus();
// { isRecording: true, eventCount: 42, duration: 12345 } | null
```

## RecorderStatus

```typescript
interface RecorderStatus {
  isRecording: boolean;
  eventCount: number;
  duration: number;
}
```

## PageState

```typescript
interface PageState {
  url: string;
  title: string;
  readyState: string;
}
```

## RecordedEvent

```typescript
interface RecordedEvent {
  id: string;
  type: EventType;
  timestamp: number;
  selector?: string;
  xpath?: string;
  tagName?: string;
  text?: string;
  data: EventData;
  waitBefore?: WaitCondition[];
  assertAfter?: AssertCondition[];
  pageState?: PageState;
}
```

## EventType

```typescript
type EventType =
  | 'click' | 'dblclick' | 'contextmenu'
  | 'mousedown' | 'mouseup' | 'mousemove'
  | 'hover_enter' | 'hover_leave'
  | 'scroll'
  | 'keydown' | 'keyup' | 'keypress'
  | 'input' | 'change' | 'focus' | 'blur' | 'select'
  | 'drag_start' | 'drag_end' | 'drop' | 'file_upload'
  | 'navigation' | 'page_load' | 'hash_change'
  | 'class_change'
  | 'element_show' | 'element_hide'
  | 'popup_show' | 'popup_hide'
  | 'attribute_change'
  | 'dom_node_added' | 'dom_node_removed'
  | 'submit' | 'form_reset'
  | 'media_play' | 'media_pause' | 'media_ended' | 'media_seek'
  | 'touchstart' | 'touchend' | 'touchmove'
  | 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down'
  | 'window_resize'
  | 'dropdown_open' | 'dropdown_close'
  | 'wait' | 'assert' | 'tab_open';
```

## EventData

```typescript
interface EventData {
  x?: number;
  y?: number;
  clientX?: number;
  clientY?: number;
  button?: number;
  scrollX?: number;
  scrollY?: number;
  scrollTarget?: string;
  key?: string;
  code?: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  value?: string;
  checked?: boolean;
  files?: string[];
  url?: string;
  navigationType?: NavigationSource;
  source?: NavigationSource;
  persisted?: boolean;
  oldURL?: string;
  newURL?: string;
  hash?: string;
  state?: string;
  addedClasses?: string[];
  removedClasses?: string[];
  matchedClasses?: string[];
  visibility?: 'visible' | 'hidden';
  display?: string;
  popupType?: 'popup' | 'modal' | 'drawer' | 'tooltip';
  trigger?: string;
  attributeName?: string;
  oldValue?: string;
  newValue?: string;
  parentSelector?: string;
  nodeName?: string;
  formSelector?: string;
  method?: string;
  action?: string;
  currentTime?: number;
  duration?: number;
  muted?: boolean;
  touches?: Array<{ x: number; y: number }>;
  points?: Array<{ x?: number; y?: number; delay?: number }>;
  direction?: 'left' | 'right' | 'up' | 'down';
  width?: number;
  height?: number;
  selectedValue?: string;
  selectedIndex?: number;
  openerUrl?: string;
  isTrajectory?: boolean;
}
```

## RecordingSession

```typescript
interface RecordingSession {
  id: string;
  name?: string;
  startTime: number;
  endTime?: number;
  duration: number;
  startUrl: string;
  viewport: { width: number; height: number };
  events: RecordedEvent[];
  metadata: RecordingMetadata;
}

interface RecordingMetadata {
  browser: string;
  os: string;
  userAgent: string;
  recordedAt: string;
}
```

## WaitCondition & AssertCondition

```typescript
interface WaitCondition {
  type: WaitType;
  selector?: string;
  text?: string;
  url?: string;
  timeout?: number;
}

interface AssertCondition {
  type: AssertType;
  selector?: string;
  expected?: unknown;
  actual?: unknown;
  message?: string;
}

type WaitType =
  | 'element_visible' | 'element_hidden'
  | 'element_attached' | 'element_detached'
  | 'text_present' | 'text_gone'
  | 'url_match' | 'page_load'
  | 'network_idle' | 'timeout';

type AssertType =
  | 'element_exists' | 'element_visible' | 'element_hidden'
  | 'text_equals' | 'text_contains'
  | 'value_equals'
  | 'url_equals' | 'url_contains'
  | 'attribute_equals';
```
