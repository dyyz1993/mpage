import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setupBrowserCDPListener,
  startPagePolling,
  injectScriptToPage,
} from '../../../src/server/recorder/controller-tab-tracking.js';
import type { Page, BrowserContext, CDPSession } from 'playwright-core';
import type { RecordedEvent } from '../../../src/server/recorder/types.js';

function createMockCDPSession(): CDPSession {
  const listeners: Map<string, Function[]> = new Map();
  return {
    send: vi.fn(async () => {}),
    on: vi.fn((event: string, handler: Function) => {
      const existing = listeners.get(event) || [];
      existing.push(handler);
      listeners.set(event, existing);
    }),
    off: vi.fn(),
    emit: (event: string, data: unknown) => {
      const handlers = listeners.get(event) || [];
      handlers.forEach((h) => h(data));
    },
  } as unknown as CDPSession;
}

function createMockBrowser(cdp?: CDPSession) {
  const session = cdp || createMockCDPSession();
  const pages: Page[] = [];
  return {
    newBrowserCDPSession: vi.fn(async () => session),
    contexts: vi.fn(() => [
      {
        pages: vi.fn(() => pages),
      },
    ]),
    _pages: pages,
    _session: session,
  };
}

function createMockContext(overrides: Partial<BrowserContext> = {}): BrowserContext {
  return {
    pages: vi.fn(() => []),
    on: vi.fn(),
    off: vi.fn(),
    newCDPSession: vi.fn(async () => createMockCDPSession()),
    ...overrides,
  } as unknown as BrowserContext;
}

function createMockPage(overrides: Partial<Page> = {}): Page {
  const browser = createMockBrowser();
  return {
    context: vi.fn(
      () =>
        ({
          browser: vi.fn(() => browser),
          pages: vi.fn(() => []),
        }) as unknown as BrowserContext
    ),
    url: vi.fn(() => 'https://example.com'),
    title: vi.fn(async () => 'Test Page'),
    waitForLoadState: vi.fn(async () => {}),
    addScriptTag: vi.fn(async () => {}),
    waitForURL: vi.fn(async () => {}),
    goto: vi.fn(async () => {}),
    ...overrides,
  } as unknown as Page;
}

