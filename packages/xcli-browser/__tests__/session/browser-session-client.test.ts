import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDaemonRpc = vi.fn().mockResolvedValue({ ok: true });

vi.mock('@dyyz1993/xcli-core', () => ({
  SESSION_DIR: '/tmp/test-xcli-sessions',
  daemonRpc: (...args: unknown[]) => mockDaemonRpc(...args),
}));

vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-1234'),
}));

import {
  openSession,
  refreshSession,
  scrollSession,
  listSessions,
  daemonRequest,
} from '../../src/session/browser-session-client.js';

describe('browser-session-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('openSession', () => {
    it('should call daemonRpc with session.create (not session.open)', async () => {
      mockDaemonRpc.mockResolvedValueOnce({});
      await openSession('test', 'https://example.com');

      expect(mockDaemonRpc).toHaveBeenCalledTimes(1);
      const [config, method, params] = mockDaemonRpc.mock.calls[0];
      expect(method).toBe('session.create');
    });

    it('should pass sessionId as UUID', async () => {
      mockDaemonRpc.mockResolvedValueOnce({});
      await openSession('test', 'https://example.com');

      const params = mockDaemonRpc.mock.calls[0][2] as Record<string, unknown>;
      expect(params.sessionId).toBe('test-uuid-1234');
      expect(params.name).toBe('test');
      expect(params.url).toBe('https://example.com');
    });
  });

  describe('refreshSession', () => {
    it('should call page.reload (not page.refresh)', async () => {
      mockDaemonRpc.mockResolvedValueOnce({ ok: true });
      const result = await refreshSession('test');

      const method = mockDaemonRpc.mock.calls[0][1];
      expect(method).toBe('page.reload');
    });
  });

  describe('scrollSession', () => {
    it('should pass deltaY for scroll down', async () => {
      mockDaemonRpc.mockResolvedValueOnce({ ok: true });
      await scrollSession('test', 'down', 300);

      const params = mockDaemonRpc.mock.calls[0][2] as Record<string, unknown>;
      expect(params.deltaY).toBe(300);
      expect(params.deltaX).toBe(0);
    });

    it('should pass negative deltaY for scroll up', async () => {
      mockDaemonRpc.mockResolvedValueOnce({ ok: true });
      await scrollSession('test', 'up', 500);

      const params = mockDaemonRpc.mock.calls[0][2] as Record<string, unknown>;
      expect(params.deltaY).toBe(-500);
    });

    it('should default distance to 500', async () => {
      mockDaemonRpc.mockResolvedValueOnce({ ok: true });
      await scrollSession('test', 'down');

      const params = mockDaemonRpc.mock.calls[0][2] as Record<string, unknown>;
      expect(params.deltaY).toBe(500);
    });
  });

  describe('listSessions', () => {
    it('should return empty array when daemon not running', async () => {
      const { existsSync } = await import('fs');
      (existsSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

      const result = await listSessions();
      expect(result).toStrictEqual([]);
    });
  });

  describe('daemonRequest', () => {
    it('should forward method and params to daemonRpc', async () => {
      mockDaemonRpc.mockResolvedValueOnce({ ok: true });
      await daemonRequest('page.goto', { url: 'https://example.com' });

      expect(mockDaemonRpc).toHaveBeenCalledWith(expect.anything(), 'page.goto', {
        url: 'https://example.com',
      });
    });
  });
});
