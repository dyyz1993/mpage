import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { fork } from 'child_process';
import type { ChildProcess } from 'child_process';

vi.mock('node:child_process', () => ({
  fork: vi.fn(),
}));

import { spawnAndInitWorker, killWorkerProcess } from '../../../src/daemon/worker-lifecycle.js';

function createMockChild(): ChildProcess & EventEmitter {
  const ee = new EventEmitter() as ChildProcess & EventEmitter;
  ee.send = vi.fn();
  ee.kill = vi.fn();
  ee.connected = true;
  return ee;
}

describe('worker-lifecycle - Branch Coverage', () => {
  let mockChild: ChildProcess & EventEmitter;

  beforeEach(() => {
    mockChild = createMockChild();
    vi.mocked(fork).mockReturnValue(mockChild);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('spawnAndInitWorker() - Error event', () => {
    it('calls onCrash when worker emits error event', async () => {
      const onCrashSpy = vi.fn();
      const onMessageSpy = vi.fn();

      const promise = spawnAndInitWorker('/fake/worker.js', 'session-1', {
        onMessage: onMessageSpy,
        onCrash: onCrashSpy,
      });

      mockChild.emit('error', new Error('Worker failed'));

      await expect(promise).rejects.toThrow();

      expect(onCrashSpy).toHaveBeenCalledWith('session-1');
    });
  });

  describe('spawnAndInitWorker() - Exit with non-zero code', () => {
    it('calls onCrash when worker exits with non-zero code', async () => {
      const onCrashSpy = vi.fn();
      const onMessageSpy = vi.fn();

      const promise = spawnAndInitWorker('/fake/worker.js', 'session-1', {
        onMessage: onMessageSpy,
        onCrash: onCrashSpy,
      });

      setTimeout(() => {
        mockChild.emit('exit', 1);
      }, 10);

      await expect(promise).rejects.toThrow();

      expect(onCrashSpy).toHaveBeenCalledWith('session-1');
    });

    it('calls onCrash when worker exits with error code', async () => {
      const onCrashSpy = vi.fn();
      const onMessageSpy = vi.fn();

      const promise = spawnAndInitWorker('/fake/worker.js', 'session-1', {
        onMessage: onMessageSpy,
        onCrash: onCrashSpy,
      });

      setTimeout(() => {
        mockChild.emit('exit', 127);
      }, 10);

      await expect(promise).rejects.toThrow();

      expect(onCrashSpy).toHaveBeenCalledWith('session-1');
    });

    it('does NOT call onCrash when worker exits with code 0', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const onCrashSpy = vi.fn();
      const onMessageSpy = vi.fn();

      const promise = spawnAndInitWorker('/fake/worker.js', 'session-1', {
        onMessage: onMessageSpy,
        onCrash: onCrashSpy,
      });

      mockChild.emit('message', { type: 'event', event: 'ready' });

      await promise;

      mockChild.emit('exit', 0);

      expect(onCrashSpy).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('spawnAndInitWorker() - Timeout', () => {
    it('rejects with timeout error when ready event not received within 15s', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const onCrashSpy = vi.fn();
      const onMessageSpy = vi.fn();

      const promise = spawnAndInitWorker('/fake/worker.js', 'session-1', {
        onMessage: onMessageSpy,
        onCrash: onCrashSpy,
      });

      vi.advanceTimersByTime(15_000);

      await expect(promise).rejects.toThrow('failed to start within timeout');

      expect(onCrashSpy).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('does not reject when ready event arrives before timeout', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const onCrashSpy = vi.fn();
      const onMessageSpy = vi.fn();

      const promise = spawnAndInitWorker('/fake/worker.js', 'session-1', {
        onMessage: onMessageSpy,
        onCrash: onCrashSpy,
      });

      setTimeout(() => {
        mockChild.emit('message', { type: 'event', event: 'ready' });
      }, 10_000);

      vi.advanceTimersByTime(10_100);

      const result = await promise;
      expect(result).toBe(mockChild);

      expect(onCrashSpy).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('spawnAndInitWorker() - Ready event detection', () => {
    it('resolves when receiving ready event', async () => {
      const onMessageSpy = vi.fn();
      const onCrashSpy = vi.fn();

      const promise = spawnAndInitWorker('/fake/worker.js', 'session-1', {
        onMessage: onMessageSpy,
        onCrash: onCrashSpy,
      });

      setTimeout(() => {
        mockChild.emit('message', { type: 'event', event: 'ready' });
      }, 10);

      const result = await promise;
      expect(result).toBe(mockChild);
      expect(fork).toHaveBeenCalledWith('/fake/worker.js', [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: { ...process.env },
      });
    });

    it('ignores non-ready event messages before ready', async () => {
      const onMessageSpy = vi.fn();
      const onCrashSpy = vi.fn();

      const promise = spawnAndInitWorker('/fake/worker.js', 'session-1', {
        onMessage: onMessageSpy,
        onCrash: onCrashSpy,
      });

      setTimeout(() => {
        mockChild.emit('message', { type: 'other', data: 'test' });
      }, 5);

      setTimeout(() => {
        mockChild.emit('message', { type: 'event', event: 'ready' });
      }, 10);

      const result = await promise;
      expect(result).toBe(mockChild);
    });
  });

  describe('killWorkerProcess() - Graceful shutdown', () => {
    it('sends shutdown signal and waits for process exit', async () => {
      const promise = killWorkerProcess(mockChild);

      expect(mockChild.send).toHaveBeenCalledWith({ type: 'shutdown' });

      setTimeout(() => {
        mockChild.emit('exit', 0);
      }, 100);

      await expect(promise).resolves.not.toThrow();
      expect(mockChild.kill).not.toHaveBeenCalled();
    });

    it('resolves immediately when process exits quickly', async () => {
      const promise = killWorkerProcess(mockChild);

      expect(mockChild.send).toHaveBeenCalledWith({ type: 'shutdown' });

      mockChild.emit('exit', 0);

      await expect(promise).resolves.not.toThrow();
      expect(mockChild.kill).not.toHaveBeenCalled();
    });
  });

  describe('killWorkerProcess() - Timeout SIGKILL', () => {
    it('SIGKILLs process after 5 second timeout', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const promise = killWorkerProcess(mockChild);

      expect(mockChild.send).toHaveBeenCalledWith({ type: 'shutdown' });

      vi.advanceTimersByTime(5_000);

      await expect(promise).resolves.not.toThrow();
      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');

      vi.useRealTimers();
    });

    it('does not SIGKILL if process exits before timeout', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const promise = killWorkerProcess(mockChild);

      vi.advanceTimersByTime(3_000);
      mockChild.emit('exit', 0);
      vi.advanceTimersByTime(2_000);

      await expect(promise).resolves.not.toThrow();
      expect(mockChild.kill).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('killWorkerProcess() - Send error handling', () => {
    it('SIGKILLs process when send fails', async () => {
      mockChild.send = vi.fn(() => {
        throw new Error('Process not connected');
      });

      const promise = killWorkerProcess(mockChild);

      await expect(promise).resolves.not.toThrow();
      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
    });

    it('SIGKILLs process when process is disconnected', async () => {
      mockChild.send = vi.fn(() => {
        const err = new Error('Channel closed') as NodeJS.ErrnoException;
        err.code = 'ERR_IPC_CHANNEL_CLOSED';
        throw err;
      });

      const promise = killWorkerProcess(mockChild);

      await expect(promise).resolves.not.toThrow();
      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
    });
  });

  describe('spawnAndInitWorker() - Message routing', () => {
    it('routes all messages to onMessage callback', async () => {
      const onMessageSpy = vi.fn();
      const onCrashSpy = vi.fn();

      const promise = spawnAndInitWorker('/fake/worker.js', 'session-1', {
        onMessage: onMessageSpy,
        onCrash: onCrashSpy,
      });

      const testMessage = { type: 'event', event: 'ready', data: 'test' };
      mockChild.emit('message', testMessage);

      await promise;

      expect(onMessageSpy).toHaveBeenCalledWith(testMessage);
    });
  });

  describe('spawnAndInitWorker() - Fork options', () => {
    it('passes correct options to fork', async () => {
      const onMessageSpy = vi.fn();
      const onCrashSpy = vi.fn();

      const promise = spawnAndInitWorker('/path/to/worker.js', 'session-1', {
        onMessage: onMessageSpy,
        onCrash: onCrashSpy,
      });

      mockChild.emit('message', { type: 'event', event: 'ready' });

      await promise;

      expect(fork).toHaveBeenCalledWith('/path/to/worker.js', [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: { ...process.env },
      });

      expect(mockChild.send).toHaveBeenCalledWith({
        type: 'init',
        sessionId: 'session-1',
      });
    });
  });

  describe('killWorkerProcess() - Multiple rapid calls', () => {
    it('handles multiple kill calls gracefully', async () => {
      const promise1 = killWorkerProcess(mockChild);
      const promise2 = killWorkerProcess(mockChild);

      expect(mockChild.send).toHaveBeenCalledTimes(2);

      setTimeout(() => {
        mockChild.emit('exit', 0);
      }, 100);

      await expect(Promise.all([promise1, promise2])).resolves.not.toThrow();
    });
  });
});
