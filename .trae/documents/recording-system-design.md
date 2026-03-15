# 用户操作录制系统设计方案

## 一、系统概述

### 1.1 目标
实现一个完整的用户操作录制与回放系统，能够：
- 启动录制模式后，记录用户在浏览器中的所有操作
- 包括：点击、输入、滚动、键盘、鼠标轨迹、hover、焦点变化、页面跳转等
- 支持智能等待条件捕获（等待元素出现、网络空闲等）
- 支持操作回放，自动处理等待和断言

### 1.2 架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              整体架构                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   CLI 命令行                                                            │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  mpage record start --url https://example.com                   │  │
│   │  mpage record stop --output recording.yaml                      │  │
│   │  mpage replay recording.yaml                                    │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                      mpage-server                                │  │
│   │                                                                  │  │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │  │
│   │   │ 录制控制器    │  │ 数据存储     │  │ 回放引擎     │         │  │
│   │   │              │  │              │  │              │         │  │
│   │   │ - 启动/停止   │  │ - 事件存储   │  │ - 事件执行   │         │  │
│   │   │ - 注入脚本   │  │ - 元数据     │  │ - 等待处理   │         │  │
│   │   │ - 接收事件   │  │              │  │ - 断言检查   │         │  │
│   │   └──────┬───────┘  └──────────────┘  └──────────────┘         │  │
│   │          │                                                      │  │
│   └──────────┼──────────────────────────────────────────────────────┘  │
│              │                                                          │
│              │ CDP 协议 + Runtime.consoleAPICalled                      │
│              │                                                          │
│   ┌──────────▼──────────────────────────────────────────────────────┐  │
│   │                     Chromium 浏览器                              │  │
│   │                                                                  │  │
│   │   ┌────────────────────────────────────────────────────────┐    │  │
│   │   │                      页面                               │    │  │
│   │   │                                                        │    │  │
│   │   │   ┌─────────────────────────────────────────────┐     │    │  │
│   │   │   │           注入的录制脚本                      │     │    │  │
│   │   │   │                                             │     │    │  │
│   │   │   │  监听事件:                                   │     │    │  │
│   │   │   │  - click / dblclick / contextmenu           │     │    │  │
│   │   │   │  - mousemove (节流)                         │     │    │  │
│   │   │   │  - scroll (节流)                            │     │    │  │
│   │   │   │  - keydown / keyup                          │     │    │  │
│   │   │   │  - input / change                           │     │    │  │
│   │   │   │  - focus / blur                             │     │    │  │
│   │   │   │  - hover (mouseenter/mouseleave)            │     │    │  │
│   │   │   │  - navigation                               │     │    │  │
│   │   │   │                                             │     │    │  │
│   │   │   │  通过 console.log 发送到服务端               │     │    │  │
│   │   │   └─────────────────────────────────────────────┘     │    │  │
│   │   │                                                        │    │  │
│   │   └────────────────────────────────────────────────────────┘    │  │
│   │                                                                  │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 二、CLI 命令设计

### 2.1 录制命令

```bash
# 开始录制（必须指定 session）
mpage record start --session mysession --url https://example.com

# 开始录制（使用默认 session）
mpage record start --url https://example.com

# 开始录制（可选参数）
mpage record start --url https://example.com --name "登录流程测试"

# 停止录制并保存
mpage record stop --output my-recording.yaml

# 停止录制（不指定输出，自动生成文件名）
mpage record stop
# 输出: 📄 录制已保存到: ~/.mpage/recordings/rec_20240115_103000.yaml

# 查看录制状态
mpage record status
```

### 2.2 回放命令

```bash
# 回放录制
mpage replay my-recording.yaml

# 回放录制（指定 session）
mpage replay my-recording.yaml --session test

# 回放并生成报告
mpage replay my-recording.yaml --report report.html

# 回放并截图
mpage replay my-recording.yaml --screenshots

# 调试模式（慢速回放）
mpage replay my-recording.yaml --slow-mo 500
```

### 2.3 管理命令

```bash
# 列出所有录制
mpage recording list

# 查看录制详情
mpage recording show my-recording.yaml

# 删除录制
mpage recording delete my-recording.yaml
```

---

## 三、数据结构设计（YAML 格式）

