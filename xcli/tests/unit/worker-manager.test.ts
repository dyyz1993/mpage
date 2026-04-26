/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';

function createMockChildProcess(): ChildProcess & EventEmitter {
  const emitter = new EventEmitter();
  const cp = Object.assign(emitter, {
    send: vi.fn((msg: Record<string, unknown>) => {
      if (msg.type === 'shutdown') {
        process.nextTick(() => cp.emit('exit', 0));
      }
    }),
    kill: vi.fn(() => {
      process.nextTick(() => cp.emit('exit', 0));
    }),
    connected: true,
    unref: vi.fn(),
    ref: vi.fn(),
    stdin: null,
    stdout: null,
    stderr: null,
    pid: 12345,
  }) as unknown as ChildProcess & EventEmitter;
  return cp;
}

vi.mock('child_process', () => ({
  fork: vi.fn(),
}));

import { fork } from 'child_process';
import { WorkerManager } from '../../src/core/daemon/worker-manager';

describe('WorkerManager (mocked fork)', () => {
  let mockChild: ReturnType<typeof createMockChildProcess>;
  let manager: WorkerManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChild = createMockChildProcess();
    vi.mocked(fork).mockReturnValue(mockChild);
    manager = new WorkerManager();
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  function readyWorker(sessionId: string): void {
    mockChild.emit('message', { type: 'event', event: 'ready', sessionId });
  }

  it('should fork worker-entry.js on spawnWorker', async () => {
    const p = manager.spawnWorker('spawn-1');
    process.nextTick(() => readyWorker('spawn-1'));
    await p;

    expect(fork).toHaveBeenCalledTimes(1);
    expect(mockChild.send).toHaveBeenCalledWith({ type: 'init', sessionId: 'spawn-1' });
    expect(manager.getWorkerStatus('spawn-1')).toBe('ready');
  });

  it('should send command and receive IPC response', async () => {
    const p = manager.spawnWorker('ipc-1');
    process.nextTick(() => readyWorker('ipc-1'));
    await p;

    const cmdP = manager.sendCommand('ipc-1', {
      type: 'request',
      method: 'session.list',
      params: {},
    });

    process.nextTick(() => {
      const msg = mockChild.send.mock.calls.at(-1)![0] as { id: string };
      mockChild.emit('message', { id: msg.id, type: 'response', result: { sessions: [] } });
    });

    const resp = await cmdP;
    expect(resp.type).toBe('response');
    expect(resp.result).toEqual({ sessions: [] });
  });

  it('should handle command error from worker', async () => {
    const p = manager.spawnWorker('err-1');
    process.nextTick(() => readyWorker('err-1'));
    await p;

    const cmdP = manager.sendCommand('err-1', {
      type: 'request',
      method: 'bad.method',
      params: {},
    });

    process.nextTick(() => {
      const msg = mockChild.send.mock.calls.at(-1)![0] as { id: string };
      mockChild.emit('message', {
        id: msg.id,
        type: 'error',
        error: { code: 'COMMAND_ERROR', message: 'Unknown', tips: [] },
      });
    });

    const resp = await cmdP;
    expect(resp.type).toBe('error');
    expect(resp.error?.code).toBe('COMMAND_ERROR');
  });

  it('should serialize commands to same session', async () => {
    const p = manager.spawnWorker('q-1');
    process.nextTick(() => readyWorker('q-1'));
    await p;

    const sendCallIds: string[] = [];
    const originalSend = mockChild.send;

    mockChild.send = vi.fn((msg: Record<string, unknown>) => {
      if (msg.id && msg.type === 'request') {
        sendCallIds.push(msg.id as string);
      }
      if (msg.type === 'shutdown') {
        process.nextTick(() => mockChild.emit('exit', 0));
      }
    });

    const cmd1 = manager.sendCommand('q-1', {
      type: 'request',
      method: 'cmd1',
      params: {},
    });
    const cmd2 = manager.sendCommand('q-1', {
      type: 'request',
      method: 'cmd2',
      params: {},
    });

    await vi.waitFor(() => expect(sendCallIds.length).toBe(1));

    mockChild.emit('message', { id: sendCallIds[0], type: 'response', result: { n: 1 } });
    const r1 = await cmd1;
    expect((r1.result as Record<string, unknown>).n).toBe(1);

    await vi.waitFor(() => expect(sendCallIds.length).toBe(2));

    mockChild.emit('message', { id: sendCallIds[1], type: 'response', result: { n: 2 } });
    const r2 = await cmd2;
    expect((r2.result as Record<string, unknown>).n).toBe(2);

    mockChild.send = originalSend;
  });

  it('should mark worker as crashed on process error', async () => {
    const p = manager.spawnWorker('crash-1');
    process.nextTick(() => readyWorker('crash-1'));
    await p;

    mockChild.emit('error', new Error('Worker crashed'));
    expect(manager.getWorkerStatus('crash-1')).toBe('crashed');
  });

  it('should mark worker as crashed on non-zero exit', async () => {
    const p = manager.spawnWorker('exit-1');
    process.nextTick(() => readyWorker('exit-1'));
    await p;

    mockChild.emit('exit', 1);
    expect(manager.getWorkerStatus('exit-1')).toBe('crashed');
  });

  it('should not mark crashed on exit code 0', async () => {
    const p = manager.spawnWorker('clean-1');
    process.nextTick(() => readyWorker('clean-1'));
    await p;

    mockChild.emit('exit', 0);
    expect(manager.getWorkerStatus('clean-1')).toBe('ready');
  });

  it('should send shutdown message on killWorker', async () => {
    const p = manager.spawnWorker('kill-1');
    process.nextTick(() => readyWorker('kill-1'));
    await p;

    await manager.killWorker('kill-1');

    expect(mockChild.send).toHaveBeenCalledWith({ type: 'shutdown' });
    expect(manager.getWorkerStatus('kill-1')).toBeNull();
  });

  it('should emit worker:crash event', async () => {
    const handler = vi.fn();
    manager.on('worker:crash', handler);

    const p = manager.spawnWorker('evt-1');
    process.nextTick(() => readyWorker('evt-1'));
    await p;

    mockChild.emit('error', new Error('Boom'));
    expect(handler).toHaveBeenCalledWith('evt-1');
  });

  it('should return error for command to crashed worker', async () => {
    const p = manager.spawnWorker('crash-cmd');
    process.nextTick(() => readyWorker('crash-cmd'));
    await p;

    mockChild.emit('error', new Error('Crash'));

    const resp = await manager.sendCommand('crash-cmd', {
      type: 'request',
      method: 'session.list',
      params: {},
    });
    expect(resp.type).toBe('error');
    expect(resp.error?.code).toBe('WORKER_NOT_FOUND');
  });

  it('should handle heartbeat messages', async () => {
    const p = manager.spawnWorker('hb-1');
    process.nextTick(() => readyWorker('hb-1'));
    await p;

    mockChild.emit('message', { type: 'event', event: 'heartbeat' });
    expect(manager.getWorkerStatus('hb-1')).toBe('ready');
  });

  it('should reject spawn if worker fails to start in time', async () => {
    vi.useFakeTimers();

    const p = manager.spawnWorker('timeout-1');
    vi.advanceTimersByTime(16_000);

    await expect(p).rejects.toThrow('failed to start within timeout');

    vi.useRealTimers();
  });
});
