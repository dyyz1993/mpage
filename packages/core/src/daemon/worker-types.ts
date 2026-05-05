import { randomBytes } from 'crypto';
import type { ChildProcess } from 'child_process';
import type { IPCResponse } from './ipc-types.js';

export interface WorkerEntry {
  process: ChildProcess;
  sessionId: string;
  status: 'starting' | 'ready' | 'busy' | 'crashed';
  lastHeartbeat: number;
}

export interface PendingRequest {
  resolve: (value: IPCResponse) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export const DEFAULT_REQUEST_TIMEOUT = 30_000;
export const DEFAULT_HEARTBEAT_INTERVAL = 10_000;
export const DEFAULT_HEARTBEAT_TIMEOUT = 30_000;

export function generateRequestId(): string {
  return randomBytes(4).toString('hex');
}