### 3.1 录制文件示例

```yaml
id: rec_20240115_103000
name: 登录流程测试
startTime: 1705296600000
endTime: 17052966125000
duration: 12500

startUrl: https://github.com/login
viewport:
  width: 1280
  height: 720

metadata:
  browser: Chromium
  os: darwin
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)..."
  recordedAt: "2024-01-15T10:30:00.000Z"

events:
  - id: evt_001
    type: focus
    timestamp: 500
    selector: "#login_field"
    tagName: input
    data: {}
    pageState:
      url: https://github.com/login
      title: "Sign in to GitHub"
      readyState: complete

  - id: evt_002
    type: input
    timestamp: 800
    selector: "#login_field"
    tagName: input
    data:
      value: "myusername"
    waitBefore:
      - type: element_visible
        selector: "#login_field"

  - id: evt_003
    type: focus
    timestamp: 1200
    selector: "#password"
    tagName: input
    data: {}

  - id: evt_004
    type: input
    timestamp: 1500
    selector: "#password"
    tagName: input
    data:
      value: "********"

  - id: evt_005
    type: keydown
    timestamp: 1800
    selector: "#password"
    data:
      key: Enter
      code: Enter

  - id: evt_006
    type: navigation
    timestamp: 2500
    data:
      url: https://github.com/
      navigationType: form
    waitBefore:
      - type: network_idle
        timeout: 5000
    assertAfter:
      - type: url_contains
        expected: github.com

  - id: evt_007
    type: click
    timestamp: 4000
    selector: "[data-testid='header-user-menu']"
    data:
      x: 1200
      y: 50
      button: 0
    waitBefore:
      - type: element_visible
        selector: "[data-testid='header-user-menu']"

  - id: evt_008
    type: scroll
    timestamp: 5000
    data:
      scrollX: 0
      scrollY: 300

  - id: evt_009
    type: mousemove
    timestamp: 5100
    data:
      x: 150
      y: 280

  - id: evt_010
    type: hover_enter
    timestamp: 5200
    selector: ".repo-item:first-child"
    data: {}
```

### 3.2 TypeScript 类型定义

```typescript
interface RecordingSession {
  id: string;                    // 录制会话唯一ID
  name?: string;                 // 录制名称
  startTime: number;             // 开始时间戳
  endTime?: number;              // 结束时间戳
  duration: number;              // 持续时间(ms)
  
  startUrl: string;              // 起始URL
  viewport: {                    // 视口大小
    width: number;
    height: number;
  };
  
  events: RecordedEvent[];       // 事件列表
  
  metadata: {
    browser: string;
    os: string;
    userAgent: string;
    recordedAt: string;
  };
}

interface RecordedEvent {
  id: string;                    // 事件唯一ID
  type: EventType;               // 事件类型
  timestamp: number;             // 相对时间戳(ms)
  
  selector?: string;             // CSS选择器
  xpath?: string;                // XPath (备用)
  tagName?: string;              // 标签名
  text?: string;                 // 元素文本
  
  data: EventData;               // 事件数据
  
  waitBefore?: WaitCondition[];  // 等待条件
  assertAfter?: AssertCondition[]; // 断言条件
  
  pageState?: {
    url: string;
    title: string;
    readyState: DocumentReadyState;
  };
}

type EventType =
  | 'click' | 'dblclick' | 'contextmenu'
  | 'mousedown' | 'mouseup' | 'mousemove'
  | 'hover_enter' | 'hover_leave'
  | 'scroll'
  | 'keydown' | 'keyup' | 'keypress'
  | 'input' | 'change' | 'focus' | 'blur' | 'select'
  | 'drag_start' | 'drag_end' | 'drop'
  | 'file_upload'
  | 'navigation' | 'page_load' | 'hash_change'
  | 'wait' | 'assert';

interface WaitCondition {
  type: WaitType;
  selector?: string;
  text?: string;
  url?: string;
  timeout?: number;
}

type WaitType =
  | 'element_visible' | 'element_hidden'
  | 'element_attached' | 'element_detached'
  | 'text_present' | 'text_gone'
  | 'url_match' | 'page_load' | 'network_idle'
  | 'timeout';

interface AssertCondition {
  type: AssertType;
  selector?: string;
  expected?: unknown;
  message?: string;
}

type AssertType =
  | 'element_exists' | 'element_visible' | 'element_hidden'
  | 'text_equals' | 'text_contains'
  | 'value_equals' | 'url_equals' | 'url_contains'
  | 'attribute_equals';
```

