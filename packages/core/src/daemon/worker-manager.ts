import { EventEmitter } from 'events';
import type { IPCMessage, IPCResponse } from './ipc-types.js';
import type { WorkerEntry, PendingRequest } from './worker-types.js';
import {
  DEFAULT_REQUEST_TIMEOUT,
  DEFAULT_HEARTBEAT_INTERVAL,
  DEFAULT_HEARTBEAT_TIMEOUT,
  generateRequestId,
} from './worker-types.js';
import { spawnAndInitWorker, killWorkerProcess } from './worker-lifecycle.js';

export interface WorkerManagerConfig {
  workerEntryPath: string;
  requestTimeout?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
}

export class WorkerManager extends EventEmitter {
  private workers: Map<string, WorkerEntry> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private commandQueues: Map<string, Promise<void>> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly config: Required<WorkerManagerConfig>;

  constructor(config: WorkerManagerConfig) {
    super();
    this.config = {
      workerEntryPath: config.workerEntryPath,
      requestTimeout: config.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT,
      heartbeatInterval: config.heartbeatInterval ?? DEFAULT_HEARTBEAT_INTERVAL,
      heartbeatTimeout: config.heartbeatTimeout ?? DEFAULT_HEARTBEAT_TIMEOUT,
    };
    this.startHealthCheck();
  }

  async spawnWorker(sessionId: string): Promise<void> {
    if (this.workers.has(sessionId)) {
      const existing = this.workers.get(sessionId);
      if (!existing) return;
      if (existing.status !== 'crashed') {
        return;
      }
      this.cleanupWorker(sessionId);
    }

    const ctx = {
      onMessage: (msg: unknown) => {
        this.handleWorkerMessage(sessionId, msg as IPCResponse);
      },
      onCrash: (id: string) => this.onWorkerCrash(id),
    };

    const child = await spawnAndInitWorker(this.config.workerEntryPath, sessionId, ctx);

    const entry: WorkerEntry = {
      process: child,
      sessionId,
      status: 'ready',
      lastHeartbeat: Date.now(),
    };

    this.workers.set(sessionId, entry);
  }

  async killWorker(sessionId: string): Promise<void> {
    const entry = this.workers.get(sessionId);
    if (!entry) return;

    await killWorkerProcess(entry.process);
    this.cleanupWorker(sessionId);
  }

  // eslint-disable-next-line require-await
  async sendCommand(sessionId: string, message: Omit<IPCMessage, 'id'>): Promise<IPCResponse> {
    const entry = this.workers.get(sessionId);
    if (!entry || entry.status === 'crashed') {
      return {
        id: '',
        type: 'error',
        error: {
          code: 'WORKER_NOT_FOUND',
          message: `No active worker for session '${sessionId}'`,
          tips: ['Create a session first'],
        },
      };
    }

    const prev = this.commandQueues.get(sessionId) || Promise.resolve();
    let resolveResult!: (value: IPCResponse) => void;
    let rejectResult!: (reason: unknown) => void;
    const resultPromise = new Promise<IPCResponse>((res, rej) => {
      resolveResult = res;
      rejectResult = rej;
    });

    const chain = prev.then(async () => {
      try {
        const result = await this.sendCommandInternal(sessionId, message);
        resolveResult(result);
      } catch (err) {
        rejectResult(err);
      }
    });
    this.commandQueues.set(
      sessionId,
      chain.catch(() => {})
    );

    return resultPromise;
  }

  private sendCommandInternal(
    sessionId: string,
    message: Omit<IPCMessage, 'id'>
  ): Promise<IPCResponse> {
    const entry = this.workers.get(sessionId);
    if (!entry || entry.status === 'crashed') {
      return Promise.resolve({
        id: '',
        type: 'error',
        error: {
          code: 'WORKER_NOT_FOUND',
          message: `Worker for session '${sessionId}' is not available`,
          tips: [],
        },
      });
    }

    const id = generateRequestId();
    const fullMessage: IPCMessage = { ...message, id, sessionId };

    return new Promise<IPCResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${id} timed out after ${this.config.requestTimeout}ms`));
      }, this.config.requestTimeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      entry.status = 'busy';
      entry.process.send(fullMessage);
    });
  }

  getWorkerStatus(sessionId: string): WorkerEntry['status'] | null {
    return this.workers.get(sessionId)?.status ?? null;
  }

  getActiveWorkers(): string[] {
    return Array.from(this.workers.entries())
      .filter(([, e]) => e.status !== 'crashed')
      .map(([id]) => id);
  }

  onWorkerCrash(sessionId: string): void {
    const entry = this.workers.get(sessionId);
    if (entry) {
      entry.status = 'crashed';
      this.cleanupPendingForSession(sessionId);

      for (const [id, pending] of this.pendingRequests.entries()) {
        clearTimeout(pending.timeout);
        pending.resolve({
          id,
          type: 'error',
          error: {
            code: 'WORKER_CRASHED',
            message: `Worker for session '${sessionId}' has crashed`,
            tips: ['Try restarting the session'],
          },
        });
      }
    }

    this.emit('worker:crash', sessionId);
  }

  async shutdown(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    const killPromises = Array.from(this.workers.keys()).map((id) => this.killWorker(id));
    await Promise.allSettled(killPromises);

    this.workers.clear();
    this.pendingRequests.clear();
    this.commandQueues.clear();
  }

  private handleWorkerMessage(sessionId: string, msg: IPCResponse): void {
    const entry = this.workers.get(sessionId);
    if (!entry) return;

    if (msg.type === 'response' || msg.type === 'error') {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(msg.id);
        entry.status = 'ready';
        pending.resolve(msg);
      }
    }

    if ((msg as unknown as Record<string, unknown>).type === 'event') {
      const eventMsg = msg as unknown as Record<string, unknown>;
      if (eventMsg.event === 'heartbeat') {
        entry.lastHeartbeat = Date.now();
      }
      if (eventMsg.event === 'screencastFrame') {
        this.emit('screencastFrame', {
          sessionId,
          data: eventMsg.data,
        });
      }
    }
  }

  private startHealthCheck(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const [sessionId, entry] of this.workers) {
        if (
          entry.status !== 'crashed' &&
          Date.now() - entry.lastHeartbeat > this.config.heartbeatTimeout
        ) {
          console.warn(`Worker ${sessionId} heartbeat timeout, marking as crashed`);
          this.onWorkerCrash(sessionId);
        }
      }
    }, this.config.heartbeatInterval);
  }

  private cleanupWorker(sessionId: string): void {
    const entry = this.workers.get(sessionId);
    if (entry) {
      try {
        if (entry.process.connected) {
          entry.process.kill('SIGKILL');
        }
      } catch {
        // process may already be dead
      }
    }
    this.workers.delete(sessionId);
    this.commandQueues.delete(sessionId);
  }

  private cleanupPendingForSession(sessionId: string): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      if (id.startsWith(sessionId)) {
        clearTimeout(pending.timeout);
        pending.resolve({
          id,
          type: 'error',
          error: {
            code: 'WORKER_CRASHED',
            message: `Worker for session '${sessionId}' has crashed`,
            tips: [],
          },
        });
        this.pendingRequests.delete(id);
      }
    }
  }
}
