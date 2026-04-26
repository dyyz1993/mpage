import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TMP_SESSION_DIR = join(tmpdir(), 'xcli-test-daemon-sessions');
const TMP_DAEMON_CONFIG = join(TMP_SESSION_DIR, 'daemon.json');

vi.mock('../../src/core/constants', () => ({
  SESSION_DIR: TMP_SESSION_DIR,
  DAEMON_CONFIG_PATH: TMP_DAEMON_CONFIG,
  DAEMON_SOCKET_PATH: join(TMP_SESSION_DIR, 'daemon.sock'),
  DEFAULT_CHROMIUM_PATH: '/usr/bin/chromium',
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    unref: vi.fn(),
    on: vi.fn(),
  })),
}));

describe('daemon-manager', () => {
  beforeEach(() => {
    mkdirSync(TMP_SESSION_DIR, { recursive: true });
    if (existsSync(TMP_DAEMON_CONFIG)) {
      rmSync(TMP_DAEMON_CONFIG);
    }
  });

  afterEach(() => {
    if (existsSync(TMP_SESSION_DIR)) {
      rmSync(TMP_SESSION_DIR, { recursive: true, force: true });
    }
  });

  it('getDaemonStatus returns running: false when no config file', async () => {
    const { getDaemonStatus } = await import('../../src/core/daemon-manager');
    const status = getDaemonStatus();
    expect(status.running).toBe(false);
    expect(status.port).toBe(0);
    expect(status.pid).toBe(0);
  });

  it('getDaemonStatus returns running: false when process does not exist', async () => {
    writeFileSync(TMP_DAEMON_CONFIG, JSON.stringify({ port: 9999, pid: 99999999 }));
    const { getDaemonStatus } = await import('../../src/core/daemon-manager');
    const status = getDaemonStatus();
    expect(status.running).toBe(false);
  });

  it('isDaemonRunning returns false when no config', async () => {
    const { isDaemonRunning } = await import('../../src/core/daemon-manager');
    expect(isDaemonRunning()).toBe(false);
  });

  it('startDaemon returns existing info if already running', async () => {
    const originalKill = process.kill;
    const mockKill = vi.fn(() => true);
    process.kill = mockKill as typeof process.kill;

    writeFileSync(TMP_DAEMON_CONFIG, JSON.stringify({ port: 8054, pid: 12345 }));

    const { startDaemon } = await import('../../src/core/daemon-manager');
    const result = await startDaemon();
    expect(result.port).toBe(8054);
    expect(result.pid).toBe(12345);

    process.kill = originalKill;
  });

  it('stopDaemon does not throw when daemon is not running', async () => {
    const { stopDaemon } = await import('../../src/core/daemon-manager');
    await expect(stopDaemon()).resolves.toBeUndefined();
  });

  it('killAllDaemon does not throw when daemon is not running', async () => {
    const { killAllDaemon } = await import('../../src/core/daemon-manager');
    await expect(killAllDaemon()).resolves.toBeUndefined();
  });
});
