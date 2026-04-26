/* eslint-disable require-await, no-return-await */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { RecorderController } from '../../src/server/recorder/controller.js';
import { PlaybackEngine } from '../../src/server/recorder/player.js';
import { getRecorderScript } from '../../src/server/recorder/inject.js';
import type { Page, BrowserContext, CDPSession } from 'playwright-core';
import type { RecordingSession } from '../../src/server/recorder/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

type ConsoleHandler = (msg: { text: string }) => void;
type NavigationHandler = (frame: unknown) => void;

function createMockCDPSession(): CDPSession {
  const listeners: Map<string, ConsoleHandler[]> = new Map();

  return {
    send: mock.fn(async () => {}),
    on: mock.fn((event: string, handler: ConsoleHandler) => {
      const existing = listeners.get(event) || [];
      existing.push(handler);
      listeners.set(event, existing);
    }),
    off: mock.fn((event: string, handler: ConsoleHandler) => {
      const existing = listeners.get(event) || [];
      const index = existing.indexOf(handler);
      if (index > -1) existing.splice(index, 1);
      listeners.set(event, existing);
    }),
    emit: (event: string, data: unknown) => {
      const handlers = listeners.get(event) || [];
      handlers.forEach((h) => h(data as Parameters<ConsoleHandler>[0]));
    },
  } as unknown as CDPSession;
}

function createMockPage(overrides: Partial<Page> = {}): Page {
  const cdpSession = createMockCDPSession();
  const consoleListeners: ConsoleHandler[] = [];
  const navigationListeners: NavigationHandler[] = [];
  const pageRef: { current: Page | null } = { current: null };

  const mockContext: BrowserContext = {
    newCDPSession: mock.fn(async () => cdpSession),
    exposeFunction: mock.fn(async () => {}),
    addInitScript: mock.fn(async () => {}),
    route: mock.fn(async () => {}),
    on: mock.fn(() => {}),
    off: mock.fn(() => {}),
    pages: mock.fn(() => (pageRef.current ? [pageRef.current] : [])),
    browser: mock.fn(() => null),
  } as unknown as BrowserContext;

  const mockPage = {
    context: mock.fn(() => mockContext),
    goto: mock.fn(async () => {}),
    evaluate: mock.fn(async (fn: (...args: unknown[]) => unknown | string) => {
      if (typeof fn === 'string') {
        return undefined;
      }
      return 'mocked result';
    }),
    addInitScript: mock.fn(async () => {}),
    addScriptTag: mock.fn(async () => {}),
    exposeFunction: mock.fn(async () => {}),
    viewportSize: mock.fn(() => ({ width: 1280, height: 720 })),
    url: mock.fn(() => 'https://example.com'),
    title: mock.fn(async () => 'Example Domain'),
    click: mock.fn(async () => {}),
    fill: mock.fn(async () => {}),
    hover: mock.fn(async () => {}),
    focus: mock.fn(async () => {}),
    dblclick: mock.fn(async () => {}),
    waitForSelector: mock.fn(async () => {}),
    waitForLoadState: mock.fn(async () => {}),
    waitForTimeout: mock.fn(async () => {}),
    waitForURL: mock.fn(async () => {}),
    $: mock.fn(async () => ({})),
    isVisible: mock.fn(async () => true),
    isHidden: mock.fn(async () => false),
    textContent: mock.fn(async () => ''),
    setViewportSize: mock.fn(async () => {}),
    on: mock.fn((event: string, handler: ConsoleHandler | NavigationHandler) => {
      if (event === 'console') {
        consoleListeners.push(handler as ConsoleHandler);
      }
      if (event === 'framenavigated') {
        navigationListeners.push(handler as NavigationHandler);
      }
    }),
    off: mock.fn((event: string, handler: ConsoleHandler | NavigationHandler) => {
      if (event === 'console') {
        const index = consoleListeners.indexOf(handler as ConsoleHandler);
        if (index > -1) consoleListeners.splice(index, 1);
      }
      if (event === 'framenavigated') {
        const index = navigationListeners.indexOf(handler as NavigationHandler);
        if (index > -1) navigationListeners.splice(index, 1);
      }
    }),
    emitConsole: (text: string) => {
      consoleListeners.forEach((h) => h({ text }));
    },
    emitNavigation: () => {
      navigationListeners.forEach((h) => h({}));
    },
    mouse: {
      move: mock.fn(async () => {}),
    } as unknown,
    keyboard: {
      press: mock.fn(async () => {}),
      down: mock.fn(async () => {}),
      up: mock.fn(async () => {}),
    } as unknown,
    ...overrides,
  } as unknown as Page & { emitConsole: (text: string) => void; emitNavigation: () => void };

  pageRef.current = mockPage;
  return mockPage;
}

