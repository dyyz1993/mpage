import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaybackEngine } from '../../../src/server/recorder/player.js';
import type { Page, BrowserContext, CDPSession } from 'playwright-core';
import type { RecordingSession, RecordedEvent } from '../../../src/server/recorder/types.js';

function createMockCDPSession(): CDPSession {
  return {
    send: vi.fn(async () => {}),
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as CDPSession;
}

function createMockPage(overrides: Partial<Page> = {}): Page {
  const cdp = createMockCDPSession();
  const mockContext: BrowserContext = {
    newCDPSession: vi.fn(async () => cdp),
    pages: vi.fn(() => []),
    browser: vi.fn(() => null),
  } as unknown as BrowserContext;

  return {
    context: vi.fn(() => mockContext),
    url: vi.fn(() => 'https://example.com'),
    goto: vi.fn(async () => {}),
    title: vi.fn(async () => 'Test'),
    evaluate: vi.fn(async () => ''),
    click: vi.fn(async () => {}),
    dblclick: vi.fn(async () => {}),
    hover: vi.fn(async () => {}),
    focus: vi.fn(async () => {}),
    fill: vi.fn(async () => {}),
    check: vi.fn(async () => {}),
    uncheck: vi.fn(async () => {}),
    selectOption: vi.fn(async () => []),
    setInputFiles: vi.fn(async () => {}),
    waitForSelector: vi.fn(async () => ({})),
    waitForLoadState: vi.fn(async () => {}),
    waitForTimeout: vi.fn(async () => {}),
    waitForURL: vi.fn(async () => {}),
    waitForFunction: vi.fn(async () => ({})),
    setViewportSize: vi.fn(async () => {}),
    isVisible: vi.fn(async () => true),
    isHidden: vi.fn(async () => false),
    textContent: vi.fn(async () => ''),
    $: vi.fn(async () => ({})),
    addScriptTag: vi.fn(async () => {}),
    mouse: {
      move: vi.fn(async () => {}),
    },
    keyboard: {
      press: vi.fn(async () => {}),
      down: vi.fn(async () => {}),
      up: vi.fn(async () => {}),
    },
    ...overrides,
  } as unknown as Page;
}

function makeRecording(
  events: RecordedEvent[],
  startUrl = 'https://example.com'
): RecordingSession {
  return {
    id: 'test-rec',
    startTime: Date.now(),
    duration: 1000,
    startUrl,
    viewport: { width: 1280, height: 720 },
    events,
    metadata: {
      browser: 'Chromium',
      os: 'darwin',
      userAgent: 'test',
      recordedAt: new Date().toISOString(),
    },
  };
}

describe('PlaybackEngine - extra coverage', () => {
  let mockPage: Page;

  beforeEach(() => {
    mockPage = createMockPage();
  });

  describe('constructor', () => {
    it('should create engine with page and recording', () => {
      const recording = makeRecording([]);
      const engine = new PlaybackEngine(mockPage, recording);
      expect(engine).toBeTruthy();
    });
  });

  describe('play - navigation', () => {
    it('should navigate to startUrl when current URL differs', async () => {
      const page = createMockPage({ url: vi.fn(() => 'https://other.com') });
      const recording = makeRecording([], 'https://example.com');
      const engine = new PlaybackEngine(page, recording);

      await engine.play({ noDelay: true });
      expect(page.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object));
    });

    it('should skip navigation when URL matches', async () => {
      const page = createMockPage({ url: vi.fn(() => 'https://example.com') });
      const recording = makeRecording([], 'https://example.com');
      const engine = new PlaybackEngine(page, recording);

      await engine.play({ noDelay: true });
      expect(page.goto).not.toHaveBeenCalled();
    });

    it('should continue when navigation fails', async () => {
      const page = createMockPage({
        url: vi.fn(() => 'https://other.com'),
        goto: vi.fn(async () => {
          throw new Error('Navigation failed');
        }),
      });
      const recording = makeRecording(
        [{ id: 'evt_001', type: 'click', timestamp: 0, selector: '#btn', data: {} }],
        'https://example.com'
      );
      const engine = new PlaybackEngine(page, recording);

      const result = await engine.play({ noDelay: true });
      expect(result.success).toBe(true);
    });
  });

  describe('play - viewport', () => {
    it('should set viewport when recording has viewport', async () => {
      const recording = makeRecording([]);
      recording.viewport = { width: 1920, height: 1080 };
      const engine = new PlaybackEngine(mockPage, recording);

      await engine.play({ noDelay: true });
      expect(mockPage.setViewportSize).toHaveBeenCalledWith({ width: 1920, height: 1080 });
    });
  });

  describe('executeEvent - dblclick', () => {
    it('should execute dblclick event', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'dblclick', timestamp: 0, selector: '#item', data: {} },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.dblclick).toHaveBeenCalledWith('#item');
    });
  });

  describe('executeEvent - contextmenu', () => {
    it('should execute contextmenu event (right click)', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'contextmenu', timestamp: 0, selector: '#item', data: {} },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.click).toHaveBeenCalledWith('#item', { button: 'right' });
    });
  });

  describe('executeEvent - mousedown', () => {
    it('should execute mousedown as hover', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'mousedown', timestamp: 0, selector: '#item', data: {} },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.hover).toHaveBeenCalledWith('#item');
    });
  });

  describe('executeEvent - mouseup', () => {
    it('should handle mouseup with no action', async () => {
      const recording = makeRecording([{ id: 'e1', type: 'mouseup', timestamp: 0, data: {} }]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
    });
  });

  describe('executeEvent - mousemove', () => {
    it('should handle single point mousemove', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'mousemove', timestamp: 0, data: { x: 100, y: 200 } },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.mouse.move).toHaveBeenCalledWith(100, 200);
    });

    it('should handle trajectory mousemove', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'mousemove', timestamp: 0, data: { x: 10, y: 20 } },
        { id: 'e2', type: 'mousemove', timestamp: 50, data: { x: 30, y: 40 } },
        { id: 'e3', type: 'mousemove', timestamp: 100, data: { x: 50, y: 60 } },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(result.totalEvents).toBe(1);
      expect(mockPage.mouse.move).toHaveBeenCalledTimes(3);
    });
  });

  describe('executeEvent - hover_leave', () => {
    it('should move mouse to 0,0 on hover_leave', async () => {
      const recording = makeRecording([{ id: 'e1', type: 'hover_leave', timestamp: 0, data: {} }]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.mouse.move).toHaveBeenCalledWith(0, 0);
    });
  });

  describe('executeEvent - scroll', () => {
    it('should execute scroll via page.evaluate', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'scroll', timestamp: 0, data: { scrollX: 0, scrollY: 500 } },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should handle scroll failure gracefully', async () => {
      const page = createMockPage({
        evaluate: vi.fn(async () => {
          throw new Error('cross-origin');
        }),
      });
      const recording = makeRecording([
        { id: 'e1', type: 'scroll', timestamp: 0, data: { scrollX: 0, scrollY: 500 } },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
    });
  });

  describe('executeEvent - keyup', () => {
    it('should send keyUp via CDP', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'keyup', timestamp: 0, data: { key: 'Enter' } },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      const ctx = (mockPage.context as ReturnType<typeof vi.fn>).mock.results[0].value;
      const cdp = await (ctx.newCDPSession as ReturnType<typeof vi.fn>).mock.results[0].value;
      const calls = (cdp.send as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c: unknown[]) => c[0] === 'Input.dispatchKeyEvent'
      );
      expect(calls.length).toBe(1);
      expect(calls[0][1].type).toBe('keyUp');
    });
  });

  describe('executeEvent - change', () => {
    it('should use fill for change with value', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'change', timestamp: 0, selector: '#input', data: { value: 'test' } },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.fill).toHaveBeenCalledWith('#input', 'test');
    });

    it('should use check for checkbox with checked=true', async () => {
      const mockElement = {
        evaluate: vi.fn(async () => true),
      };
      const page = createMockPage({
        $: vi.fn(async () => mockElement),
      });
      const recording = makeRecording([
        { id: 'e1', type: 'change', timestamp: 0, selector: '#check', data: { checked: true } },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(page.check).toHaveBeenCalledWith('#check');
    });

    it('should use uncheck for checkbox with checked=false', async () => {
      const mockElement = {
        evaluate: vi.fn(async () => true),
      };
      const page = createMockPage({
        $: vi.fn(async () => mockElement),
      });
      const recording = makeRecording([
        { id: 'e1', type: 'change', timestamp: 0, selector: '#check', data: { checked: false } },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(page.uncheck).toHaveBeenCalledWith('#check');
    });

    it('should skip check/uncheck for non-checkbox elements', async () => {
      const mockElement = {
        evaluate: vi.fn(async () => false),
      };
      const page = createMockPage({
        $: vi.fn(async () => mockElement),
      });
      const recording = makeRecording([
        { id: 'e1', type: 'change', timestamp: 0, selector: '#text', data: { checked: true } },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(page.check).not.toHaveBeenCalled();
    });
  });

  describe('executeEvent - blur', () => {
    it('should focus body for blur event', async () => {
      const recording = makeRecording([{ id: 'e1', type: 'blur', timestamp: 0, data: {} }]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.focus).toHaveBeenCalledWith('body');
    });
  });

  describe('executeEvent - select', () => {
    it('should execute selectOption', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'select', timestamp: 0, selector: '#sel', data: { value: 'opt1' } },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.selectOption).toHaveBeenCalledWith('#sel', 'opt1');
    });
  });

  describe('executeEvent - navigation', () => {
    it('should execute navigation via goto', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'navigation', timestamp: 0, data: { url: 'https://example.com/page2' } },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/page2', expect.any(Object));
    });

    it('should handle navigation timeout gracefully', async () => {
      const page = createMockPage({
        goto: vi.fn(async () => {
          throw new Error('timeout');
        }),
      });
      const recording = makeRecording([
        { id: 'e1', type: 'navigation', timestamp: 0, data: { url: 'https://slow.com' } },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
    });
  });

  describe('executeEvent - page_load', () => {
    it('should wait for domcontentloaded', async () => {
      const recording = makeRecording([{ id: 'e1', type: 'page_load', timestamp: 0, data: {} }]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('domcontentloaded');
    });
  });

  describe('executeEvent - hash_change', () => {
    it('should navigate to hash url', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'hash_change',
          timestamp: 0,
          data: { url: 'https://example.com#section' },
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com#section');
    });
  });

  describe('executeEvent - tab_open', () => {
    it('should navigate to tab url', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'tab_open', timestamp: 0, data: { url: 'https://example.com/popup' } },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/popup');
    });
  });

  describe('executeEvent - file_upload', () => {
    it('should set input files', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'file_upload',
          timestamp: 0,
          selector: '#file-input',
          data: { files: ['/path/to/file.pdf'] },
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.setInputFiles).toHaveBeenCalledWith('#file-input', ['/path/to/file.pdf']);
    });
  });

  describe('executeEvent - wait and assert', () => {
    it('should handle wait event type (no-op)', async () => {
      const recording = makeRecording([{ id: 'e1', type: 'wait', timestamp: 0, data: {} }]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
    });

    it('should handle assert event type (no-op)', async () => {
      const recording = makeRecording([{ id: 'e1', type: 'assert', timestamp: 0, data: {} }]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
    });
  });

  describe('executeEvent - input', () => {
    it('should type new characters via CDP when value grows', async () => {
      const page = createMockPage({
        evaluate: vi.fn(async () => 'he'),
      });
      const recording = makeRecording([
        { id: 'e1', type: 'input', timestamp: 0, selector: '#inp', data: { value: 'hello' } },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      const ctx = (page.context as ReturnType<typeof vi.fn>).mock.results[0].value;
      const cdp = await (ctx.newCDPSession as ReturnType<typeof vi.fn>).mock.results[0].value;
      const charCalls = (cdp.send as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c: unknown[]) => c[0] === 'Input.dispatchKeyEvent' && c[1].type === 'char'
      );
      expect(charCalls.length).toBe(3);
    });

    it('should use fill when value shrinks', async () => {
      const page = createMockPage({
        evaluate: vi.fn(async () => 'hello world'),
      });
      const recording = makeRecording([
        { id: 'e1', type: 'input', timestamp: 0, selector: '#inp', data: { value: 'hi' } },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(page.fill).toHaveBeenCalledWith('#inp', 'hi');
    });
  });

  describe('aggregateMouseMoveEvents', () => {
    it('should aggregate consecutive mousemove events into trajectory', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'mousemove', timestamp: 0, data: { x: 10, y: 20 } },
        { id: 'e2', type: 'mousemove', timestamp: 50, data: { x: 30, y: 40 } },
        { id: 'e3', type: 'mousemove', timestamp: 100, data: { x: 50, y: 60 } },
        { id: 'e4', type: 'click', timestamp: 150, selector: '#btn', data: {} },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(result.totalEvents).toBe(2);
    });

    it('should keep single mousemove as-is', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'mousemove', timestamp: 0, data: { x: 10, y: 20 } },
        { id: 'e2', type: 'click', timestamp: 100, selector: '#btn', data: {} },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(result.totalEvents).toBe(2);
    });
  });

  describe('executeWaits', () => {
    it('should wait for element_visible', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          waitBefore: [{ type: 'element_visible', selector: '#btn' }],
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        '#btn',
        expect.objectContaining({ state: 'visible' })
      );
    });

    it('should wait for element_hidden', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          waitBefore: [{ type: 'element_hidden', selector: '#spinner' }],
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        '#spinner',
        expect.objectContaining({ state: 'hidden' })
      );
    });

    it('should wait for element_attached', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          waitBefore: [{ type: 'element_attached', selector: '#el' }],
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        '#el',
        expect.objectContaining({ state: 'attached' })
      );
    });

    it('should wait for element_detached', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          waitBefore: [{ type: 'element_detached', selector: '#el' }],
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        '#el',
        expect.objectContaining({ state: 'detached' })
      );
    });

    it('should wait for text_present', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          waitBefore: [{ type: 'text_present', text: 'Loaded' }],
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should wait for text_gone', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          waitBefore: [{ type: 'text_gone', text: 'Loading...' }],
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('should wait for url_match', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          waitBefore: [{ type: 'url_match', url: '**/success' }],
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.waitForURL).toHaveBeenCalledWith('**/success', expect.any(Object));
    });

    it('should wait for page_load', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          waitBefore: [{ type: 'page_load' }],
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('load', expect.any(Object));
    });

    it('should wait for network_idle', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          waitBefore: [{ type: 'network_idle' }],
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', expect.any(Object));
    });

    it('should wait for timeout', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          waitBefore: [{ type: 'timeout', timeout: 2000 }],
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(2000);
    });
  });

  describe('executeAssertions', () => {
    it('should assert element_exists', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'element_exists', selector: '#result' }],
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
    });

    it('should fail on element_exists when element is null', async () => {
      const page = createMockPage({ $: vi.fn(async () => null) });
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'element_exists', selector: '#missing' }],
        },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('Element not found');
    });

    it('should assert element_visible', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'element_visible', selector: '#result' }],
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
    });

    it('should fail on element_visible when hidden', async () => {
      const page = createMockPage({ isVisible: vi.fn(async () => false) });
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'element_visible', selector: '#hidden' }],
        },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('not visible');
    });

    it('should assert element_hidden', async () => {
      const page = createMockPage({ isHidden: vi.fn(async () => true) });
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'element_hidden', selector: '#spinner' }],
        },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
    });

    it('should fail on element_hidden when visible', async () => {
      const page = createMockPage({ isHidden: vi.fn(async () => false) });
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'element_hidden', selector: '#spinner' }],
        },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(false);
    });

    it('should assert text_equals', async () => {
      const page = createMockPage({ textContent: vi.fn(async () => 'Hello') });
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'text_equals', selector: '#el', expected: 'Hello' }],
        },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
    });

    it('should fail on text_equals mismatch', async () => {
      const page = createMockPage({ textContent: vi.fn(async () => 'World') });
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'text_equals', selector: '#el', expected: 'Hello' }],
        },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('Text mismatch');
    });

    it('should assert text_contains', async () => {
      const page = createMockPage({ textContent: vi.fn(async () => 'Hello World') });
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'text_contains', selector: '#el', expected: 'World' }],
        },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
    });

    it('should fail on text_contains mismatch', async () => {
      const page = createMockPage({ textContent: vi.fn(async () => 'Hello') });
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'text_contains', selector: '#el', expected: 'World' }],
        },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('does not contain');
    });

    it('should assert url_equals', async () => {
      const page = createMockPage({ url: vi.fn(() => 'https://example.com/success') });
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'url_equals', expected: 'https://example.com/success' }],
        },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
    });

    it('should fail on url_equals mismatch', async () => {
      const page = createMockPage({ url: vi.fn(() => 'https://example.com/fail') });
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'url_equals', expected: 'https://example.com/success' }],
        },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('URL mismatch');
    });

    it('should assert url_contains', async () => {
      const page = createMockPage({ url: vi.fn(() => 'https://example.com/success') });
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'url_contains', expected: 'success' }],
        },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
    });

    it('should fail on url_contains mismatch', async () => {
      const page = createMockPage({ url: vi.fn(() => 'https://example.com/fail') });
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#btn',
          data: {},
          assertAfter: [{ type: 'url_contains', expected: 'success' }],
        },
      ]);
      const engine = new PlaybackEngine(page, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(false);
    });
  });

  describe('play - delay', () => {
    it('should apply slowMo multiplier to delays', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'click', timestamp: 0, selector: '#btn1', data: {} },
        { id: 'e2', type: 'click', timestamp: 100, selector: '#btn2', data: {} },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ slowMo: 2 });

      expect(result.success).toBe(true);
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(200);
    });

    it('should not delay when noDelay is true', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'click', timestamp: 0, selector: '#btn1', data: {} },
        { id: 'e2', type: 'click', timestamp: 1000, selector: '#btn2', data: {} },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      expect(mockPage.waitForTimeout).not.toHaveBeenCalledWith(expect.any(Number));
    });
  });

  describe('executeEvent - click with AI wait', () => {
    it('should wait for AI completion for message_action selectors', async () => {
      const recording = makeRecording([
        {
          id: 'e1',
          type: 'click',
          timestamp: 0,
          selector: '#message_action_copy',
          data: {},
        },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
    });
  });

  describe('getKeyInfo coverage', () => {
    it('should handle Tab key', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'keydown', timestamp: 0, data: { key: 'Tab' } },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      const ctx = (mockPage.context as ReturnType<typeof vi.fn>).mock.results[0].value;
      const cdp = await (ctx.newCDPSession as ReturnType<typeof vi.fn>).mock.results[0].value;
      const call = (cdp.send as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === 'Input.dispatchKeyEvent'
      );
      expect(call[1].code).toBe('Tab');
    });

    it('should handle single character key', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'keydown', timestamp: 0, data: { key: 'a' } },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      const ctx = (mockPage.context as ReturnType<typeof vi.fn>).mock.results[0].value;
      const cdp = await (ctx.newCDPSession as ReturnType<typeof vi.fn>).mock.results[0].value;
      const call = (cdp.send as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === 'Input.dispatchKeyEvent'
      );
      expect(call[1].code).toBe('KeyA');
    });

    it('should handle unknown multi-char key', async () => {
      const recording = makeRecording([
        { id: 'e1', type: 'keydown', timestamp: 0, data: { key: 'F15' } },
      ]);
      const engine = new PlaybackEngine(mockPage, recording);
      const result = await engine.play({ noDelay: true });

      expect(result.success).toBe(true);
      const ctx = (mockPage.context as ReturnType<typeof vi.fn>).mock.results[0].value;
      const cdp = await (ctx.newCDPSession as ReturnType<typeof vi.fn>).mock.results[0].value;
      const call = (cdp.send as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === 'Input.dispatchKeyEvent'
      );
      expect(call[1].code).toBe('F15');
      expect(call[1].windowsVirtualKeyCode).toBe(0);
    });
  });
});
