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

function setupSpawnMock(child: ChildProcess & EventEmitter, shouldTriggerCrash = false) {
  vi.mocked(spawnAndInitWorker).mockImplementation(
    async (_path: string, sessionId: string, ctx: SpawnContext) => {
      child.on('message', (msg: unknown) => ctx.onMessage(msg));

      if (shouldTriggerCrash) {
        setTimeout(() => ctx.onCrash(sessionId), 10);
      }

      return child;
    }
  );
}

describe('WorkerManager - Branch Coverage', () => {
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

  describe('sendCommandInternal() - Worker crashed during execution', () => {
    it('returns WORKER_CRASHED error when worker crashes while command is pending', async () => {
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
      expect(result.error?.message).toContain('has crashed');
    });

    it('returns WORKER_NOT_FOUND when worker is already crashed', async () => {
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
      expect(result.error?.code).toBe('WORKER_NOT_FOUND');
      expect(result.error?.message).toContain('No active worker');
    });
  });

  describe('handleWorkerMessage() - Missing worker', () => {
    it('ignores message when worker was cleaned up', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await manager.spawnWorker('session-1');

      await manager.killWorker('session-1');

      mockChild.emit('message', {
        id: 'test-id',
        type: 'response',
        result: {},
      });

      expect(manager.getWorkerStatus('session-1')).toBeNull();
    });
  });

  describe('handleWorkerMessage() - Non-event messages', () => {
    it('updates lastHeartbeat only for event messages', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await manager.spawnWorker('session-1');

      const initialTime = Date.now();

      mockChild.emit('message', {
        id: 'req-1',
        type: 'response',
        result: {},
      });

      mockChild.emit('message', {
        type: 'other',
        event: 'not-heartbeat',
      });

      expect(manager.getWorkerStatus('session-1')).toBe('ready');

      mockChild.emit('message', {
        type: 'event',
        event: 'heartbeat',
      });

      expect(manager.getWorkerStatus('session-1')).toBe('ready');
    });
  });

  describe('cleanupWorker() - Process not connected', () => {
    it('does not kill process when not connected', async () => {
      const mockChild = createMockChild();
      mockChild.connected = false;
      setupSpawnMock(mockChild);
      vi.mocked(killWorkerProcess).mockResolvedValue(undefined);

      await manager.spawnWorker('session-1');
      await manager.killWorker('session-1');

      expect(mockChild.kill).not.toHaveBeenCalled();
      expect(killWorkerProcess).toHaveBeenCalledWith(mockChild);
    });
  });

  describe('cleanupWorker() - Kill error handling', () => {
    it('ignores errors when trying to kill process', async () => {
      const mockChild = createMockChild();
      mockChild.kill = vi.fn(() => {
        throw new Error('Process already dead');
      });
      setupSpawnMock(mockChild);
      vi.mocked(killWorkerProcess).mockResolvedValue(undefined);

      await manager.spawnWorker('session-1');
      await manager.killWorker('session-1');

      expect(manager.getWorkerStatus('session-1')).toBeNull();
    });
  });

  describe('cleanupPendingForSession() - Request ID format', () => {
    it('generates request IDs that include session prefix', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await manager.spawnWorker('test-session');

      const cmdPromise = manager.sendCommand('test-session', {
        type: 'request',
        method: 'test',
        params: {},
      });

      await vi.waitFor(() => {
        expect(mockChild.send).toHaveBeenCalledOnce();
      });

      const sentMsg = vi.mocked(mockChild.send).mock.calls[0][0] as Record<string, unknown>;
      const requestId = sentMsg.id as string;

      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBeGreaterThan(0);

      mockChild.emit('message', {
        id: requestId,
        type: 'response',
        result: { ok: true },
      });

      const result = await cmdPromise;
      expect(result.type).toBe('response');
    });

    it('cleares pending requests when request ID starts with session ID', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await manager.spawnWorker('test-session');

      const cmdPromise = manager.sendCommand('test-session', {
        type: 'request',
        method: 'test',
        params: {},
      });

      await vi.waitFor(() => {
        expect(mockChild.send).toHaveBeenCalledOnce();
      });

      manager.onWorkerCrash('test-session');

      const result = await cmdPromise;
      expect(result.type).toBe('error');
      expect(result.error?.code).toBe('WORKER_CRASHED');
    });
  });

  describe('Command queue - Different sessions run in parallel', () => {
    it('processes commands from different sessions concurrently', async () => {
      const mockChild1 = createMockChild();
      setupSpawnMock(mockChild1);
      await manager.spawnWorker('session-1');

      const mockChild2 = createMockChild();
      setupSpawnMock(mockChild2);
      await manager.spawnWorker('session-2');

      const p1 = manager.sendCommand('session-1', {
        type: 'request',
        method: 'cmd1',
        params: {},
      });

      const p2 = manager.sendCommand('session-2', {
        type: 'request',
        method: 'cmd2',
        params: {},
      });

      await vi.waitFor(() => {
        expect(mockChild1.send).toHaveBeenCalledOnce();
        expect(mockChild2.send).toHaveBeenCalledOnce();
      });

      const sentMsg1 = vi.mocked(mockChild1.send).mock.calls[0][0] as Record<string, unknown>;
      mockChild1.emit('message', { id: sentMsg1.id, type: 'response', result: 1 });

      const sentMsg2 = vi.mocked(mockChild2.send).mock.calls[0][0] as Record<string, unknown>;
      mockChild2.emit('message', { id: sentMsg2.id, type: 'response', result: 2 });

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.result).toBe(1);
      expect(r2.result).toBe(2);
    });
  });

  describe('Command queue - Chain error recovery', () => {
    it('continues processing queue after command error response', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await manager.spawnWorker('session-1');

      const p1 = manager.sendCommand('session-1', {
        type: 'request',
        method: 'fail',
        params: {},
      });

      const p2 = manager.sendCommand('session-1', {
        type: 'request',
        method: 'success',
        params: {},
      });

      await vi.waitFor(() => {
        expect(mockChild.send).toHaveBeenCalledOnce();
      });

      const sentMsg1 = vi.mocked(mockChild.send).mock.calls[0][0] as Record<string, unknown>;
      mockChild.emit('message', {
        id: sentMsg1.id,
        type: 'error',
        error: { code: 'FAIL', message: 'Command failed', tips: [] },
      });

      const r1 = await p1;
      expect(r1.type).toBe('error');
      expect(r1.error?.code).toBe('FAIL');

      await vi.waitFor(() => {
        expect(mockChild.send).toHaveBeenCalledTimes(2);
      });

      const sentMsg2 = vi.mocked(mockChild.send).mock.calls[1][0] as Record<string, unknown>;
      mockChild.emit('message', { id: sentMsg2.id, type: 'response', result: 'ok' });

      const r2 = await p2;
      expect(r2.result).toBe('ok');
    });
  });

  describe('Spawn with crash callback', () => {
    it('triggers crash callback when worker fails during spawn', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild, true);

      const crashSpy = vi.fn();
      manager.on('worker:crash', crashSpy);

      await manager.spawnWorker('session-1');

      await vi.waitFor(() => {
        expect(crashSpy).toHaveBeenCalledWith('session-1');
      });

      expect(manager.getWorkerStatus('session-1')).toBe('crashed');
    });
  });

  describe('getActiveWorkers() - No workers', () => {
    it('returns empty array when no workers exist', () => {
      expect(manager.getActiveWorkers()).toEqual([]);
    });

    it('returns empty array when all workers crashed', async () => {
      const mockChild = createMockChild();
      setupSpawnMock(mockChild);
      await manager.spawnWorker('session-1');

      manager.onWorkerCrash('session-1');

      expect(manager.getActiveWorkers()).toEqual([]);
    });
  });

  describe('shutdown() - Empty state', () => {
    it('handles shutdown with no workers', async () => {
      await expect(manager.shutdown()).resolves.not.toThrow();
      expect(killWorkerProcess).not.toHaveBeenCalled();
    });
  });

  describe('sendCommand() - Session after worker crash and respawn', () => {
    it('handles commands after worker crash and successful respawn', async () => {
      const child1 = createMockChild();
      setupSpawnMock(child1);
      await manager.spawnWorker('session-1');

      const p1 = manager.sendCommand('session-1', {
        type: 'request',
        method: 'test',
        params: {},
      });

      await vi.waitFor(() => {
        expect(child1.send).toHaveBeenCalledOnce();
      });

      manager.onWorkerCrash('session-1');

      const result1 = await p1;
      expect(result1.type).toBe('error');

      const child2 = createMockChild();
      setupSpawnMock(child2);
      await manager.spawnWorker('session-1');

      const p2 = manager.sendCommand('session-1', {
        type: 'request',
        method: 'new-test',
        params: {},
      });

      await vi.waitFor(() => {
        expect(child2.send).toHaveBeenCalledOnce();
      });

      const sentMsg = vi.mocked(child2.send).mock.calls[0][0] as Record<string, unknown>;
      child2.emit('message', { id: sentMsg.id, type: 'response', result: 'success' });

      const result2 = await p2;
      expect(result2.type).toBe('response');
      expect(result2.result).toBe('success');
    });
  });
});
