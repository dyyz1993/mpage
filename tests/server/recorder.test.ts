import { describe, it, expect, vi } from 'vitest';
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
    send: vi.fn(() => {}),
    on: vi.fn((event: string, handler: ConsoleHandler) => {
      const existing = listeners.get(event) || [];
      existing.push(handler);
      listeners.set(event, existing);
    }),
    off: vi.fn((event: string, handler: ConsoleHandler) => {
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
    newCDPSession: vi.fn(() => cdpSession),
    exposeFunction: vi.fn(() => {}),
    addInitScript: vi.fn(() => {}),
    route: vi.fn(() => {}),
    on: vi.fn(() => {}),
    off: vi.fn(() => {}),
    pages: vi.fn(() => (pageRef.current ? [pageRef.current] : [])),
    browser: vi.fn(() => null),
  } as unknown as BrowserContext;

  const mockPage = {
    context: vi.fn(() => mockContext),
    goto: vi.fn(() => {}),
    evaluate: vi.fn((fn: (...args: unknown[]) => unknown | string) => {
      if (typeof fn === 'string') {
        return undefined;
      }
      return 'mocked result';
    }),
    addInitScript: vi.fn(() => {}),
    addScriptTag: vi.fn(() => {}),
    exposeFunction: vi.fn(() => {}),
    viewportSize: vi.fn(() => ({ width: 1280, height: 720 })),
    url: vi.fn(() => 'https://example.com'),
    title: vi.fn(() => 'Example Domain'),
    click: vi.fn(() => {}),
    fill: vi.fn(() => {}),
    hover: vi.fn(() => {}),
    focus: vi.fn(() => {}),
    dblclick: vi.fn(() => {}),
    waitForSelector: vi.fn(() => {}),
    waitForLoadState: vi.fn(() => {}),
    waitForTimeout: vi.fn(() => {}),
    waitForURL: vi.fn(() => {}),
    $: vi.fn(() => ({})),
    isVisible: vi.fn(() => true),
    isHidden: vi.fn(() => false),
    textContent: vi.fn(() => ''),
    setViewportSize: vi.fn(() => {}),
    on: vi.fn((event: string, handler: ConsoleHandler | NavigationHandler) => {
      if (event === 'console') {
        consoleListeners.push(handler as ConsoleHandler);
      }
      if (event === 'framenavigated') {
        navigationListeners.push(handler as NavigationHandler);
      }
    }),
    off: vi.fn((event: string, handler: ConsoleHandler | NavigationHandler) => {
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
      move: vi.fn(() => {}),
    } as unknown,
    keyboard: {
      press: vi.fn(() => {}),
      down: vi.fn(() => {}),
      up: vi.fn(() => {}),
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
      expect(typeof script === 'string').toBeTruthy();
      expect(script.includes('PageRecorder')).toBeTruthy();
      expect(script.includes('window.__pageRecorder')).toBeTruthy();
    });

    it('should contain event handlers', () => {
      const script = getRecorderScript();
      expect(script.includes('handleClick')).toBeTruthy();
      expect(script.includes('handleMouseMove')).toBeTruthy();
      expect(script.includes('handleScroll')).toBeTruthy();
      expect(script.includes('handleKeyDown')).toBeTruthy();
      expect(script.includes('handleInput')).toBeTruthy();
      expect(script.includes('handleFocus')).toBeTruthy();
    });
  });

  describe('constructor', () => {
    it('should create a recorder with initial state', () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      const status = recorder.getStatus();
      expect(status).toBeNull();
    });
  });

  describe('start', () => {
    it('should start recording', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await recorder.start({ url: 'https://example.com' });

      const status = recorder.getStatus();
      expect(status?.isRecording).toBeTruthy();
      expect(status?.eventCount).toBe(1);
    });

    it('should throw error if already recording', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await recorder.start({ url: 'https://example.com' });

      await expect(recorder.start({ url: 'https://example.com' })).rejects.toThrow(
        'Recording is already in progress'
      );
    });

    it('should navigate to URL if provided', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await recorder.start({ url: 'https://test.com' });

      expect((mockPage.goto as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    });
  });

  describe('stop', () => {
    it('should stop recording and return session', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await recorder.start({ url: 'https://example.com' });
      const result = await recorder.stop();

      expect(result.session).toBeTruthy();
      expect(result.path).toBeTruthy();
      expect(result.session.id.startsWith('rec_')).toBeTruthy();
      expect(result.session.startUrl).toBe('https://example.com');
    });

    it('should throw error if not recording', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await expect(recorder.stop()).rejects.toThrow('No recording in progress');
    });

    it('should reset recording state after stop', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await recorder.start({ url: 'https://example.com' });
      await recorder.stop();

      const status = recorder.getStatus();
      expect(status).toBeNull();
    });

    it('should await all trackedPages addScriptTag calls before clearing', async () => {
      const completedPages: string[] = [];
      const delays = [20, 30, 10];

      const pages = delays.map((delay, idx) => {
        const p = createMockPage({
          addScriptTag: vi.fn(async (opts: { content: string }) => {
            if (opts.content && opts.content.includes('__pageRecorder.stop')) {
              await new Promise((r) => setTimeout(r, delay));
              completedPages.push(`page-${idx}`);
            }
          }),
        });
        return p;
      });

      const mainPage = pages[0];
      const recorder = new RecorderController(mainPage);

      await recorder.start({ url: 'https://example.com' });

      (recorder as unknown as { trackedPages: Set<unknown> }).trackedPages = new Set(pages);

      await recorder.stop();

      expect(completedPages.includes('page-1')).toBeTruthy();
      expect(completedPages.includes('page-2')).toBeTruthy();
    });
  });

  describe('getStatus', () => {
    it('should return null when not recording', () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      const status = recorder.getStatus();
      expect(status).toBeNull();
    });

    it('should return status when recording', async () => {
      const mockPage = createMockPage();
      const recorder = new RecorderController(mockPage);

      await recorder.start({ url: 'https://example.com' });

      const status = recorder.getStatus();
      expect(status?.isRecording).toBeTruthy();
      expect(status?.duration >= 0).toBeTruthy();
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

      expect(player).toBeTruthy();

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

      expect(result.success).toBeTruthy();
      expect(result.eventsPlayed).toBe(1);
      expect(result.totalEvents).toBe(1);
      expect((mockPage.click as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
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

      expect(result.success).toBeTruthy();
      expect((mockPage.fill as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
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

      expect(result.success).toBeTruthy();
      expect((mockPage.hover as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
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

      expect(result.success).toBeTruthy();
      expect((mockPage.evaluate as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
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

      expect(result.success).toBeTruthy();
      const contextMock = mockPage.context as ReturnType<typeof vi.fn>;
      const ctx = contextMock.mock.results[0].value;
      const newCDPSessionMock = ctx.newCDPSession as ReturnType<typeof vi.fn>;
      const cdp = await newCDPSessionMock.mock.results[0].value;
      const cdpSendCalls = (cdp.send as ReturnType<typeof vi.fn>).mock.calls;
      const keyDispatchCalls = cdpSendCalls.filter(
        (call: unknown[]) => call[0] === 'Input.dispatchKeyEvent'
      );
      expect(keyDispatchCalls.length).toBe(1);
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

      expect(result.success).toBeTruthy();
      expect((mockPage.focus as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
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

      expect(result.success).toBeTruthy();
      expect(result.eventsPlayed).toBe(3);
      expect(result.totalEvents).toBe(3);
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

      expect(result.success).toBeTruthy();
      expect((mockPage.waitForSelector as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    });

    it('should stop on error when stopOnError is true', async () => {
      const mockPage = createMockPage({
        click: vi.fn((selector: string) => {
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

      expect(result.success).toBeFalsy();
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].eventIndex).toBe(0);
    });

    it('should continue on error when stopOnError is false', async () => {
      let clickCount = 0;
      const mockPage = createMockPage({
        click: vi.fn((selector: string) => {
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

      expect(result.success).toBeFalsy();
      expect(result.errors.length).toBe(1);
      expect(clickCount).toBe(2);
    });

    it('should call onProgress callback', async () => {
      const mockPage = createMockPage();
      type ProgressInfo = { current: number; total: number; event: Record<string, unknown> };
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
        onProgress: (info) => progressCalls.push(info as ProgressInfo),
      });

      expect(result.success).toBeTruthy();
      expect(progressCalls.length).toBe(2);
      expect(progressCalls[0].current).toBe(1);
      expect(progressCalls[0].total).toBe(2);
      expect(progressCalls[1].current).toBe(2);
      expect(progressCalls[1].total).toBe(2);
    });
  });
});
