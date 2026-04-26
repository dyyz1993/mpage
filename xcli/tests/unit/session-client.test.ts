import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TMP_SESSION_DIR = join(tmpdir(), 'xcli-test-session-client');
const TMP_DAEMON_CONFIG = join(TMP_SESSION_DIR, 'daemon.json');

vi.mock('../../src/core/constants', () => ({
  SESSION_DIR: TMP_SESSION_DIR,
  DAEMON_CONFIG_PATH: TMP_DAEMON_CONFIG,
  DAEMON_SOCKET_PATH: join(TMP_SESSION_DIR, 'daemon.sock'),
  DEFAULT_CHROMIUM_PATH: '/usr/bin/chromium',
}));

const mockFetch = vi.fn();

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

function setupDaemonConfig(port = 8054) {
  mkdirSync(TMP_SESSION_DIR, { recursive: true });
  writeFileSync(TMP_DAEMON_CONFIG, JSON.stringify({ port, pid: 12345 }));
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/sessions')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  });
  vi.stubGlobal('fetch', mockFetch);
}

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/sessions')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    return Promise.resolve({ ok, status, json: () => Promise.resolve(data) });
  });
}

describe('session-client', () => {
  beforeEach(() => {
    mkdirSync(TMP_SESSION_DIR, { recursive: true });
    mockFetch.mockReset();
  });

  afterEach(() => {
    if (existsSync(TMP_SESSION_DIR)) {
      rmSync(TMP_SESSION_DIR, { recursive: true, force: true });
    }
  });

  describe('requireSession', () => {
    it('throws when session file does not exist', async () => {
      const { requireSession } = await import('../../src/core/session-client');
      expect(() => requireSession('nonexistent')).toThrow("Session 'nonexistent' not found");
    });

    it('returns session name when file exists', async () => {
      const sessionFile = join(TMP_SESSION_DIR, 'default.json');
      writeFileSync(
        sessionFile,
        JSON.stringify({ id: '1', name: 'default', url: 'https://example.com' })
      );

      const { requireSession } = await import('../../src/core/session-client');
      expect(requireSession()).toBe('default');
    });
  });

  describe('getSession', () => {
    it('returns null when session does not exist', async () => {
      const { getSession } = await import('../../src/core/session-client');
      const result = await getSession('missing');
      expect(result).toBeNull();
    });

    it('returns session info when file exists', async () => {
      const sessionFile = join(TMP_SESSION_DIR, 'test.json');
      const sessionData = {
        id: 'abc',
        name: 'test',
        url: 'https://test.com',
        createdAt: '2025-01-01',
      };
      writeFileSync(sessionFile, JSON.stringify(sessionData));

      const { getSession } = await import('../../src/core/session-client');
      const result = await getSession('test');
      expect(result).toEqual(sessionData);
    });
  });

  describe('daemonRequest', () => {
    it('sends correct JSON-RPC request', async () => {
      setupDaemonConfig(8054);
      mockFetchResponse({ result: 'ok' });

      const { daemonRequest } = await import('../../src/core/session-client');
      const result = await daemonRequest('test.method', { key: 'value' });

      const rpcCall = mockFetch.mock.calls.find((c: string[]) => c[0]?.includes('/rpc'));
      expect(rpcCall).toBeDefined();
      expect(rpcCall![0]).toBe('http://localhost:8054/rpc');

      const callArgs = rpcCall?.[1];
      if (!callArgs) throw new Error('No RPC call captured');
      const body = JSON.parse(callArgs.body);
      expect(body).toEqual({ method: 'test.method', params: { key: 'value' } });
      expect(result).toEqual({ result: 'ok' });
    });

    it('throws on non-ok response', async () => {
      setupDaemonConfig(8054);
      mockFetchResponse({}, false, 500);

      const { daemonRequest } = await import('../../src/core/session-client');
      await expect(daemonRequest('bad.method')).rejects.toThrow('Request failed: 500');
    });

    it('throws when response contains error', async () => {
      setupDaemonConfig(8054);
      mockFetchResponse({ error: 'Something went wrong' });

      const { daemonRequest } = await import('../../src/core/session-client');
      await expect(daemonRequest('failing.method')).rejects.toThrow('Something went wrong');
    });
  });

  describe('listSessions', () => {
    it('returns sessions from daemon', async () => {
      const sessions = [
        { id: '1', name: 's1' },
        { id: '2', name: 's2' },
      ];
      setupDaemonConfig(8054);
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/sessions')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(sessions) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { listSessions } = await import('../../src/core/session-client');
      const result = await listSessions();
      expect(result).toEqual(sessions);
    });
  });

  describe('saveSession', () => {
    it('writes session file', async () => {
      const { saveSession, getSession } = await import('../../src/core/session-client');
      const session = {
        id: 'x1',
        name: 'save-test',
        url: 'https://save.com',
        createdAt: '2025-01-01',
      };
      await saveSession(session);

      const loaded = await getSession('save-test');
      expect(loaded).toEqual(session);
    });
  });
});