---

## 四、录制器设计

### 4.1 注入脚本 (inject.ts)

注入到页面中的录制脚本，负责监听所有用户操作：

```typescript
// 核心录制逻辑
class PageRecorder {
  private recordingId: string;
  private startTime: number;
  private isRecording: boolean = false;
  private eventId: number = 0;
  
  private readonly MOUSE_THROTTLE = 50;
  private readonly SCROLL_THROTTLE = 100;
  
  private lastMouseMove = 0;
  private lastScroll = 0;
  private networkRequests = 0;
  
  start(recordingId: string) {
    this.recordingId = recordingId;
    this.startTime = Date.now();
    this.isRecording = true;
    this.attachAllListeners();
    this.send('recording_started', { url: window.location.href });
  }
  
  stop() {
    this.isRecording = false;
    this.send('recording_stopped', {});
  }
  
  private send(type: string, data: any) {
    console.log(JSON.stringify({
      __REC__: true,
      type,
      timestamp: Date.now() - this.startTime,
      data
    }));
  }
  
  private record(event: Partial<RecordedEvent>) {
    if (!this.isRecording) return;
    
    const fullEvent: RecordedEvent = {
      id: `evt_${String(++this.eventId).padStart(3, '0')}`,
      timestamp: Date.now() - this.startTime,
      ...event,
      pageState: {
        url: window.location.href,
        title: document.title,
        readyState: document.readyState
      }
    } as RecordedEvent;
    
    this.send('event', fullEvent);
  }
  
  private getSelector(element: Element): string {
    if (element.id) return `#${element.id}`;
    
    const testId = element.getAttribute('data-testid');
    if (testId) return `[data-testid="${testId}"]`;
    
    const dataCy = element.getAttribute('data-cy');
    if (dataCy) return `[data-cy="${dataCy}"]`;
    
    const path: string[] = [];
    let current: Element | null = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      const classes = Array.from(current.classList)
        .filter(c => !this.isGeneratedClass(c))
        .slice(0, 2);
      
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
      
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(current) + 1;
        if (siblings.length > 1) {
          selector += `:nth-child(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }
  
  private isGeneratedClass(className: string): boolean {
    return /^[a-z]?[0-9a-f]{6,}$/i.test(className) ||
           /^css-[a-z0-9]+$/i.test(className);
  }
  
  private captureWaitConditions(): WaitCondition[] {
    const conditions: WaitCondition[] = [];
    
    const loadingElements = document.querySelectorAll(
      '[class*="loading"], [class*="spinner"], [data-loading="true"]'
    );
    
    loadingElements.forEach(el => {
      conditions.push({
        type: 'element_hidden',
        selector: this.getSelector(el)
      });
    });
    
    if (this.networkRequests > 0) {
      conditions.push({ type: 'network_idle' });
    }
    
    return conditions;
  }
  
  private attachAllListeners() {
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('dblclick', this.handleDblClick, true);
    document.addEventListener('contextmenu', this.handleContextMenu, true);
    document.addEventListener('mousedown', this.handleMouseDown, true);
    document.addEventListener('mouseup', this.handleMouseUp, true);
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('mouseenter', this.handleHoverEnter, true);
    document.addEventListener('mouseleave', this.handleHoverLeave, true);
    document.addEventListener('scroll', this.handleScroll, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('keyup', this.handleKeyUp, true);
    document.addEventListener('input', this.handleInput, true);
    document.addEventListener('change', this.handleChange, true);
    document.addEventListener('focus', this.handleFocus, true);
    document.addEventListener('blur', this.handleBlur, true);
    
    this.monitorNetwork();
  }
  
  private handleClick = (e: MouseEvent) => {
    this.record({
      type: 'click',
      selector: this.getSelector(e.target as Element),
      tagName: (e.target as Element).tagName.toLowerCase(),
      data: { x: e.clientX, y: e.clientY, button: e.button },
      waitBefore: this.captureWaitConditions()
    });
  };
  
  private handleMouseMove = (e: MouseEvent) => {
    const now = Date.now();
    if (now - this.lastMouseMove < this.MOUSE_THROTTLE) return;
    this.lastMouseMove = now;
    
    this.record({
      type: 'mousemove',
      data: { x: e.clientX, y: e.clientY }
    });
  };
  
  private handleScroll = (e: Event) => {
    const now = Date.now();
    if (now - this.lastScroll < this.SCROLL_THROTTLE) return;
    this.lastScroll = now;
    
    this.record({
      type: 'scroll',
      data: { scrollX: window.scrollX, scrollY: window.scrollY }
    });
  };
  
  private handleKeyDown = (e: KeyboardEvent) => {
    this.record({
      type: 'keydown',
      selector: this.getSelector(e.target as Element),
      data: {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey
      }
    });
  };
  
  private handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    this.record({
      type: 'input',
      selector: this.getSelector(target),
      tagName: target.tagName.toLowerCase(),
      data: { value: target.value }
    });
  };
  
  private handleFocus = (e: FocusEvent) => {
    this.record({
      type: 'focus',
      selector: this.getSelector(e.target as Element),
      tagName: (e.target as Element).tagName.toLowerCase(),
      data: {}
    });
  };
  
  private handleBlur = (e: FocusEvent) => {
    this.record({
      type: 'blur',
      selector: this.getSelector(e.target as Element),
      data: {}
    });
  };
  
  private handleHoverEnter = (e: MouseEvent) => {
    this.record({
      type: 'hover_enter',
      selector: this.getSelector(e.target as Element),
      data: {}
    });
  };
  
  private handleHoverLeave = (e: MouseEvent) => {
    this.record({
      type: 'hover_leave',
      selector: this.getSelector(e.target as Element),
      data: {}
    });
  };
  
  private monitorNetwork() {
    const originalFetch = window.fetch;
    const self = this;
    window.fetch = function(...args) {
      self.networkRequests++;
      return originalFetch.apply(this, args).finally(() => {
        self.networkRequests--;
      });
    };
    
    const originalXHR = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args) {
      self.networkRequests++;
      this.addEventListener('loadend', () => {
        self.networkRequests--;
      });
      return originalXHR.apply(this, args);
    };
  }
}

(window as any).__pageRecorder = new PageRecorder();
```

### 4.2 服务端录制控制器

```typescript
// src/server/recorder/controller.ts

import type { Page, CDPSession } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

export class RecorderController {
  private page: Page;
  private cdp: CDPSession | null = null;
  private isRecording: boolean = false;
  private events: RecordedEvent[] = [];
  private recordingId: string;
  private startTime: number = 0;
  private startUrl: string = '';
  private name: string = '';
  
  constructor(page: Page) {
    this.page = page;
    this.recordingId = this.generateId();
  }
  
  async start(options: { url?: string; name?: string }): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }
    
    this.isRecording = true;
    this.startTime = Date.now();
    this.events = [];
    this.name = options.name || '';
    
    // 获取 CDP 会话
    this.cdp = await this.page.context().newCDPSession(this.page);
    
    // 启用 Runtime 域
    await this.cdp.send('Runtime.enable');
    
    // 监听 console 事件
    this.cdp.on('Runtime.consoleAPICalled', this.handleConsoleMessage);
    
    // 注入录制脚本
    await this.injectRecorderScript();
    
    // 如果指定了初始 URL，导航到该页面
    if (options.url) {
      await this.page.goto(options.url);
      this.startUrl = options.url;
    } else {
      this.startUrl = this.page.url();
    }
    
    // 启动页面中的录制器
    await this.page.evaluate((recordingId) => {
      (window as any).__pageRecorder?.start(recordingId);
    }, this.recordingId);
  }
  
  async stop(outputPath?: string): Promise<{ path: string; session: RecordingSession }> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }
    
    this.isRecording = false;
    
    // 停止页面中的录制器
    await this.page.evaluate(() => {
      (window as any).__pageRecorder?.stop();
    });
    
    // 断开 CDP 监听
    if (this.cdp) {
      await this.cdp.send('Runtime.disable');
      this.cdp = null;
    }
    
    // 构建录制会话数据
    const session: RecordingSession = {
      id: this.recordingId,
      name: this.name,
      startTime: this.startTime,
      endTime: Date.now(),
      duration: Date.now() - this.startTime,
      startUrl: this.startUrl,
      viewport: this.page.viewportSize() || { width: 1280, height: 720 },
      events: this.events,
      metadata: {
        browser: 'Chromium',
        os: process.platform,
        userAgent: await this.page.evaluate(() => navigator.userAgent),
        recordedAt: new Date().toISOString()
      }
    };
    
    // 确定输出路径
    const finalPath = outputPath || this.getDefaultOutputPath();
    
    // 确保目录存在
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 写入 YAML 文件
    const yamlContent = yaml.stringify(session);
    fs.writeFileSync(finalPath, yamlContent, 'utf-8');
    
    return { path: finalPath, session };
  }
  
  getStatus(): { isRecording: boolean; eventCount: number; duration: number } | null {
    if (!this.isRecording) return null;
    
    return {
      isRecording: true,
      eventCount: this.events.length,
      duration: Date.now() - this.startTime
    };
  }
  
  private handleConsoleMessage = (params: any) => {
    if (params.type !== 'log') return;
    
    const args = params.args;
    if (!args || args.length === 0) return;
    
    try {
      const firstArg = args[0];
      if (firstArg.type === 'string' && firstArg.value?.startsWith('{')) {
        const message = JSON.parse(firstArg.value);
        
        if (message.__REC__) {
          this.processRecordingMessage(message);
        }
      }
    } catch (e) {
      // 忽略解析错误
    }
  };
  
  private processRecordingMessage(message: any) {
    switch (message.type) {
      case 'event':
        if (message.data) {
          this.events.push(message.data);
        }
        break;
        
      case 'recording_started':
        console.log(`[Recorder] Started: ${message.data.url}`);
        break;
        
      case 'recording_stopped':
        console.log('[Recorder] Stopped');
        break;
    }
  }
  
  private async injectRecorderScript(): Promise<void> {
    const script = this.getRecorderScript();
    
    await this.page.evaluateOnNewDocument(script);
    await this.page.evaluate(script);
  }
  
  private getRecorderScript(): string {
    // 返回注入脚本的完整代码
    // 这里简化，实际应该从文件读取或内联
    return `
      // ... PageRecorder 类定义 ...
    `;
  }
  
  private getDefaultOutputPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
    const recordingsDir = path.join(homeDir, '.mpage', 'recordings');
    
    const date = new Date(this.startTime);
    const dateStr = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `rec_${dateStr}.yaml`;
    
    return path.join(recordingsDir, filename);
  }
  
  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

## 五、回放引擎设计

```typescript
// src/server/recorder/player.ts

import type { Page } from 'playwright-core';
import * as fs from 'fs';
import * as yaml from 'yaml';

export class PlaybackEngine {
  private page: Page;
  private recording: RecordingSession;
  
  constructor(page: Page, recording: RecordingSession) {
    this.page = page;
    this.recording = recording;
  }
  
  static async fromFile(page: Page, filePath: string): Promise<PlaybackEngine> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const recording = yaml.parse(content) as RecordingSession;
    return new PlaybackEngine(page, recording);
  }
  
  async play(options: PlaybackOptions = {}): Promise<PlaybackResult> {
    const startTime = Date.now();
    const errors: PlaybackError[] = [];
    
    // 导航到起始 URL
    await this.page.goto(this.recording.startUrl);
    
    // 设置视口大小
    await this.page.setViewportSize(this.recording.viewport);
    
    // 逐个执行事件
    for (let i = 0; i < this.recording.events.length; i++) {
      const event = this.recording.events[i];
      
      try {
        // 等待时间间隔
        if (i > 0) {
          const prevEvent = this.recording.events[i - 1];
          const delay = event.timestamp - prevEvent.timestamp;
          if (delay > 0 && !options.noDelay) {
            await this.page.waitForTimeout(
              options.slowMo ? delay * options.slowMo : delay
            );
          }
        }
        
        // 执行等待条件
        if (event.waitBefore) {
          await this.executeWaits(event.waitBefore);
        }
        
        // 执行事件
        await this.executeEvent(event);
        
        // 执行断言
        if (event.assertAfter) {
          await this.executeAssertions(event.assertAfter);
        }
        
        options.onProgress?.({
          current: i + 1,
          total: this.recording.events.length,
          event
        });
        
      } catch (error) {
        errors.push({
          eventIndex: i,
          event,
          error: (error as Error).message
        });
        
        if (options.stopOnError) {
          break;
        }
      }
    }
    
    return {
      success: errors.length === 0,
      duration: Date.now() - startTime,
      eventsPlayed: this.recording.events.length - errors.length,
      totalEvents: this.recording.events.length,
      errors
    };
  }
  
  private async executeWaits(conditions: WaitCondition[]): Promise<void> {
    for (const condition of conditions) {
      await this.executeWait(condition);
    }
  }
  
  private async executeWait(condition: WaitCondition): Promise<void> {
    const timeout = condition.timeout || 30000;
    
    switch (condition.type) {
      case 'element_visible':
        await this.page.waitForSelector(condition.selector!, { state: 'visible', timeout });
        break;
      case 'element_hidden':
        await this.page.waitForSelector(condition.selector!, { state: 'hidden', timeout });
        break;
      case 'element_attached':
        await this.page.waitForSelector(condition.selector!, { state: 'attached', timeout });
        break;
      case 'page_load':
        await this.page.waitForLoadState('domcontentloaded');
        break;
      case 'network_idle':
        await this.page.waitForLoadState('networkidle', { timeout });
        break;
      case 'url_match':
        await this.page.waitForURL(condition.url!, { timeout });
        break;
      case 'text_present':
        await this.page.waitForSelector(`text=${condition.text}`, { timeout });
        break;
      case 'timeout':
        await this.page.waitForTimeout(condition.timeout!);
        break;
    }
  }
  
  private async executeAssertions(conditions: AssertCondition[]): Promise<void> {
    for (const condition of conditions) {
      switch (condition.type) {
        case 'element_exists':
          if (!(await this.page.$(condition.selector!))) {
            throw new Error(`Assertion failed: Element not found - ${condition.selector}`);
          }
          break;
        case 'element_visible':
          if (!(await this.page.isVisible(condition.selector!))) {
            throw new Error(`Assertion failed: Element not visible - ${condition.selector}`);
          }
          break;
        case 'url_contains':
          if (!this.page.url().includes(condition.expected as string)) {
            throw new Error(`Assertion failed: URL does not contain "${condition.expected}"`);
          }
          break;
      }
    }
  }
  
  private async executeEvent(event: RecordedEvent): Promise<void> {
    switch (event.type) {
      case 'click':
        await this.page.click(event.selector!);
        break;
      case 'dblclick':
        await this.page.dblclick(event.selector!);
        break;
      case 'contextmenu':
        await this.page.click(event.selector!, { button: 'right' });
        break;
      case 'hover_enter':
        await this.page.hover(event.selector!);
        break;
      case 'input':
        await this.page.fill(event.selector!, event.data.value!);
        break;
      case 'keydown':
        await this.page.keyboard.press(event.data.key!);
        break;
      case 'scroll':
        await this.page.evaluate((d) => window.scrollTo(d.scrollX, d.scrollY), event.data);
        break;
      case 'focus':
        await this.page.focus(event.selector!);
        break;
      case 'navigation':
        await this.page.goto(event.data.url!);
        break;
      case 'mousemove':
        await this.page.mouse.move(event.data.x!, event.data.y!);
        break;
    }
  }
}
```

---

## 六、CLI 命令实现

### 6.1 mpage.ts 修改

```typescript
// bin/mpage.ts 中添加录制命令处理

