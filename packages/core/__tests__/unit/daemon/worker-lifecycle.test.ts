import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';

vi.mock('child_process', () => ({
  fork: vi.fn(),
}));

import { fork } from 'child_process';
import { spawnAndInitWorker, killWorkerProcess } from '../../../src/daemon/worker-lifecycle.js';

function createMockFork(): ChildProcess & EventEmitter {
  const ee = new EventEmitter() as ChildProcess & EventEmitter;
  ee.send = vi.fn();
  ee.kill = vi.fn((sig?: string) => {
    ee.emit('exit', sig ? 1 : 0);
    return true;
  });
  ee.connected = true;
  return ee;
}

describe('worker-lifecycle', () => {
  beforeEach(() => {
    vi.mocked(fork).mockReset();
  });

  describe('spawnAndInitWorker()', () => {
    it('forks a child and sends init message', async () => {
      const mockChild = createMockFork();
      vi.mocked(fork).mockReturnValue(mockChild);

      const onMessage = vi.fn();
      const onCrash = vi.fn();
      const ctx = { onMessage, onCrash };

      const spawnPromise = spawnAndInitWorker('/fake/worker.ts', 'session-1', ctx);

      expect(fork).toHaveBeenCalledWith('/fake/worker.ts', [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: process.env,
      });

      expect(mockChild.send).toHaveBeenCalledWith({ type: 'init', sessionId: 'session-1' });

      mockChild.emit('message', { type: 'event', event: 'ready' });

      const result = await spawnPromise;
      expect(result).toBe(mockChild);
    });

    it('rejects on non-zero exit', async () => {
      const mockChild = createMockFork();
      vi.mocked(fork).mockReturnValue(mockChild);

      const ctx = { onMessage: vi.fn(), onCrash: vi.fn() };

      const spawnPromise = spawnAndInitWorker('/fake/worker.ts', 'session-1', ctx);

      mockChild.emit('exit', 1);

      await expect(spawnPromise).rejects.toThrow('failed to start within timeout');
    });

    it('rejects on spawn error', async () => {
      const mockChild = createMockFork();
      vi.mocked(fork).mockReturnValue(mockChild);

      const ctx = { onMessage: vi.fn(), onCrash: vi.fn() };

      const spawnPromise = spawnAndInitWorker('/fake/worker.ts', 'session-1', ctx);

      mockChild.emit('error', new Error('spawn failed'));

      await expect(spawnPromise).rejects.toThrow('failed to start within timeout');
    });

    it('forwards worker messages to onMessage', async () => {
      const mockChild = createMockFork();
      vi.mocked(fork).mockReturnValue(mockChild);

      const onMessage = vi.fn();
      const ctx = { onMessage, onCrash: vi.fn() };

      const spawnPromise = spawnAndInitWorker('/fake/worker.ts', 'session-1', ctx);

      mockChild.emit('message', { type: 'event', event: 'ready' });
      await spawnPromise;

      mockChild.emit('message', { type: 'response', data: 'test' });
      expect(onMessage).toHaveBeenCalledWith({ type: 'response', data: 'test' });
    });

    it('calls onCrash on error event after ready', async () => {
      const mockChild = createMockFork();
      vi.mocked(fork).mockReturnValue(mockChild);

      const onCrash = vi.fn();
      const ctx = { onMessage: vi.fn(), onCrash };

      const spawnPromise = spawnAndInitWorker('/fake/worker.ts', 'session-1', ctx);
      mockChild.emit('message', { type: 'event', event: 'ready' });
      await spawnPromise;

      mockChild.emit('error', new Error('boom'));
      expect(onCrash).toHaveBeenCalledWith('session-1');
    });
  });

  describe('killWorkerProcess()', () => {
    it('sends shutdown and waits for exit', async () => {
      const mockChild = createMockFork();
      vi.useFakeTimers();

      const killPromise = killWorkerProcess(mockChild);

      expect(mockChild.send).toHaveBeenCalledWith({ type: 'shutdown' });

      mockChild.emit('exit', 0);

      await killPromise;
      expect(mockChild.kill).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('sends SIGKILL after 5 second timeout', async () => {
      const mockChild = createMockFork();
      mockChild.kill = vi.fn(() => {
        mockChild.emit('exit', null);
        return true;
      });

      vi.useFakeTimers();

      const killPromise = killWorkerProcess(mockChild);

      vi.advanceTimersByTime(5000);

      await killPromise;
      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
      vi.useRealTimers();
    });

    it('catches error and sends SIGKILL', async () => {
      const mockChild = createMockFork();
      mockChild.send = vi.fn(() => {
        throw new Error('channel closed');
      });

      await killWorkerProcess(mockChild);

      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
    });
  });
});