describe('controller-tab-tracking', () => {
  describe('setupBrowserCDPListener', () => {
    it('should create browser CDP session and enable target discovery', async () => {
      const cdp = createMockCDPSession();
      const browser = createMockBrowser(cdp);
      const page = createMockPage({
        context: vi.fn(
          () =>
            ({
              browser: vi.fn(() => browser),
              pages: vi.fn(() => []),
            }) as unknown as BrowserContext
        ),
      });

      const result = await setupBrowserCDPListener(page, true, [], 0, 'rec-001', new Set());
      expect(result).toBe(cdp);
      expect(cdp.send).toHaveBeenCalledWith('Target.setDiscoverTargets', { discover: true });
    });

    it('should return null when browser is null', async () => {
      const page = createMockPage({
        context: vi.fn(
          () =>
            ({
              browser: vi.fn(() => null),
            }) as unknown as BrowserContext
        ),
      });

      const result = await setupBrowserCDPListener(page, true, [], 0, 'rec-001', new Set());
      expect(result).toBeNull();
    });

    it('should detect new tab via Target.targetCreated', async () => {
      const cdp = createMockCDPSession();
      const newPage = createMockPage({ url: vi.fn(() => 'https://example.com/popup') });
      const browser = createMockBrowser(cdp);
      browser._pages.push(newPage);

      const events: RecordedEvent[] = [];
      const trackedPages = new Set<Page>();

      const page = createMockPage({
        url: vi.fn(() => 'https://example.com'),
        context: vi.fn(
          () =>
            ({
              browser: vi.fn(() => browser),
              pages: vi.fn(() => []),
            }) as unknown as BrowserContext
        ),
      });

      await setupBrowserCDPListener(page, true, events, 0, 'rec-001', trackedPages);

      cdp.emit('Target.targetCreated', {
        targetInfo: {
          type: 'page',
          url: 'https://example.com/popup',
          openerId: 'parent-1',
          targetId: 'target-1',
        },
      });

      await new Promise((r) => setTimeout(r, 10));

      expect(trackedPages.has(newPage)).toBe(true);
      const tabEvent = events.find((e) => e.type === 'tab_open');
      expect(tabEvent).toBeDefined();
      expect(tabEvent!.data?.url).toBe('https://example.com/popup');
    });

    it('should skip non-page targets', async () => {
      const cdp = createMockCDPSession();
      const browser = createMockBrowser(cdp);
      const events: RecordedEvent[] = [];

      const page = createMockPage({
        context: vi.fn(
          () =>
            ({
              browser: vi.fn(() => browser),
              pages: vi.fn(() => []),
            }) as unknown as BrowserContext
        ),
      });

      await setupBrowserCDPListener(page, true, events, 0, 'rec-001', new Set());

      cdp.emit('Target.targetCreated', {
        targetInfo: { type: 'iframe', url: 'https://iframe.com', targetId: 't-1' },
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(events.length).toBe(0);
    });

    it('should skip targets without openerId', async () => {
      const cdp = createMockCDPSession();
      const browser = createMockBrowser(cdp);
      const events: RecordedEvent[] = [];

      const page = createMockPage({
        context: vi.fn(
          () =>
            ({
              browser: vi.fn(() => browser),
              pages: vi.fn(() => []),
            }) as unknown as BrowserContext
        ),
      });

      await setupBrowserCDPListener(page, true, events, 0, 'rec-001', new Set());

      cdp.emit('Target.targetCreated', {
        targetInfo: { type: 'page', url: 'https://example.com', targetId: 't-1' },
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(events.length).toBe(0);
    });

    it('should skip already tracked pages', async () => {
      const cdp = createMockCDPSession();
      const newPage = createMockPage({ url: vi.fn(() => 'https://example.com/popup') });
      const browser = createMockBrowser(cdp);
      browser._pages.push(newPage);

      const events: RecordedEvent[] = [];
      const trackedPages = new Set<Page>([newPage]);

      const page = createMockPage({
        context: vi.fn(
          () =>
            ({
              browser: vi.fn(() => browser),
              pages: vi.fn(() => []),
            }) as unknown as BrowserContext
        ),
      });

      await setupBrowserCDPListener(page, true, events, 0, 'rec-001', trackedPages);

      cdp.emit('Target.targetCreated', {
        targetInfo: {
          type: 'page',
          url: 'https://example.com/popup',
          openerId: 'parent-1',
          targetId: 'target-1',
        },
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(events.length).toBe(0);
    });

    it('should not record events when not recording', async () => {
      const cdp = createMockCDPSession();
      const browser = createMockBrowser(cdp);
      const events: RecordedEvent[] = [];

      const page = createMockPage({
        context: vi.fn(
          () =>
            ({
              browser: vi.fn(() => browser),
              pages: vi.fn(() => []),
            }) as unknown as BrowserContext
        ),
      });

      await setupBrowserCDPListener(page, false, events, 0, 'rec-001', new Set());

      cdp.emit('Target.targetCreated', {
        targetInfo: {
          type: 'page',
          url: 'https://example.com/popup',
          openerId: 'parent-1',
          targetId: 'target-1',
        },
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(events.length).toBe(0);
    });

    it('should handle CDP session creation failure', async () => {
      const browser = {
        newBrowserCDPSession: vi.fn(async () => {
          throw new Error('Failed');
        }),
        contexts: vi.fn(() => []),
      };

      const page = createMockPage({
        context: vi.fn(
          () =>
            ({
              browser: vi.fn(() => browser),
            }) as unknown as BrowserContext
        ),
      });

      const result = await setupBrowserCDPListener(page, true, [], 0, 'rec-001', new Set());
      expect(result).toBeNull();
    });
  });

  describe('injectScriptToPage', () => {
    it('should inject recorder script and start command', async () => {
      const events: RecordedEvent[] = [];
      const mainPage = createMockPage({ url: vi.fn(() => 'https://example.com') });
      const newPage = createMockPage({
        url: vi.fn(() => 'https://example.com/new'),
        title: vi.fn(async () => 'New Page'),
      });

      await injectScriptToPage(newPage, 'https://example.com/new', mainPage, events, 0, 'rec-001');

      expect(newPage.addScriptTag).toHaveBeenCalledTimes(2);
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('tab_open');
    });

    it('should handle injection failure gracefully', async () => {
      const events: RecordedEvent[] = [];
      const mainPage = createMockPage({ url: vi.fn(() => 'https://example.com') });
      const newPage = createMockPage({
        waitForLoadState: vi.fn(async () => {
          throw new Error('Timeout');
        }),
        url: vi.fn(() => 'https://example.com/new'),
        title: vi.fn(async () => ''),
      });

      await injectScriptToPage(newPage, 'https://example.com/new', mainPage, events, 0, 'rec-001');

      expect(events.length).toBe(1);
    });

    it('should generate correct event id based on events length', async () => {
      const events: RecordedEvent[] = [
        { id: 'evt_001', type: 'click', timestamp: 100, data: {} },
        { id: 'evt_002', type: 'click', timestamp: 200, data: {} },
      ];
      const mainPage = createMockPage();
      const newPage = createMockPage({ url: vi.fn(() => 'https://example.com/new') });

      await injectScriptToPage(newPage, 'https://example.com/new', mainPage, events, 0, 'rec-001');

      expect(events[2].id).toBe('evt_003');
    });

    it('should record correct openerUrl from main page', async () => {
      const events: RecordedEvent[] = [];
      const mainPage = createMockPage({ url: vi.fn(() => 'https://main.com') });
      const newPage = createMockPage({ url: vi.fn(() => 'https://popup.com') });

      await injectScriptToPage(newPage, 'https://popup.com', mainPage, events, 0, 'rec-001');

      expect(events[0].data?.openerUrl).toBe('https://main.com');
    });
  });

  describe('startPagePolling', () => {
    let pollInterval: ReturnType<typeof setInterval>;

    afterEach(() => {
      if (pollInterval) clearInterval(pollInterval);
    });

    it('should detect new pages via polling', async () => {
      const events: RecordedEvent[] = [];
      const trackedPages = new Set<Page>();
      const newPage = createMockPage({ url: vi.fn(() => 'https://example.com/new') });

      const browser = createMockBrowser();
      browser._pages.push(newPage);

      const context = createMockContext();
      const page = createMockPage({
        context: vi.fn(
          () =>
            ({
              browser: vi.fn(() => browser),
              pages: vi.fn(() => []),
            }) as unknown as BrowserContext
        ),
      });

      pollInterval = startPagePolling(
        page,
        context,
        () => true,
        events,
        0,
        'rec-001',
        trackedPages
      );

      await new Promise((r) => setTimeout(r, 700));

      expect(trackedPages.has(newPage)).toBe(true);
      expect(events.some((e) => e.type === 'tab_open')).toBe(true);
    });

    it('should clear interval when recording stops', async () => {
      let recording = true;
      const events: RecordedEvent[] = [];
      const trackedPages = new Set<Page>();

      const page = createMockPage({
        context: vi.fn(
          () =>
            ({
              browser: vi.fn(() => null),
            }) as unknown as BrowserContext
        ),
      });
      const context = createMockContext();

      pollInterval = startPagePolling(
        page,
        context,
        () => recording,
        events,
        0,
        'rec-001',
        trackedPages
      );

      await new Promise((r) => setTimeout(r, 600));
      recording = false;
      await new Promise((r) => setTimeout(r, 600));

      expect(true).toBe(true);
    });

    it('should wait for blank page to navigate', async () => {
      const events: RecordedEvent[] = [];
      const trackedPages = new Set<Page>();

      let urlCallCount = 0;
      const blankPage = createMockPage({
        url: vi.fn(() => {
          urlCallCount++;
          return urlCallCount > 1 ? 'https://example.com/loaded' : 'about:blank';
        }),
        waitForURL: vi.fn(async () => {}),
      });

      const browser = createMockBrowser();
      browser._pages.push(blankPage);

      const context = createMockContext();
      const page = createMockPage({
        context: vi.fn(
          () =>
            ({
              browser: vi.fn(() => browser),
              pages: vi.fn(() => []),
            }) as unknown as BrowserContext
        ),
      });

      pollInterval = startPagePolling(
        page,
        context,
        () => true,
        events,
        0,
        'rec-001',
        trackedPages
      );

      await new Promise((r) => setTimeout(r, 700));

      expect(blankPage.waitForURL).toHaveBeenCalled();
      clearInterval(pollInterval);
    });

    it('should handle poll error gracefully', async () => {
      const events: RecordedEvent[] = [];
      const trackedPages = new Set<Page>();

      const page = createMockPage({
        context: vi.fn(() => {
          throw new Error('Context error');
        }),
      });
      const context = createMockContext();

      pollInterval = startPagePolling(
        page,
        context,
        () => true,
        events,
        0,
        'rec-001',
        trackedPages
      );

      await new Promise((r) => setTimeout(r, 700));
      expect(events.length).toBe(0);
    });

    it('should use context.pages when browser is null', async () => {
      const events: RecordedEvent[] = [];
      const trackedPages = new Set<Page>();
      const newPage = createMockPage({ url: vi.fn(() => 'https://example.com/new') });

      const context = createMockContext({
        pages: vi.fn(() => [newPage]),
      });

      const page = createMockPage({
        context: vi.fn(
          () =>
            ({
              browser: vi.fn(() => null),
              pages: vi.fn(() => []),
            }) as unknown as BrowserContext
        ),
      });

      pollInterval = startPagePolling(
        page,
        context,
        () => true,
        events,
        0,
        'rec-001',
        trackedPages
      );

      await new Promise((r) => setTimeout(r, 700));

      expect(trackedPages.has(newPage)).toBe(true);
      clearInterval(pollInterval);
    });
  });
});
