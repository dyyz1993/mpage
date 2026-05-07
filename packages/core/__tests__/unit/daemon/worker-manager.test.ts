import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';
import type { SpawnContext } from '../../../src/daemon/worker-lifecycle.js';

vi.mock('../../../src/daemon/worker-lifecycle.js', () => ({
  spawnAndInitWorker: vi.fn(),
  killWorkerProcess: vi.fn(),
}));

import { WorkerManager } from '../../../src/daemon/worker-manager.js';
import { spawnAndInitWorker, killWorkerProcess } from '../../../src/daemon/worker-lifecycle.js';

function createMockChild(): ChildProcess & EventEmitter {
  const ee = new EventEmitter() as ChildProcess & EventEmitter;
  ee.send = vi.fn();
  ee.kill = vi.fn();
  ee.connected = true;
  return ee;
}

function setupSpawnMock(child: ChildProcess & EventEmitter) {
  vi.mocked(spawnAndInitWorker).mockImplementation(
    async (_path: string, _sid: string, ctx: SpawnContext) => {
      child.on('message', (msg: unknown) => ctx.onMessage(msg));
      return child;
    }
  );
}

describe('WorkerManager', () => {
  let manager: WorkerManager;

  beforeEach(() => {
    vi.mocked(spawnAndInitWorker).mockReset();
    vi.mocked(killWorkerProcess).mockReset();
    manager = new WorkerManager({
      workerEntryPath: '/fake/worker.ts',
      requestTimeout: 5000,
      heartbeatInterval: 60000,
      heartbeatTimeout: 30000,
    });
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('spawnWorker()', () => {
    it('spawns a worker and stores it', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);

      await manager.spawnWorker('session-1');

      expect(spawnAndInitWorker).toHaveBeenCalledOnce();
      expect(manager.getWorkerStatus('session-1')).toBe('ready');
    });

    it('does not re-spawn if worker already exists and ready', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);

      await manager.spawnWorker('session-1');
      await manager.spawnWorker('session-1');

      expect(spawnAndInitWorker).toHaveBeenCalledOnce();
    });

    it('re-spawns if existing worker is crashed', async () => {
      const child1 = createMockChild();
      const child2 = createMockChild();
      setupSpawnMock(child1);

      await manager.spawnWorker('session-1');
      manager.onWorkerCrash('session-1');

      setupSpawnMock(child2);
      await manager.spawnWorker('session-1');
      expect(spawnAndInitWorker).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendCommand()', () => {
    it('returns error when no worker exists', async () => {
      const result = await manager.sendCommand('no-such-session', {
        type: 'request',
        method: 'test',
        params: {},
      });
      expect(result.type).toBe('error');
      expect(result.error?.code).toBe('WORKER_NOT_FOUND');
    });

    it('returns error when worker is crashed', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await manager.spawnWorker('session-1');
      manager.onWorkerCrash('session-1');

      const result = await manager.sendCommand('session-1', {
        type: 'request',
        method: 'test',
        params: {},
      });
      expect(result.type).toBe('error');
    });

    it('sends command to worker and resolves on response', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await manager.spawnWorker('session-1');

      const cmdPromise = manager.sendCommand('session-1', {
        type: 'request',
        method: 'navigate',
        params: { url: 'https://example.com' },
      });

      await vi.waitFor(() => {
        expect(mockChild.send).toHaveBeenCalledOnce();
      });

      const sentMsg = vi.mocked(mockChild.send).mock.calls[0][0] as Record<string, unknown>;
      expect(sentMsg.method).toBe('navigate');
      expect(sentMsg.sessionId).toBe('session-1');
      expect(sentMsg.id).toBeDefined();

      mockChild.emit('message', {
        id: sentMsg.id,
        type: 'response',
        result: { ok: true },
      });

      const result = await cmdPromise;
      expect(result.type).toBe('response');
      expect(result.result).toEqual({ ok: true });
    });

    it('resolves with error response from worker', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await manager.spawnWorker('session-1');

      const cmdPromise = manager.sendCommand('session-1', {
        type: 'request',
        method: 'fail',
        params: {},
      });

      await vi.waitFor(() => {
        expect(mockChild.send).toHaveBeenCalledOnce();
      });

      const sentMsg = vi.mocked(mockChild.send).mock.calls[0][0] as Record<string, unknown>;
      mockChild.emit('message', {
        id: sentMsg.id,
        type: 'error',
        error: { code: 'TEST_ERROR', message: 'test', tips: [] },
      });

      const result = await cmdPromise;
      expect(result.type).toBe('error');
      expect(result.error?.code).toBe('TEST_ERROR');
    });

    it('queues commands per session (serial execution)', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await manager.spawnWorker('session-1');

      const p1 = manager.sendCommand('session-1', {
        type: 'request',
        method: 'cmd1',
        params: {},
      });
      const p2 = manager.sendCommand('session-1', {
        type: 'request',
        method: 'cmd2',
        params: {},
      });

      await vi.waitFor(() => {
        expect(mockChild.send).toHaveBeenCalledOnce();
      });

      const sentMsg1 = vi.mocked(mockChild.send).mock.calls[0][0] as Record<string, unknown>;
      mockChild.emit('message', { id: sentMsg1.id, type: 'response', result: 1 });

      const r1 = await p1;
      expect(r1.result).toBe(1);

      await vi.waitFor(() => {
        expect(mockChild.send).toHaveBeenCalledTimes(2);
      });

      const sentMsg2 = vi.mocked(mockChild.send).mock.calls[1][0] as Record<string, unknown>;
      mockChild.emit('message', { id: sentMsg2.id, type: 'response', result: 2 });

      const r2 = await p2;
      expect(r2.result).toBe(2);
    });

    it('rejects on request timeout', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const localManager = new WorkerManager({
        workerEntryPath: '/fake/worker.ts',
        requestTimeout: 1000,
        heartbeatInterval: 60000,
        heartbeatTimeout: 30000,
      });

      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await localManager.spawnWorker('session-1');

      const cmdPromise = localManager.sendCommand('session-1', {
        type: 'request',
        method: 'slow',
        params: {},
      });

      vi.advanceTimersByTime(1500);

      await expect(cmdPromise).rejects.toThrow('timed out');

      await localManager.shutdown();
      vi.useRealTimers();
    });
  });

  describe('heartbeat', () => {
    it('marks worker as crashed on heartbeat timeout', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const localManager = new WorkerManager({
        workerEntryPath: '/fake/worker.ts',
        requestTimeout: 30000,
        heartbeatInterval: 100,
        heartbeatTimeout: 200,
      });

      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await localManager.spawnWorker('session-1');

      vi.advanceTimersByTime(300);

      expect(localManager.getWorkerStatus('session-1')).toBe('crashed');

      await localManager.shutdown();
      vi.useRealTimers();
    });

    it('resets heartbeat on heartbeat event', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const localManager = new WorkerManager({
        workerEntryPath: '/fake/worker.ts',
        requestTimeout: 30000,
        heartbeatInterval: 100,
        heartbeatTimeout: 500,
      });

      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await localManager.spawnWorker('session-1');

      vi.advanceTimersByTime(300);
      mockChild.emit('message', { type: 'event', event: 'heartbeat' });

      vi.advanceTimersByTime(300);
      expect(localManager.getWorkerStatus('session-1')).toBe('ready');

      await localManager.shutdown();
      vi.useRealTimers();
    });
  });

  describe('onWorkerCrash()', () => {
    it('emits worker:crash event', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await manager.spawnWorker('session-1');

      const crashSpy = vi.fn();
      manager.on('worker:crash', crashSpy);

      manager.onWorkerCrash('session-1');

      expect(crashSpy).toHaveBeenCalledWith('session-1');
      expect(manager.getWorkerStatus('session-1')).toBe('crashed');
    });

    it('resolves pending requests with WORKER_CRASHED error', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await manager.spawnWorker('session-1');

      const cmdPromise = manager.sendCommand('session-1', {
        type: 'request',
        method: 'test',
        params: {},
      });

      await vi.waitFor(() => {
        expect(mockChild.send).toHaveBeenCalledOnce();
      });

      manager.onWorkerCrash('session-1');

      const result = await cmdPromise;
      expect(result.type).toBe('error');
      expect(result.error?.code).toBe('WORKER_CRASHED');
    });
  });

  describe('killWorker()', () => {
    it('kills the worker process and removes entry', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      vi.mocked(killWorkerProcess).mockResolvedValue(undefined);

      await manager.spawnWorker('session-1');
      await manager.killWorker('session-1');

      expect(killWorkerProcess).toHaveBeenCalledWith(mockChild);
      expect(manager.getWorkerStatus('session-1')).toBeNull();
    });

    it('does nothing for unknown session', async () => {
      await manager.killWorker('nonexistent');
      expect(killWorkerProcess).not.toHaveBeenCalled();
    });
  });

  describe('getActiveWorkers()', () => {
    it('returns session IDs of non-crashed workers', async () => {
      const c1 = createMockChild();
      const c2 = createMockChild();
      setupSpawnMock(c1);
      await manager.spawnWorker('s1');

      setupSpawnMock(c2);
      await manager.spawnWorker('s2');

      manager.onWorkerCrash('s1');

      expect(manager.getActiveWorkers()).toEqual(['s2']);
    });
  });

  describe('shutdown()', () => {
    it('kills all workers and clears state', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      vi.mocked(killWorkerProcess).mockResolvedValue(undefined);

      await manager.spawnWorker('s1');

      setupSpawnMock(createMockChild());
      await manager.spawnWorker('s2');

      await manager.shutdown();

      expect(killWorkerProcess).toHaveBeenCalledTimes(2);
      expect(manager.getActiveWorkers()).toEqual([]);
    });
  });
});