describe('RecorderController', () => {
  describe('getRecorderScript', () => {
    it('should return a valid JavaScript string', () => {
      const script = getRecorderScript();
      assert.ok(typeof script === 'string');
      assert.ok(script.includes('PageRecorder'));
      assert.ok(script.includes('window.__pageRecorder'));
    });

    it('should contain event handlers', () => {
      const script = getRecorderScript();
      assert.ok(script.includes('handleClick'));
      assert.ok(script.includes('handleMouseMove'));
      assert.ok(script.includes('handleScroll'));
      assert.ok(script.includes('handleKeyDown'));
      assert.ok(script.includes('handleInput'));
      assert.ok(script.includes('handleFocus'));
    });
  });

  describe('constructor', () => {
    it('should create a recorder with initial state', () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      const status = recorder.getStatus();
      assert.strictEqual(status, null);
    });
  });

  describe('start', () => {
    it('should start recording', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await recorder.start({ url: 'https://example.com' });

      const status = recorder.getStatus();
      assert.ok(status?.isRecording);
      assert.strictEqual(status?.eventCount, 1);
    });

    it('should throw error if already recording', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await recorder.start({ url: 'https://example.com' });

      await assert.rejects(async () => await recorder.start({ url: 'https://example.com' }), {
        message: 'Recording is already in progress',
      });
    });

    it('should navigate to URL if provided', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await recorder.start({ url: 'https://test.com' });

      assert.strictEqual((mockPage.goto as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });
  });

  describe('stop', () => {
    it('should stop recording and return session', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await recorder.start({ url: 'https://example.com' });
      const result = await recorder.stop();

      assert.ok(result.session);
      assert.ok(result.path);
      assert.ok(result.session.id.startsWith('rec_'));
      assert.strictEqual(result.session.startUrl, 'https://example.com');
    });

    it('should throw error if not recording', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await assert.rejects(async () => await recorder.stop(), {
        message: 'No recording in progress',
      });
    });

    it('should reset recording state after stop', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await recorder.start({ url: 'https://example.com' });
      await recorder.stop();

      const status = recorder.getStatus();
      assert.strictEqual(status, null);
    });
  });

  describe('getStatus', () => {
    it('should return null when not recording', () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      const status = recorder.getStatus();
      assert.strictEqual(status, null);
    });

    it('should return status when recording', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await recorder.start({ url: 'https://example.com' });

      const status = recorder.getStatus();
      assert.ok(status?.isRecording);
      assert.ok(status?.duration >= 0);
    });
  });
});

