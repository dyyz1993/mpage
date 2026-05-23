import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockLaunch, mockExecutePageCommand } = vi.hoisted(() => {
  const mockLaunch = vi.fn().mockResolvedValue({
    newContext: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        goto: vi.fn().mockResolvedValue(undefined),
        url: vi.fn().mockReturnValue('https://example.com'),
        evaluate: vi.fn().mockResolvedValue({ status: 200, ok: true, data: {} }),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
    close: vi.fn().mockResolvedValue(undefined),
  });
  const mockExecutePageCommand = vi.fn().mockResolvedValue({ ok: true });
  return { mockLaunch, mockExecutePageCommand };
});

vi.mock('playwright', () => ({
  chromium: { launch: mockLaunch },
}));

vi.mock('@dyyz1993/xpage', () => ({
  executePageCommand: (...args: unknown[]) => mockExecutePageCommand(...args),
  RecorderController: vi.fn().mockImplementation(function (this: unknown) {
    this.start = vi.fn().mockResolvedValue(undefined);
    this.stop = vi.fn().mockResolvedValue({ path: '/tmp/test.yaml', session: { events: [] } });
    this.getStatus = vi.fn().mockReturnValue({ recording: true });
    this.id = 'rec-123';
    return this;
  }),
  PlaybackEngine: {
    fromFile: vi.fn().mockResolvedValue({
      play: vi.fn().mockResolvedValue({ success: true }),
    }),
  },
}));

vi.mock('@dyyz1993/xcli-core', () => ({
  ok: (data: unknown) => data,
}));

import { BrowserWorker, routeCommand, getBrowser } from '../../src/daemon/browser-worker.js';
import { sessions, findSession } from '../../src/daemon/worker-session-ops.js';

describe('BrowserWorker', () => {
  let worker: BrowserWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    sessions.clear();
    worker = new BrowserWorker();
  });

  afterEach(async () => {
    await worker.destroy();
  });

  describe('init()', () => {
    it('should launch browser on init', async () => {
      await worker.init({} as never);
      expect(mockLaunch).toHaveBeenCalled();
    });
  });

  describe('execute()', () => {
    it('should route session.create command', async () => {
      await worker.init({} as never);
      const result = await worker.execute('session.create', {
        sessionId: 's1',
        name: 'test',
        url: 'https://example.com',
      });
      expect(result).toEqual({ id: 's1', name: 'test' });
    });

    it('should route session.list command', async () => {
      await worker.init({} as never);
      await worker.execute('session.create', {
        sessionId: 's1',
        name: 'test',
        url: 'https://example.com',
      });
      const result = await worker.execute('session.list', {});
      expect(result).toEqual({ sessions: [{ id: 's1', name: 'test' }] });
    });

    it('should route session.close command', async () => {
      await worker.init({} as never);
      await worker.execute('session.create', {
        sessionId: 's1',
        name: 'test',
        url: 'https://example.com',
      });
      const result = await worker.execute('session.close', { name: 'test' });
      expect(result).toEqual({ ok: true });
    });

    it('should route session.closeAll command', async () => {
      await worker.init({} as never);
      await worker.execute('session.create', {
        sessionId: 's1',
        name: 'test1',
        url: 'https://example.com',
      });
      const result = await worker.execute('session.closeAll', {});
      expect(result).toEqual({ ok: true });
      expect(sessions.size).toBe(0);
    });

    it('should throw for unknown method', async () => {
      await expect(worker.execute('unknown.method', {})).rejects.toThrow('Unknown method');
    });

    it('should treat session.open as alias for session.create', async () => {
      await worker.init({} as never);
      const result = await worker.execute('session.open', {
        sessionId: 's-open',
        name: 'open-test',
        url: 'https://example.com',
      });
      expect(result).toEqual({ id: 's-open', name: 'open-test' });
      expect(sessions.has('s-open')).toBe(true);
    });

    it('should generate UUID sessionId when not provided in session.create', async () => {
      await worker.init({} as never);
      const result = await worker.execute('session.create', {
        name: 'no-id',
        url: 'https://example.com',
      });
      const typed = result as { id: string; name: string };
      expect(typed.name).toBe('no-id');
      expect(typed.id).toBeUndefined();
    });
  });

  describe('destroy()', () => {
    it('should close browser and clear sessions', async () => {
      await worker.init({} as never);
      await worker.execute('session.create', {
        sessionId: 's1',
        name: 'test',
        url: 'https://example.com',
      });
      await worker.destroy();
      expect(sessions.size).toBe(0);
    });
  });
});

describe('routeCommand - recorder commands', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessions.clear();
    await getBrowser();
  });

  afterEach(async () => {
    const w = new BrowserWorker();
    await w.destroy();
  });

  it('should start recorder', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('recorder.start', { name: 'test' });
    expect(result).toMatchObject({ ok: true, recordingId: 'rec-123' });
  });

  it('should throw if session not found for recorder.start', async () => {
    await expect(routeCommand('recorder.start', { name: 'nonexistent' })).rejects.toThrow(
      'Session not found'
    );
  });

  it('should return status null when no recorder active', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('recorder.status', { name: 'test' });
    expect(result).toEqual({ ok: true, status: null });
  });

  it('should stop recorder', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    await routeCommand('recorder.start', { name: 'test' });
    const result = await routeCommand('recorder.stop', { name: 'test' });
    expect(result).toMatchObject({ ok: true });
  });

  it('should throw if no active recorder for recorder.stop', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    await expect(routeCommand('recorder.stop', { name: 'test' })).rejects.toThrow(
      'No active recorder'
    );
  });
});