// 录制相关命令
if (commandInput === 'record') {
  const subCommand = args[args.indexOf('record') + 1];
  
  if (subCommand === 'start') {
    // 解析参数
    let url = '';
    let name = '';
    
    for (let i = args.indexOf('start') + 1; i < args.length; i++) {
      if (args[i] === '--url' || args[i] === '-u') {
        url = args[++i];
      } else if (args[i] === '--name' || args[i] === '-n') {
        name = args[++i];
      }
    }
    
    // 发送启动录制请求
    const result = await sendRequest(session.socketPath, {
      action: 'record_start',
      url,
      name
    });
    
    if (result.success) {
      console.log('🎬 开始录制...');
      if (url) console.log(`📍 URL: ${url}`);
      console.log('💡 使用 "mpage record stop" 停止录制');
    } else {
      console.error('启动录制失败:', result.error);
    }
    process.exit(0);
  }
  
  if (subCommand === 'stop') {
    // 解析参数
    let outputPath = '';
    
    for (let i = args.indexOf('stop') + 1; i < args.length; i++) {
      if (args[i] === '--output' || args[i] === '-o') {
        outputPath = args[++i];
      }
    }
    
    // 发送停止录制请求
    const result = await sendRequest(session.socketPath, {
      action: 'record_stop',
      outputPath
    });
    
    if (result.success) {
      console.log('⏹️  录制已停止');
      console.log(`📊 事件数量: ${result.content.eventCount}`);
      console.log(`📄 已保存到: ${result.content.path}`);
    } else {
      console.error('停止录制失败:', result.error);
    }
    process.exit(0);
  }
  
  if (subCommand === 'status') {
    const result = await sendRequest(session.socketPath, {
      action: 'record_status'
    });
    
    if (result.content?.isRecording) {
      console.log('🎬 正在录制...');
      console.log(`📊 已记录事件: ${result.content.eventCount}`);
      console.log(`⏱️  持续时间: ${Math.round(result.content.duration / 1000)}s`);
    } else {
      console.log('当前没有进行中的录制');
    }
    process.exit(0);
  }
}

