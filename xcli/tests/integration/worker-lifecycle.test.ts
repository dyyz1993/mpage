import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WorkerManager } from '../../src/core/daemon/worker-manager';
import { existsSync } from 'fs';
import { join } from 'path';

const CHROMIUM_PATH =
  process.env.XCLI_CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium';

const hasChromium = existsSync(CHROMIUM_PATH);

const hasBuiltWorker = existsSync(
  join(__dirname, '..', '..', 'dist', 'core', 'daemon', 'worker-entry.js')
);

const canRunRealWorker = hasChromium && hasBuiltWorker;

describe.skipIf(!canRunRealWorker)('WorkerManager Lifecycle (real fork)', () => {
  let manager: WorkerManager;

  beforeAll(() => {
    manager = new WorkerManager();
  });

  afterAll(async () => {
    await manager.shutdown();
  });

  it('should spawn a worker and receive ready event', async () => {
    await manager.spawnWorker('test-session-1');
    const status = manager.getWorkerStatus('test-session-1');
    expect(status).toBe('ready');
  });

  it('should track active workers', () => {
    const active = manager.getActiveWorkers();
    expect(active).toContain('test-session-1');
  });

  it('should get worker status as ready', () => {
    const status = manager.getWorkerStatus('test-session-1');
    expect(status).not.toBeNull();
    expect(status).toBe('ready');
  });

  it('should return null status for unknown session', () => {
    const status = manager.getWorkerStatus('unknown-session');
    expect(status).toBeNull();
  });

  it('should kill a worker', async () => {
    await manager.killWorker('test-session-1');
    const status = manager.getWorkerStatus('test-session-1');
    expect(status).toBeNull();
  });

  it('should handle kill of non-existent worker gracefully', async () => {
    await expect(manager.killWorker('non-existent')).resolves.not.toThrow();
  });

  it('should handle shutdown with no workers', async () => {
    const emptyManager = new WorkerManager();
    await expect(emptyManager.shutdown()).resolves.not.toThrow();
  });

  it('should spawn multiple workers', async () => {
    await manager.spawnWorker('multi-1');
    await manager.spawnWorker('multi-2');

    expect(manager.getWorkerStatus('multi-1')).toBe('ready');
    expect(manager.getWorkerStatus('multi-2')).toBe('ready');

    const active = manager.getActiveWorkers();
    expect(active).toContain('multi-1');
    expect(active).toContain('multi-2');

    await manager.killWorker('multi-1');
    await manager.killWorker('multi-2');
  });
});

describe('WorkerManager (no browser required)', () => {
  it('should return null status for unknown worker', () => {
    const manager = new WorkerManager();
    const status = manager.getWorkerStatus('non-existent');
    expect(status).toBeNull();
    manager.shutdown();
  });

  it('should return empty active list when no workers', () => {
    const manager = new WorkerManager();
    const active = manager.getActiveWorkers();
    expect(active).toEqual([]);
    manager.shutdown();
  });

  it('should return error response when sending to non-existent worker', async () => {
    const manager = new WorkerManager();
    const response = await manager.sendCommand('ghost-session', {
      type: 'request',
      method: 'session.list',
      params: {},
    });

    expect(response.type).toBe('error');
    expect(response.error?.code).toBe('WORKER_NOT_FOUND');

    await manager.shutdown();
  });

  it('should handle kill of non-existent worker', async () => {
    const manager = new WorkerManager();
    await expect(manager.killWorker('no-such-worker')).resolves.not.toThrow();
    await manager.shutdown();
  });

  it('should handle shutdown cleanly', async () => {
    const manager = new WorkerManager();
    await expect(manager.shutdown()).resolves.not.toThrow();
  });

  it('should handle double shutdown', async () => {
    const manager = new WorkerManager();
    await manager.shutdown();
    await expect(manager.shutdown()).resolves.not.toThrow();
  });
});