describe('routeCommand - replay commands', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessions.clear();
    await getBrowser();
  });

  afterEach(async () => {
    const w = new BrowserWorker();
    await w.destroy();
  });

  it('should start replay', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('replay.start', { name: 'test', filePath: '/tmp/rec.yaml' });
    expect(result).toMatchObject({ ok: true });
  });

  it('should throw if session not found for replay', async () => {
    await expect(
      routeCommand('replay.start', { name: 'nonexistent', filePath: '/tmp/rec.yaml' })
    ).rejects.toThrow('Session not found');
  });
});

describe('routeCommand - direct page commands', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessions.clear();
    await getBrowser();
  });

  afterEach(async () => {
    const w = new BrowserWorker();
    await w.destroy();
  });

  it('should handle page.snapshot', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    await routeCommand('page.snapshot', { name: 'test' });
    expect(mockExecutePageCommand).toHaveBeenCalled();
  });

  it('should return error for missing session in page.snapshot', async () => {
    const result = await routeCommand('page.snapshot', { name: 'nonexistent' });
    expect(result).toEqual({ ok: false, error: 'Session not found' });
  });

  it('should handle page.get with url property', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('page.get', { name: 'test', property: 'url' });
    expect(result).toMatchObject({ ok: true, property: 'url' });
  });

  it('should handle page.get with title property', async () => {
    mockExecutePageCommand.mockResolvedValueOnce({ title: 'Test Page' });
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('page.get', { name: 'test', property: 'title' });
    expect(result).toMatchObject({ ok: true, property: 'title', value: 'Test Page' });
  });

  it('should handle page.navigate back', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('page.navigate', { name: 'test', direction: 'back' });
    expect(result).toEqual({ ok: true, direction: 'back' });
  });

  it('should handle page.navigate forward', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('page.navigate', { name: 'test', direction: 'forward' });
    expect(result).toEqual({ ok: true, direction: 'forward' });
  });

  it('should handle page.addCookie', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('page.addCookie', {
      name: 'test',
      cookie: { name: 'token', value: 'abc' },
    });
    expect(result).toMatchObject({ ok: true });
  });

  it('should handle generic page.* commands via executePageCommand', async () => {
    mockExecutePageCommand.mockResolvedValueOnce({ clicked: true });
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('page.click', { name: 'test', selector: '#btn' });
    expect(result).toMatchObject({ ok: true, clicked: true });
  });
});

describe('routeCommand - storage commands', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessions.clear();
    await getBrowser();
  });

  afterEach(async () => {
    const w = new BrowserWorker();
    await w.destroy();
  });

  it('should get cookies', async () => {
    mockExecutePageCommand.mockResolvedValueOnce({ cookies: [{ name: 'test', value: '123' }] });
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('storage.get', { name: 'test', type: 'cookies' });
    expect(result).toBeDefined();
  });

  it('should return empty cookies when session not found', async () => {
    const result = await routeCommand('storage.get', { name: 'nonexistent', type: 'cookies' });
    expect(result).toEqual({ cookies: [] });
  });

  it('should set cookies', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('storage.set', {
      name: 'test',
      type: 'cookies',
      data: { name: 'token', value: 'abc' },
    });
    expect(result).toEqual({ ok: true });
  });

  it('should clear cookies', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('storage.clear', { name: 'test', type: 'cookies' });
    expect(result).toEqual({ ok: true });
  });

  it('should get localStorage', async () => {
    mockExecutePageCommand.mockResolvedValueOnce({ data: { key1: 'val1' } });
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('storage.get', { name: 'test', type: 'localStorage' });
    expect(result).toEqual({ localStorage: { key1: 'val1' } });
  });

  it('should set localStorage', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('storage.set', {
      name: 'test',
      type: 'localStorage',
      key: 'token',
      value: 'abc',
    });
    expect(result).toEqual({ ok: true });
  });

  it('should clear localStorage', async () => {
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const result = await routeCommand('storage.clear', { name: 'test', type: 'localStorage' });
    expect(result).toEqual({ ok: true });
  });

  it('should return empty localStorage when session not found', async () => {
    const result = await routeCommand('storage.get', { name: 'nonexistent', type: 'localStorage' });
    expect(result).toEqual({ localStorage: {} });
  });
});

describe('findSession', () => {
  it('should find session by name', async () => {
    sessions.clear();
    await getBrowser();
    await routeCommand('session.create', {
      sessionId: 's1',
      name: 'test',
      url: 'https://example.com',
    });
    const session = findSession('test');
    expect(session).toBeDefined();
    expect(session?.name).toBe('test');
  });

  it('should return undefined for nonexistent session', () => {
    sessions.clear();
    expect(findSession('nonexistent')).toBeUndefined();
  });
});