// 回放命令
if (commandInput === 'replay') {
  const filePath = args[args.indexOf('replay') + 1];
  
  if (!filePath) {
    console.error('请指定录制文件路径');
    process.exit(1);
  }
  
  let slowMo = 0;
  let stopOnError = true;
  
  for (let i = args.indexOf('replay') + 2; i < args.length; i++) {
    if (args[i] === '--slow-mo') {
      slowMo = parseInt(args[++i], 10);
    } else if (args[i] === '--continue-on-error') {
      stopOnError = false;
    }
  }
  
  // 发送回放请求
  const result = await sendRequest(session.socketPath, {
    action: 'replay',
    filePath,
    options: { slowMo, stopOnError }
  });
  
  if (result.success) {
    console.log('✅ 回放完成');
    console.log(`📊 成功: ${result.content.eventsPlayed}/${result.content.totalEvents}`);
    console.log(`⏱️  耗时: ${Math.round(result.content.duration / 1000)}s`);
  } else {
    console.error('❌ 回放失败:', result.error);
  }
  process.exit(0);
}
```

### 6.2 mpage-server.ts 修改

```typescript
// bin/mpage-server.ts 中添加录制控制器

import { RecorderController } from '../src/server/recorder/controller.js';
import { PlaybackEngine } from '../src/server/recorder/player.js';

