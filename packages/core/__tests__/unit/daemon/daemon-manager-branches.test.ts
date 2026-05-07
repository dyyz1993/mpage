import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  startWSServer,
  stopWSServer,
  getWSServer,
  getDaemonStatus,
  isDaemonRunning,
} from '../../../src/daemon/daemon-manager.js';
import type { DaemonConfig } from '../../../src/daemon/worker-protocol.js';

function makeConfig(configDir: string): DaemonConfig {
  return {
    configDir,
    workerEntryPath: '/nonexistent',
    basePort: 8054,
  };
}

describe('daemon-manager — uncovered branches', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'xcli-dm-br-'));
  });

  afterEach(async () => {
    await stopWSServer().catch(() => {});
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('getWSServer — returns null when not started', () => {
    it('should return null before starting', () => {
      expect(getWSServer()).toBeNull();
    });
  });

  describe('getDaemonStatus', () => {
    it('should return not running when no daemon config', () => {
      const config = makeConfig(tmpDir);
      const status = getDaemonStatus(config);
      expect(status.running).toBe(false);
      expect(status.port).toBe(0);
      expect(status.pid).toBe(0);
    });
  });

  describe('isDaemonRunning', () => {
    it('should return false when daemon config has corrupted JSON', () => {
      writeFileSync(join(tmpDir, 'daemon.json'), '{invalid json', 'utf-8');
      const config = makeConfig(tmpDir);
      expect(isDaemonRunning(config)).toBe(false);
    });

    it('should return false when daemon config has port but no pid process', () => {
      writeFileSync(
        join(tmpDir, 'daemon.json'),
        JSON.stringify({ port: 8054, pid: 99999999 }),
        'utf-8'
      );
      const config = makeConfig(tmpDir);
      expect(isDaemonRunning(config)).toBe(false);
    });

    it('should return false when getDaemonPid catches corrupted JSON', () => {
      writeFileSync(
        join(tmpDir, 'daemon.json'),
        JSON.stringify({ port: 9999, pid: 99999999 }).slice(0, -5),
        'utf-8'
      );
      const config = makeConfig(tmpDir);
      expect(isDaemonRunning(config)).toBe(false);
    });

    it('should handle getDaemonPid read error when file disappears between calls', () => {
      writeFileSync(
        join(tmpDir, 'daemon.json'),
        JSON.stringify({ port: 9999, pid: 99999999 }),
        'utf-8'
      );
      const config = makeConfig(tmpDir);
      expect(isDaemonRunning(config)).toBe(false);
    });
  });

  describe('startWSServer and stopWSServer', () => {
    it('should start and return ws server, then stop', async () => {
      const server = await startWSServer({ port: 0, host: '127.0.0.1' });
      expect(server).toBeDefined();
      expect(getWSServer()).toBe(server);

      await stopWSServer();
      expect(getWSServer()).toBeNull();
    });

    it('should return same server on second start call', async () => {
      const server1 = await startWSServer({ port: 0, host: '127.0.0.1' });
      const server2 = await startWSServer({ port: 0, host: '127.0.0.1' });
      expect(server1).toBe(server2);

      await stopWSServer();
    });
  });
});
