import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('../../src/index.js', () => ({
  loadSessionInfo: vi.fn(),
  deleteSessionInfo: vi.fn(),
  isProcessRunning: vi.fn(),
  getSocketPath: vi.fn(),
  tip: vi.fn(),
}));

import { startServer, getOrCreateSession } from '../../src/client/session-manager.js';
import { spawn } from 'child_process';
import {
  loadSessionInfo,
  deleteSessionInfo,
  isProcessRunning,
  getSocketPath,
  tip,
} from '../../src/index.js';
import type { SessionInfo } from '../../src/types.js';

function createSessionInfo(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    name: 'default',
    cdpEndpoint: '',
    pid: process.pid,
    serverPid: 12345,
    socketPath: '/tmp/mpage-default.sock',
    isCDP: false,
    createdAt: Date.now(),
    lastUsed: Date.now(),
    ...overrides,
  };
}

async function advanceTimers(ms: number, step = 500) {
  const iterations = Math.ceil(ms / step);
  for (let i = 0; i < iterations; i++) {
    await vi.advanceTimersByTimeAsync(step);
  }
}

describe('startServer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return session info when server starts successfully', async () => {
    const mockProcess = { unref: vi.fn() };
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue(mockProcess);

    const info = createSessionInfo();
    (loadSessionInfo as ReturnType<typeof vi.fn>).mockReturnValue(info);
    (isProcessRunning as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (getSocketPath as ReturnType<typeof vi.fn>).mockReturnValue('/tmp/mpage-default.sock');

    const promise = startServer('/path/to/server.ts', 'default');
    await advanceTimers(1000);
    const result = await promise;

    expect(result).toStrictEqual(info);
    expect(spawn).toHaveBeenCalledWith(
      'tsx',
      ['/path/to/server.ts', 'default'],
      expect.objectContaining({ detached: true, stdio: 'ignore' })
    );
  });

  it('should pass cdpEndpoint as third argument', async () => {
    const mockProcess = { unref: vi.fn() };
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue(mockProcess);

    (loadSessionInfo as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const promise = startServer('/path/to/server.ts', 'default', 'ws://localhost:9222');
    await advanceTimers(16000);
    const result = await promise;

    expect(spawn).toHaveBeenCalledWith(
      'tsx',
      ['/path/to/server.ts', 'default', 'ws://localhost:9222'],
      expect.anything()
    );
    expect(result).toBeNull();
  });

  it('should return null when server fails to start within timeout', async () => {
    const mockProcess = { unref: vi.fn() };
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue(mockProcess);

    (loadSessionInfo as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const promise = startServer('/path/to/server.ts', 'default');
    await advanceTimers(16000);
    const result = await promise;

    expect(result).toBeNull();
  });

  it('should return null when process is not running', async () => {
    const mockProcess = { unref: vi.fn() };
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue(mockProcess);

    (loadSessionInfo as ReturnType<typeof vi.fn>).mockReturnValue(createSessionInfo());
    (isProcessRunning as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const promise = startServer('/path/to/server.ts', 'default');
    await advanceTimers(16000);
    const result = await promise;

    expect(result).toBeNull();
  });
});

describe('getOrCreateSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return existing session if alive with socket', async () => {
    const info = createSessionInfo();
    (loadSessionInfo as ReturnType<typeof vi.fn>).mockReturnValue(info);
    (isProcessRunning as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (getSocketPath as ReturnType<typeof vi.fn>).mockReturnValue('/tmp/mpage-default.sock');

    const result = await getOrCreateSession('/path/to/server.ts', 'default');
    expect(result).toStrictEqual({ socketPath: '/tmp/mpage-default.sock', info });
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should rebuild session if process is dead', async () => {
    const oldInfo = createSessionInfo();
    const newInfo = createSessionInfo({ serverPid: 99999 });
    let loadCount = 0;
    (loadSessionInfo as ReturnType<typeof vi.fn>).mockImplementation(() => {
      loadCount++;
      if (loadCount <= 1) return oldInfo;
      return newInfo;
    });
    (isProcessRunning as ReturnType<typeof vi.fn>).mockImplementation((pid: number) => {
      return pid === 99999;
    });
    (deleteSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (getSocketPath as ReturnType<typeof vi.fn>).mockReturnValue('/tmp/mpage-default.sock');
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue({ unref: vi.fn() });

    const promise = getOrCreateSession('/path/to/server.ts', 'default');
    await advanceTimers(1000);
    const result = await promise;

    expect(result?.info.serverPid).toBe(99999);
    expect(deleteSessionInfo).toHaveBeenCalledWith('default');
  });

  it('should tip when CDP session matches endpoint', async () => {
    const info = createSessionInfo({ isCDP: true, cdpEndpoint: 'ws://localhost:9222' });
    (loadSessionInfo as ReturnType<typeof vi.fn>).mockReturnValue(info);
    (isProcessRunning as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (getSocketPath as ReturnType<typeof vi.fn>).mockReturnValue('/tmp/mpage-default.sock');

    const result = await getOrCreateSession('/path/to/server.ts', 'default', 'ws://localhost:9222');
    expect(result).not.toBeNull();
    expect(tip).toHaveBeenCalledWith(expect.stringContaining('无需重复指定'));
  });

  it('should tip when CDP session has different endpoint', async () => {
    const info = createSessionInfo({ isCDP: true, cdpEndpoint: 'ws://localhost:9222' });
    (loadSessionInfo as ReturnType<typeof vi.fn>).mockReturnValue(info);
    (isProcessRunning as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (getSocketPath as ReturnType<typeof vi.fn>).mockReturnValue('/tmp/mpage-default.sock');

    const result = await getOrCreateSession('/path/to/server.ts', 'default', 'ws://other:9222');
    expect(result).not.toBeNull();
    expect(tip).toHaveBeenCalledWith(expect.stringContaining('其他 CDP'));
  });

  it('should tip when session is not CDP but cdpEndpoint given', async () => {
    const info = createSessionInfo({ isCDP: false });
    (loadSessionInfo as ReturnType<typeof vi.fn>).mockReturnValue(info);
    (isProcessRunning as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (getSocketPath as ReturnType<typeof vi.fn>).mockReturnValue('/tmp/mpage-default.sock');

    const result = await getOrCreateSession('/path/to/server.ts', 'default', 'ws://localhost:9222');
    expect(result).not.toBeNull();
    expect(tip).toHaveBeenCalledWith(expect.stringContaining('不是 CDP session'));
  });

  it('should create new session when no existing session', async () => {
    (loadSessionInfo as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue({ unref: vi.fn() });

    const promise = getOrCreateSession('/path/to/server.ts', 'new-session');
    await advanceTimers(16000);
    const result = await promise;

    expect(result).toBeNull();
    expect(spawn).toHaveBeenCalled();
  });

  it('should return null when socket path not available after start', async () => {
    let loadCount = 0;
    (loadSessionInfo as ReturnType<typeof vi.fn>).mockImplementation(() => {
      loadCount++;
      if (loadCount === 1) return null;
      return createSessionInfo();
    });
    (isProcessRunning as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (getSocketPath as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue({ unref: vi.fn() });

    const promise = getOrCreateSession('/path/to/server.ts', 'default');
    await advanceTimers(16000);
    const result = await promise;

    expect(result).toBeNull();
  });
});