// 在 Session 接口中添加
interface Session {
  // ... 现有字段
  recorder: RecorderController | null;
}

// 初始化
const session: Session = {
  // ... 现有字段
  recorder: null
};

// 在 handleConnection 中添加
async function handleConnection(conn: net.Socket) {
  // ... 现有代码
  
  if (action === 'record_start') {
    try {
      if (!session.recorder) {
        session.recorder = new RecorderController(page);
      }
      await session.recorder.start({
        url: req.url,
        name: req.name
      });
      conn.write(JSON.stringify({ success: true }) + '\n');
    } catch (e) {
      conn.write(JSON.stringify({ success: false, error: (e as Error).message }) + '\n');
    }
    return;
  }
  
  if (action === 'record_stop') {
    try {
      if (!session.recorder) {
        throw new Error('No recording in progress');
      }
      const result = await session.recorder.stop(req.outputPath);
      conn.write(JSON.stringify({
        success: true,
        content: {
          path: result.path,
          eventCount: result.session.events.length
        }
      }) + '\n');
      session.recorder = null;
    } catch (e) {
      conn.write(JSON.stringify({ success: false, error: (e as Error).message }) + '\n');
    }
    return;
  }
  
  if (action === 'record_status') {
    const status = session.recorder?.getStatus() || null;
    conn.write(JSON.stringify({ success: true, content: status }) + '\n');
    return;
  }
  
  if (action === 'replay') {
    try {
      const player = await PlaybackEngine.fromFile(page, req.filePath);
      const result = await player.play(req.options);
      conn.write(JSON.stringify({ success: true, content: result }) + '\n');
    } catch (e) {
      conn.write(JSON.stringify({ success: false, error: (e as Error).message }) + '\n');
    }
    return;
  }
}
```

---

## 七、实现步骤

### 阶段一：基础录制功能

1. **创建录制模块目录结构**
   ```
   src/server/recorder/
   ├── index.ts           # 导出
   ├── controller.ts      # 录制控制器
   ├── player.ts          # 回放引擎
   ├── types.ts           # 类型定义
   └── inject.ts          # 注入脚本
   ```

2. **实现类型定义** (`types.ts`)
   - RecordingSession
   - RecordedEvent
   - WaitCondition
   - AssertCondition

3. **实现注入脚本** (`inject.ts`)
   - PageRecorder 类
   - 事件监听器
   - 选择器生成
   - console 通信

4. **实现录制控制器** (`controller.ts`)
   - start() / stop() 方法
   - CDP 会话管理
   - 消息接收处理

### 阶段二：CLI 命令

5. **修改 mpage.ts**
   - 添加 `record start` 命令
   - 添加 `record stop` 命令
   - 添加 `record status` 命令

6. **修改 mpage-server.ts**
   - 添加录制控制器实例
   - 处理录制相关 action

### 阶段三：回放功能

7. **实现回放引擎** (`player.ts`)
   - fromFile() 加载 YAML
   - play() 执行回放
   - 等待和断言处理

8. **添加回放命令**
   - `mpage replay <file>` 命令

### 阶段四：增强功能

9. **智能等待优化**
   - 自动检测 loading 状态
   - 网络请求监控

10. **错误处理和报告**
    - 回放错误报告
    - 进度显示

---

## 八、使用示例

### 录制流程

```bash
# 1. 启动录制
$ mpage record start --url https://github.com/login
🎬 开始录制...
📍 URL: https://github.com/login
💡 使用 "mpage record stop" 停止录制

