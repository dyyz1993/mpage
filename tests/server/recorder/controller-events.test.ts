import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerActiveRecorder,
  unregisterActiveRecorder,
  markContextInitialized,
  isContextInitialized,
  deleteContextInit,
  setupRouteInterception,
  setupCDPNavigationListener,
  createNavigationHandler,
  createPageHandler,
  activeRecorders,
  initializedContexts,
} from '../../../src/server/recorder/controller-events.js';
import type { Page, BrowserContext, CDPSession, Frame } from 'playwright-core';
import type { RecordedEvent } from '../../../src/server/recorder/types.js';

function createMockRoute() {
  return {
    request: vi.fn(() => ({
      postData: vi.fn(() => null),
    })),
    fulfill: vi.fn(async () => {}),
  };
}

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

function createMockFrame(overrides: Partial<Frame> = {}): Frame {
  return {
    url: vi.fn(() => 'https://example.com'),
    title: vi.fn(async () => 'Test Page'),
    ...overrides,
  } as unknown as Frame;
}

function createMockContext(overrides: Partial<BrowserContext> = {}): BrowserContext {
  const cdp = createMockCDPSession();
  return {
    route: vi.fn(async () => {}),
    newCDPSession: vi.fn(async () => cdp),
    on: vi.fn(),
    off: vi.fn(),
    pages: vi.fn(() => []),
    browser: vi.fn(() => null),
    ...overrides,
  } as unknown as BrowserContext;
}

function createMockPage(overrides: Partial<Page> = {}): Page {
  const mainFrame = createMockFrame();
  return {
    context: vi.fn(() => createMockContext()),
    url: vi.fn(() => 'https://example.com'),
    title: vi.fn(async () => 'Test Page'),
    mainFrame: vi.fn(() => mainFrame),
    waitForLoadState: vi.fn(async () => {}),
    addScriptTag: vi.fn(async () => {}),
    goto: vi.fn(async () => {}),
    ...overrides,
  } as unknown as Page;
}

