import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('../../../src/daemon/ws-server.js', () => {
  return {
    WSServer: vi.fn().mockImplementation(function (this: unknown) {
      (this as Record<string, unknown>).start = vi.fn().mockResolvedValue(undefined);
      (this as Record<string, unknown>).stop = vi.fn().mockResolvedValue(undefined);
      return this;
    }),
  };
});

import { spawn } from 'child_process';
import {
  isDaemonRunning,
  getDaemonStatus,
  killAllDaemon,
  startDaemon,
  stopDaemon,
  startWSServer,
  stopWSServer,
} from '../../../src/daemon/daemon-manager.js';

function makeConfig(dir: string) {
  return { configDir: dir, workerEntryPath: '/fake/worker.ts' };
}

describe('daemon-manager', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'dm-test-'));
    vi.mocked(spawn).mockReset();
  });

  afterEach(async () => {
    await stopWSServer();
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
  });

  describe('isDaemonRunning()', () => {
    it('returns false when no config file exists', () => {
      expect(isDaemonRunning(makeConfig(tmpDir))).toBe(false);
    });

    it('returns false and cleans config when pid is stale', () => {
      const configPath = join(tmpDir, 'daemon.json');
      writeFileSync(configPath, JSON.stringify({ port: 8054, pid: 9999999, startedAt: 1 }));
      expect(isDaemonRunning(makeConfig(tmpDir))).toBe(false);
      expect(existsSync(configPath)).toBe(false);
    });

    it('returns false when config file has no port', () => {
      const configPath = join(tmpDir, 'daemon.json');
      writeFileSync(configPath, JSON.stringify({ pid: 9999999 }));
      expect(isDaemonRunning(makeConfig(tmpDir))).toBe(false);
    });

    it('returns false when config file is invalid JSON', () => {
      const configPath = join(tmpDir, 'daemon.json');
      writeFileSync(configPath, 'not-json');
      expect(isDaemonRunning(makeConfig(tmpDir))).toBe(false);
    });
  });

  describe('getDaemonStatus()', () => {
    it('returns running:false with zero port/pid when no config', () => {
      const status = getDaemonStatus(makeConfig(tmpDir));
      expect(status).toEqual({ running: false, port: 0, pid: 0 });
    });

    it('returns port and pid from config file', () => {
      const configPath = join(tmpDir, 'daemon.json');
      writeFileSync(configPath, JSON.stringify({ port: 9000, pid: 9999999 }));
      const status = getDaemonStatus(makeConfig(tmpDir));
      expect(status.port).toBe(9000);
      expect(status.pid).toBe(9999999);
      expect(status.running).toBe(false);
    });
  });

  describe('startDaemon()', () => {
    it('returns existing port/pid if daemon already running', async () => {
      const configPath = join(tmpDir, 'daemon.json');
      writeFileSync(configPath, JSON.stringify({ port: 8054, pid: process.pid }));

      const result = await startDaemon(makeConfig(tmpDir));
      expect(result.port).toBe(8054);
      expect(result.pid).toBe(process.pid);
      expect(spawn).not.toHaveBeenCalled();
    });

    it('spawns a child process when daemon is not running', async () => {
      const mockChild = {
        unref: vi.fn(),
        on: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockChild as never);

      const configPath = join(tmpDir, 'daemon.json');

      const startPromise = startDaemon(makeConfig(tmpDir));

      await new Promise((r) => setTimeout(r, 150));

      writeFileSync(configPath, JSON.stringify({ port: 8054, pid: 12345 }));

      const result = await startPromise;
      expect(result.port).toBe(8054);
      expect(result.pid).toBe(12345);
      expect(spawn).toHaveBeenCalledOnce();
      expect(mockChild.unref).toHaveBeenCalledOnce();
    });

    it('rejects on spawn error', async () => {
      const mockChild = {
        unref: vi.fn(),
        on: vi.fn((event: string, cb: (err: Error) => void) => {
          if (event === 'error') cb(new Error('spawn failed'));
        }),
      };
      vi.mocked(spawn).mockReturnValue(mockChild as never);

      await expect(startDaemon(makeConfig(tmpDir))).rejects.toThrow('spawn failed');
    });

    it('rejects on timeout when config never appears', async () => {
      const mockChild = {
        unref: vi.fn(),
        on: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockChild as never);

      vi.useFakeTimers();
      const promise = startDaemon(makeConfig(tmpDir));

      vi.advanceTimersByTime(16_000);

      await expect(promise).rejects.toThrow('Daemon start timeout');
      vi.useRealTimers();
    });
  });

  describe('stopDaemon()', () => {
    it('removes config when daemon is not running', async () => {
      const configPath = join(tmpDir, 'daemon.json');
      writeFileSync(configPath, JSON.stringify({ port: 8054, pid: 9999999 }));

      await stopDaemon(makeConfig(tmpDir));
      expect(existsSync(configPath)).toBe(false);
    });

    it('sends SIGTERM to running daemon', async () => {
      const configPath = join(tmpDir, 'daemon.json');
      writeFileSync(configPath, JSON.stringify({ port: 8054, pid: process.pid }));

      const killSpy = vi.spyOn(process, 'kill').mockReturnValue(true);

      await stopDaemon(makeConfig(tmpDir));

      expect(killSpy).toHaveBeenCalledWith(process.pid, 'SIGTERM');
      killSpy.mockRestore();
    });

    it('ignores ESRCH error when process already dead', async () => {
      const configPath = join(tmpDir, 'daemon.json');
      writeFileSync(configPath, JSON.stringify({ port: 8054, pid: 9999999 }));

      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
        const err = new Error('not found') as Error & { code: string };
        err.code = 'ESRCH';
        throw err;
      });

      await expect(stopDaemon(makeConfig(tmpDir))).resolves.toBeUndefined();
      expect(existsSync(configPath)).toBe(false);
      killSpy.mockRestore();
    });

    it('re-throws non-ESRCH errors from SIGTERM', async () => {
      const configPath = join(tmpDir, 'daemon.json');
      writeFileSync(configPath, JSON.stringify({ port: 8054, pid: process.pid }));

      const killSpy = vi
        .spyOn(process, 'kill')
        .mockImplementation((pid: number, signal?: string | number) => {
          if (signal === 'SIGTERM') {
            const err = new Error('operation not permitted') as Error & { code: string };
            err.code = 'EPERM';
            throw err;
          }
          return true;
        });

      await expect(stopDaemon(makeConfig(tmpDir))).rejects.toThrow('operation not permitted');
      killSpy.mockRestore();
    });
  });

  describe('killAllDaemon()', () => {
    it('cleans config dir files when daemon not running', async () => {
      const configPath = join(tmpDir, 'daemon.json');
      writeFileSync(configPath, JSON.stringify({ port: 8054, pid: 9999999 }));
      writeFileSync(join(tmpDir, 'session-1.json'), '{}');

      await killAllDaemon(makeConfig(tmpDir));

      expect(existsSync(configPath)).toBe(false);
      expect(existsSync(join(tmpDir, 'session-1.json'))).toBe(false);
    });

    it('sends SIGKILL to running daemon and cleans files', async () => {
      writeFileSync(join(tmpDir, 'daemon.json'), JSON.stringify({ port: 8054, pid: process.pid }));
      writeFileSync(join(tmpDir, 'worker-1.json'), '{}');

      const killSpy = vi.spyOn(process, 'kill').mockReturnValue(true);

      await killAllDaemon(makeConfig(tmpDir));

      expect(killSpy).toHaveBeenCalledWith(process.pid, 'SIGKILL');
      expect(existsSync(join(tmpDir, 'worker-1.json'))).toBe(false);
      killSpy.mockRestore();
    });

    it('does not delete non-json files', async () => {
      writeFileSync(join(tmpDir, 'daemon.json'), JSON.stringify({ port: 8054, pid: 9999999 }));
      writeFileSync(join(tmpDir, 'other.txt'), 'hello');

      await killAllDaemon(makeConfig(tmpDir));

      expect(existsSync(join(tmpDir, 'other.txt'))).toBe(true);
    });
  });

  describe('startWSServer / stopWSServer', () => {
    it('startWSServer creates and starts server', async () => {
      const server = await startWSServer({ port: 0 });
      expect(server).toBeDefined();
      await stopWSServer();
    });

    it('startWSServer returns same instance on second call', async () => {
      const s1 = await startWSServer({ port: 0 });
      const s2 = await startWSServer({ port: 0 });
      expect(s1).toBe(s2);
      await stopWSServer();
    });
  });
});