# 2. 用户在浏览器中操作...

# 3. 查看录制状态
$ mpage record status
🎬 正在录制...
📊 已记录事件: 15
⏱️  持续时间: 12s

# 4. 停止录制（自动保存）
$ mpage record stop
⏹️  录制已停止
📊 事件数量: 15
📄 已保存到: ~/.mpage/recordings/rec_2024-01-15T10-30-00.yaml

# 5. 停止录制（指定路径）
$ mpage record stop --output ./login-flow.yaml
⏹️  录制已停止
📊 事件数量: 15
📄 已保存到: ./login-flow.yaml
```

### 回放流程

```bash
# 回放录制
$ mpage replay login-flow.yaml

🔄 开始回放...
📍 URL: https://github.com/login

[1/15] focus - #login_field
[2/15] input - #login_field
[3/15] focus - #password
[4/15] input - #password
[5/15] keydown - Enter
[6/15] navigation - https://github.com/
...

✅ 回放完成
📊 成功: 15/15
⏱️  耗时: 11s

# 慢速回放（调试模式）
$ mpage replay login-flow.yaml --slow-mo 2
```

---

## 九、文件结构

```
src/
├── server/
│   ├── recorder/
│   │   ├── index.ts           # 导出
│   │   ├── controller.ts      # 录制控制器
│   │   ├── player.ts          # 回放引擎
│   │   ├── types.ts           # 类型定义
│   │   └── inject.ts          # 注入脚本
│   └── commands/
│       └── ...
│
├── commands/
│   └── definitions.ts         # 添加录制命令定义
│
└── types.ts                   # 添加录制相关类型

bin/
├── mpage.ts                   # 添加 record/replay 命令处理
└── mpage-server.ts            # 添加录制控制器支持

~/.mpage/
└── recordings/                # 默认录制存储目录
    ├── rec_2024-01-15T10-30-00.yaml
    └── ...
```

---

## 十、依赖

需要添加 `yaml` 库用于 YAML 文件的读写：

```bash
npm install yaml
npm install -D @types/yaml
```