describe('controller-events', () => {
  let testModule: typeof import('../../../src/server/recorder/controller-events.js');

  beforeEach(async () => {
    testModule = await import('../../../src/server/recorder/controller-events.js');
    activeRecorders.clear();
  });

  describe('registerActiveRecorder / unregisterActiveRecorder', () => {
    it('should register and retrieve a recorder', () => {
      const events: RecordedEvent[] = [];
      registerActiveRecorder('rec-001', events, {});
      expect(activeRecorders.has('rec-001')).toBe(true);
      expect(activeRecorders.get('rec-001')?.events).toBe(events);
    });

    it('should unregister a recorder', () => {
      registerActiveRecorder('rec-001', [], {});
      unregisterActiveRecorder('rec-001');
      expect(activeRecorders.has('rec-001')).toBe(false);
    });

    it('should handle unregistering non-existent recorder', () => {
      expect(() => unregisterActiveRecorder('non-existent')).not.toThrow();
    });

    it('should allow multiple recorders', () => {
      registerActiveRecorder('rec-001', [], {});
      registerActiveRecorder('rec-002', [], {});
      expect(activeRecorders.size).toBe(2);
    });
  });

  describe('markContextInitialized / isContextInitialized / deleteContextInit', () => {
    it('should mark context as initialized', () => {
      const ctx = createMockContext();
      markContextInitialized(ctx);
      expect(isContextInitialized(ctx)).toBe(true);
    });

    it('should return false for uninitialized context', () => {
      const ctx = createMockContext();
      expect(isContextInitialized(ctx)).toBe(false);
    });

    it('should delete context init state', () => {
      const ctx = createMockContext();
      markContextInitialized(ctx);
      deleteContextInit(ctx);
      expect(isContextInitialized(ctx)).toBe(false);
    });
  });

  describe('setupRouteInterception', () => {
    it('should set up route interception on context', async () => {
      const ctx = createMockContext();
      await setupRouteInterception(ctx);
      expect(ctx.route).toHaveBeenCalledWith('**/__mpage_record_event__', expect.any(Function));
    });

    it('should mark context as initialized after setup', async () => {
      const ctx = createMockContext();
      await setupRouteInterception(ctx);
      expect(isContextInitialized(ctx)).toBe(true);
    });

    it('should not set up route twice for same context', async () => {
      const ctx = createMockContext();
      await setupRouteInterception(ctx);
      await setupRouteInterception(ctx);
      expect(ctx.route).toHaveBeenCalledTimes(1);
    });

    it('should push event to active recorder when body contains recordingId', async () => {
      const events: RecordedEvent[] = [];
      registerActiveRecorder('rec-001', events, {});

      let routeHandler: Function | undefined;
      const ctx = createMockContext({
        route: vi.fn(async (_pattern: string, handler: Function) => {
          routeHandler = handler;
        }),
      });

      await setupRouteInterception(ctx);
      expect(routeHandler).toBeDefined();

      const route = {
        request: vi.fn(() => ({
          postData: vi.fn(() =>
            JSON.stringify({
              type: 'click',
              recordingId: 'rec-001',
            })
          ),
        })),
        fulfill: vi.fn(async () => {}),
      };

      await routeHandler!(route);
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('click');
    });

    it('should fulfill route with success response', async () => {
      const ctx = createMockContext({
        route: vi.fn(async (_pattern: string, handler: Function) => {
          const route = {
            request: vi.fn(() => ({ postData: vi.fn(() => null) })),
            fulfill: vi.fn(async () => {}),
          };
          await handler(route);
        }),
      });

      await setupRouteInterception(ctx);
    });
  });

  describe('setupCDPNavigationListener', () => {
    it('should create CDP session and enable Page domain', async () => {
      const cdp = createMockCDPSession();
      const ctx = createMockContext({
        newCDPSession: vi.fn(async () => cdp),
      });
      const page = createMockPage({ context: vi.fn(() => ctx) });

      const result = await setupCDPNavigationListener(page, true, [], 0);
      expect(result).toBe(cdp);
      expect(cdp.send).toHaveBeenCalledWith('Page.enable');
    });

    it('should record navigation event for main frame', async () => {
      const cdp = createMockCDPSession();
      const ctx = createMockContext({
        newCDPSession: vi.fn(async () => cdp),
      });
      const events: RecordedEvent[] = [];
      const page = createMockPage({
        context: vi.fn(() => ctx),
        url: vi.fn(() => 'https://example.com/page2'),
      });

      const result = await setupCDPNavigationListener(page, true, events, 1000);
      expect(result).toBe(cdp);

      cdp.emit('Page.frameNavigated', {
        frame: { id: 'frame-1', url: 'https://example.com/page2' },
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('navigation');
      expect(events[0].data?.url).toBe('https://example.com/page2');
      expect(events[0].data?.source).toBe('cdp');
    });

    it('should skip sub-frame navigations', async () => {
      const cdp = createMockCDPSession();
      const ctx = createMockContext({
        newCDPSession: vi.fn(async () => cdp),
      });
      const events: RecordedEvent[] = [];
      const page = createMockPage({ context: vi.fn(() => ctx) });

      await setupCDPNavigationListener(page, true, events, 0);

      cdp.emit('Page.frameNavigated', {
        frame: { id: 'frame-2', url: 'https://iframe.com', parentId: 'parent-1' },
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(events.length).toBe(0);
    });

    it('should not record when isRecordingFlag is false', async () => {
      const cdp = createMockCDPSession();
      const ctx = createMockContext({
        newCDPSession: vi.fn(async () => cdp),
      });
      const events: RecordedEvent[] = [];
      const page = createMockPage({ context: vi.fn(() => ctx) });

      await setupCDPNavigationListener(page, false, events, 0);

      cdp.emit('Page.frameNavigated', {
        frame: { id: 'frame-1', url: 'https://example.com/page2' },
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(events.length).toBe(0);
    });

    it('should return null on CDP session creation failure', async () => {
      const ctx = createMockContext({
        newCDPSession: vi.fn(async () => {
          throw new Error('CDP failed');
        }),
      });
      const page = createMockPage({ context: vi.fn(() => ctx) });

      const result = await setupCDPNavigationListener(page, true, [], 0);
      expect(result).toBeNull();
    });
  });

  describe('createNavigationHandler', () => {
    it('should skip non-main frame navigation', async () => {
      const events: RecordedEvent[] = [];
      const subFrame = createMockFrame();
      const mainFrame = createMockFrame();
      const page = createMockPage({ mainFrame: vi.fn(() => mainFrame) });

      const handler = createNavigationHandler(page, () => true, events, 0, 'rec-001');
      await handler(subFrame);
      expect(events.length).toBe(0);
    });

    it('should record navigation event for main frame', async () => {
      const events: RecordedEvent[] = [];
      const frame = createMockFrame({ url: vi.fn(() => 'https://example.com/page2') });
      const page = createMockPage({ mainFrame: vi.fn(() => frame) });

      const handler = createNavigationHandler(page, () => true, events, 0, 'rec-001');
      await handler(frame);

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].type).toBe('navigation');
      expect(events[0].data?.url).toBe('https://example.com/page2');
    });

    it('should skip duplicate navigation within 1 second', async () => {
      const now = Date.now();
      const events: RecordedEvent[] = [
        {
          id: 'evt_001',
          type: 'navigation',
          timestamp: now - 500,
          data: { url: 'https://example.com/page2' },
        },
      ];
      const frame = createMockFrame({ url: vi.fn(() => 'https://example.com/page2') });
      const page = createMockPage({ mainFrame: vi.fn(() => frame) });

      const handler = createNavigationHandler(page, () => true, events, now - 1000, 'rec-001');
      await handler(frame);

      expect(events.length).toBe(1);
    });

    it('should not record when not recording', async () => {
      const events: RecordedEvent[] = [];
      const frame = createMockFrame();
      const page = createMockPage({ mainFrame: vi.fn(() => frame) });

      const handler = createNavigationHandler(page, () => false, events, 0, 'rec-001');
      await handler(frame);

      expect(events.length).toBe(0);
    });

    it('should record page_load event after navigation', async () => {
      const events: RecordedEvent[] = [];
      const frame = createMockFrame({
        url: vi.fn(() => 'https://example.com/page3'),
        title: vi.fn(async () => 'Page 3'),
      });
      const page = createMockPage({ mainFrame: vi.fn(() => frame) });

      const handler = createNavigationHandler(page, () => true, events, 0, 'rec-001');
      await handler(frame);

      const pageLoadEvent = events.find((e) => e.type === 'page_load');
      expect(pageLoadEvent).toBeDefined();
      expect(pageLoadEvent!.data?.url).toBe('https://example.com/page3');
    });
  });

  describe('createPageHandler', () => {
    it('should track new page and record tab_open event', async () => {
      const events: RecordedEvent[] = [];
      const trackedPages = new Set<Page>();
      const page = createMockPage({ url: vi.fn(() => 'https://example.com') });
      const newPage = createMockPage({
        url: vi.fn(() => 'https://example.com/popup'),
        title: vi.fn(async () => 'Popup'),
      });

      const handler = createPageHandler(page, () => true, events, 0, 'rec-001', trackedPages);
      await handler(newPage);

      expect(trackedPages.has(newPage)).toBe(true);
      const tabEvent = events.find((e) => e.type === 'tab_open');
      expect(tabEvent).toBeDefined();
      expect(tabEvent!.data?.url).toBe('https://example.com/popup');
      expect(tabEvent!.data?.openerUrl).toBe('https://example.com');
    });

    it('should not track page when not recording', async () => {
      const events: RecordedEvent[] = [];
      const trackedPages = new Set<Page>();
      const page = createMockPage();
      const newPage = createMockPage();

      const handler = createPageHandler(page, () => false, events, 0, 'rec-001', trackedPages);
      await handler(newPage);

      expect(trackedPages.size).toBe(0);
      expect(events.length).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const events: RecordedEvent[] = [];
      const trackedPages = new Set<Page>();
      const page = createMockPage();
      const newPage = createMockPage({
        waitForLoadState: vi.fn(async () => {
          throw new Error('Page crashed');
        }),
      });

      const handler = createPageHandler(page, () => true, events, 0, 'rec-001', trackedPages);
      await expect(handler(newPage)).resolves.not.toThrow();
      expect(trackedPages.has(newPage)).toBe(true);
    });

    it('should generate correct event id', async () => {
      const events: RecordedEvent[] = [{ id: 'evt_001', type: 'click', timestamp: 100, data: {} }];
      const trackedPages = new Set<Page>();
      const page = createMockPage();
      const newPage = createMockPage({ url: vi.fn(() => 'https://example.com/new') });

      const handler = createPageHandler(page, () => true, events, 0, 'rec-001', trackedPages);
      await handler(newPage);

      expect(events[1].id).toBe('evt_002');
    });
  });
});
