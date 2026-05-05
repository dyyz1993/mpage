import type { IPCMessage } from './ipc-types.js';

export interface WorkerContext {
  sessionId: string;
  sessionName: string;
  config: Record<string, unknown>;
  ipc: {
    send(type: string, payload: unknown): void;
    onMessage(handler: (msg: IPCMessage) => void): void;
  };
}

export interface WorkerEntryPoint {
  init(ctx: WorkerContext): Promise<void>;
  execute(method: string, params: Record<string, unknown>): Promise<unknown>;
  destroy(): Promise<void>;
}

export interface DaemonConfig {
  configDir: string;
  workerEntryPath: string;
  maxWorkers?: number;
  heartbeatInterval?: number;
  requestTimeout?: number;
  basePort?: number;
}

export const DEFAULT_DAEMON_CONFIG: Required<Omit<DaemonConfig, 'configDir' | 'workerEntryPath'>> =
  {
    maxWorkers: 10,
    heartbeatInterval: 10_000,
    requestTimeout: 30_000,
    basePort: 8054,
  };