describe('PlaybackEngine', () => {
  describe('fromFile', () => {
    it('should load recording from YAML file', async () => {
      const tempDir = '/tmp/mpage-test';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const testRecording: RecordingSession = {
        id: 'test-recording',
        startTime: Date.now(),
        duration: 1000,
        startUrl: 'https://example.com',
        viewport: { width: 1280, height: 720 },
        events: [
          {
            id: 'evt_001',
            type: 'click',
            timestamp: 100,
            selector: '#button',
            data: { x: 100, y: 200, button: 0 },
          },
        ],
        metadata: {
          browser: 'Chromium',
          os: 'darwin',
          userAgent: 'test',
          recordedAt: new Date().toISOString(),
        },
      };

      const filePath = path.join(tempDir, 'test-recording.yaml');
      fs.writeFileSync(filePath, yaml.stringify(testRecording), 'utf-8');

      const mockPage = createMockPage();
      const player = await PlaybackEngine.fromFile(mockPage, filePath);

      assert.ok(player);

      fs.unlinkSync(filePath);
    });
  });

  describe('play', () => {
    it('should execute click event', async () => {
      const mockPage = createMockPage();

      const recording: RecordingSession = {
        id: 'test-recording',
        startTime: Date.now(),
        duration: 1000,
        startUrl: 'https://example.com',
        viewport: { width: 1280, height: 720 },
        events: [
          {
            id: 'evt_001',
            type: 'click',
            timestamp: 100,
            selector: '#button',
            data: { x: 100, y: 200, button: 0 },
          },
        ],
        metadata: {
          browser: 'Chromium',
          os: 'darwin',
          userAgent: 'test',
          recordedAt: new Date().toISOString(),
        },
      };

      const player = new PlaybackEngine(mockPage, recording);
      const result = await player.play({ noDelay: true });

      assert.ok(result.success);
      assert.strictEqual(result.eventsPlayed, 1);
      assert.strictEqual(result.totalEvents, 1);
      assert.strictEqual((mockPage.click as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });

    it('should execute fill event', async () => {
      const mockPage = createMockPage();

      const recording: RecordingSession = {
        id: 'test-recording',
        startTime: Date.now(),
        duration: 1000,
        startUrl: 'https://example.com',
        viewport: { width: 1280, height: 720 },
        events: [
          {
            id: 'evt_001',
            type: 'input',
            timestamp: 100,
            selector: '#input',
            data: { value: 'hello world' },
          },
        ],
        metadata: {
          browser: 'Chromium',
          os: 'darwin',
          userAgent: 'test',
          recordedAt: new Date().toISOString(),
        },
      };

      const player = new PlaybackEngine(mockPage, recording);
      const result = await player.play({ noDelay: true });

      assert.ok(result.success);
      assert.strictEqual((mockPage.fill as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });

    it('should execute hover event', async () => {
      const mockPage = createMockPage();

      const recording: RecordingSession = {
        id: 'test-recording',
        startTime: Date.now(),
        duration: 1000,
        startUrl: 'https://example.com',
        viewport: { width: 1280, height: 720 },
        events: [
          {
            id: 'evt_001',
            type: 'hover_enter',
            timestamp: 100,
            selector: '#button',
            data: {},
          },
        ],
        metadata: {
          browser: 'Chromium',
          os: 'darwin',
          userAgent: 'test',
          recordedAt: new Date().toISOString(),
        },
      };

      const player = new PlaybackEngine(mockPage, recording);
      const result = await player.play({ noDelay: true });

      assert.ok(result.success);
      assert.strictEqual((mockPage.hover as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });

    it('should execute scroll event', async () => {
      const mockPage = createMockPage();

      const recording: RecordingSession = {
        id: 'test-recording',
        startTime: Date.now(),
        duration: 1000,
        startUrl: 'https://example.com',
        viewport: { width: 1280, height: 720 },
        events: [
          {
            id: 'evt_001',
            type: 'scroll',
            timestamp: 100,
            data: { scrollX: 0, scrollY: 500 },
          },
        ],
        metadata: {
          browser: 'Chromium',
          os: 'darwin',
          userAgent: 'test',
          recordedAt: new Date().toISOString(),
        },
      };

      const player = new PlaybackEngine(mockPage, recording);
      const result = await player.play({ noDelay: true });

      assert.ok(result.success);
      assert.strictEqual((mockPage.evaluate as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });

    it('should execute keydown event', async () => {
      const mockPage = createMockPage();

      const recording: RecordingSession = {
        id: 'test-recording',
        startTime: Date.now(),
        duration: 1000,
        startUrl: 'https://example.com',
        viewport: { width: 1280, height: 720 },
        events: [
          {
            id: 'evt_001',
            type: 'keydown',
            timestamp: 100,
            data: { key: 'Enter', code: 'Enter' },
          },
        ],
        metadata: {
          browser: 'Chromium',
          os: 'darwin',
          userAgent: 'test',
          recordedAt: new Date().toISOString(),
        },
      };

      const player = new PlaybackEngine(mockPage, recording);
      const result = await player.play({ noDelay: true });

      assert.ok(result.success);
      const contextMock = mockPage.context as ReturnType<typeof mock.fn>;
      const ctx = contextMock.mock.calls[0].result;
      const newCDPSessionMock = ctx.newCDPSession as ReturnType<typeof mock.fn>;
      const cdp = await newCDPSessionMock.mock.calls[0].result;
      const cdpSendCalls = (cdp.send as ReturnType<typeof mock.fn>).mock.calls;
      const keyDispatchCalls = cdpSendCalls.filter(
        (call: { arguments: unknown[] }) => call.arguments[0] === 'Input.dispatchKeyEvent'
      );
      assert.strictEqual(keyDispatchCalls.length, 1);
    });

    it('should execute focus event', async () => {
      const mockPage = createMockPage();

      const recording: RecordingSession = {
        id: 'test-recording',
        startTime: Date.now(),
        duration: 1000,
        startUrl: 'https://example.com',
        viewport: { width: 1280, height: 720 },
        events: [
          {
            id: 'evt_001',
            type: 'focus',
            timestamp: 100,
            selector: '#input',
            data: {},
          },
        ],
        metadata: {
          browser: 'Chromium',
          os: 'darwin',
          userAgent: 'test',
          recordedAt: new Date().toISOString(),
        },
      };

      const player = new PlaybackEngine(mockPage, recording);
      const result = await player.play({ noDelay: true });

      assert.ok(result.success);
      assert.strictEqual((mockPage.focus as ReturnType<typeof mock.fn>).mock.calls.length, 1);
    });

    it('should execute multiple events in sequence', async () => {
      const mockPage = createMockPage();

      const recording: RecordingSession = {
        id: 'test-recording',
        startTime: Date.now(),
        duration: 1000,
        startUrl: 'https://example.com',
        viewport: { width: 1280, height: 720 },
        events: [
          {
            id: 'evt_001',
            type: 'focus',
            timestamp: 100,
            selector: '#input',
            data: {},
          },
          {
            id: 'evt_002',
            type: 'input',
            timestamp: 200,
            selector: '#input',
            data: { value: 'hello' },
          },
          {
            id: 'evt_003',
            type: 'click',
            timestamp: 300,
            selector: '#submit',
            data: { x: 100, y: 200, button: 0 },
          },
        ],
        metadata: {
          browser: 'Chromium',
          os: 'darwin',
          userAgent: 'test',
          recordedAt: new Date().toISOString(),
        },
      };

      const player = new PlaybackEngine(mockPage, recording);
      const result = await player.play({ noDelay: true });

      assert.ok(result.success);
      assert.strictEqual(result.eventsPlayed, 3);
      assert.strictEqual(result.totalEvents, 3);
    });

    it('should handle wait conditions', async () => {
      const mockPage = createMockPage();

      const recording: RecordingSession = {
        id: 'test-recording',
        startTime: Date.now(),
        duration: 1000,
        startUrl: 'https://example.com',
        viewport: { width: 1280, height: 720 },
        events: [
          {
            id: 'evt_001',
            type: 'click',
            timestamp: 100,
            selector: '#button',
            data: { x: 100, y: 200, button: 0 },
            waitBefore: [{ type: 'element_visible', selector: '#button' }],
          },
        ],
        metadata: {
          browser: 'Chromium',
          os: 'darwin',
          userAgent: 'test',
          recordedAt: new Date().toISOString(),
        },
      };

      const player = new PlaybackEngine(mockPage, recording);
      const result = await player.play({ noDelay: true });

      assert.ok(result.success);
      assert.strictEqual(
        (mockPage.waitForSelector as ReturnType<typeof mock.fn>).mock.calls.length,
        1
      );
    });

    it('should stop on error when stopOnError is true', async () => {
      const mockPage = createMockPage({
        click: mock.fn(async (selector: string) => {
          if (selector === '#error-button') {
            throw new Error('Element not found');
          }
        }),
      });

      const recording: RecordingSession = {
        id: 'test-recording',
        startTime: Date.now(),
        duration: 1000,
        startUrl: 'https://example.com',
        viewport: { width: 1280, height: 720 },
        events: [
          {
            id: 'evt_001',
            type: 'click',
            timestamp: 100,
            selector: '#error-button',
            data: { x: 100, y: 200, button: 0 },
          },
          {
            id: 'evt_002',
            type: 'click',
            timestamp: 200,
            selector: '#ok-button',
            data: { x: 100, y: 200, button: 0 },
          },
        ],
        metadata: {
          browser: 'Chromium',
          os: 'darwin',
          userAgent: 'test',
          recordedAt: new Date().toISOString(),
        },
      };

      const player = new PlaybackEngine(mockPage, recording);
      const result = await player.play({ noDelay: true, stopOnError: true });

      assert.ok(!result.success);
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(result.errors[0].eventIndex, 0);
    });

    it('should continue on error when stopOnError is false', async () => {
      let clickCount = 0;
      const mockPage = createMockPage({
        click: mock.fn(async (selector: string) => {
          clickCount++;
          if (selector === '#error-button') {
            throw new Error('Element not found');
          }
        }),
      });

      const recording: RecordingSession = {
        id: 'test-recording',
        startTime: Date.now(),
        duration: 1000,
        startUrl: 'https://example.com',
        viewport: { width: 1280, height: 720 },
        events: [
          {
            id: 'evt_001',
            type: 'click',
            timestamp: 100,
            selector: '#error-button',
            data: { x: 100, y: 200, button: 0 },
          },
          {
            id: 'evt_002',
            type: 'click',
            timestamp: 200,
            selector: '#ok-button',
            data: { x: 100, y: 200, button: 0 },
          },
        ],
        metadata: {
          browser: 'Chromium',
          os: 'darwin',
          userAgent: 'test',
          recordedAt: new Date().toISOString(),
        },
      };

      const player = new PlaybackEngine(mockPage, recording);
      const result = await player.play({ noDelay: true, stopOnError: false });

      assert.ok(!result.success);
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(clickCount, 2);
    });

    it('should call onProgress callback', async () => {
      const mockPage = createMockPage();
      type ProgressInfo = { current: number; total: number; event: RecordedEvent };
      const progressCalls: ProgressInfo[] = [];

      const recording: RecordingSession = {
        id: 'test-recording',
        startTime: Date.now(),
        duration: 1000,
        startUrl: 'https://example.com',
        viewport: { width: 1280, height: 720 },
        events: [
          {
            id: 'evt_001',
            type: 'click',
            timestamp: 100,
            selector: '#button',
            data: { x: 100, y: 200, button: 0 },
          },
          {
            id: 'evt_002',
            type: 'click',
            timestamp: 200,
            selector: '#button2',
            data: { x: 100, y: 200, button: 0 },
          },
        ],
        metadata: {
          browser: 'Chromium',
          os: 'darwin',
          userAgent: 'test',
          recordedAt: new Date().toISOString(),
        },
      };

      const player = new PlaybackEngine(mockPage, recording);
      const result = await player.play({
        noDelay: true,
        onProgress: (info) => progressCalls.push(info),
      });

      assert.ok(result.success);
      assert.strictEqual(progressCalls.length, 2);
      assert.strictEqual(progressCalls[0].current, 1);
      assert.strictEqual(progressCalls[0].total, 2);
      assert.strictEqual(progressCalls[1].current, 2);
      assert.strictEqual(progressCalls[1].total, 2);
    });
  });
});
