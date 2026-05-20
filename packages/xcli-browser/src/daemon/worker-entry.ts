import { BrowserWorker } from './browser-worker.js';
import type { IPCMessage, IPCResponse } from '@dyyz1993/xcli-core';
import { runDaemonHost } from '@dyyz1993/xcli-core';
import { homedir } from 'os';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

if (process.argv.includes('--daemon')) {
  const configDir = process.env.XCLI_CONFIG_DIR || resolve(homedir(), '.xcli-browser');
  runDaemonHost({
    configDir,
    workerEntryPath: fileURLToPath(import.meta.url),
  });
} else {
  const worker = new BrowserWorker();
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  const sendToParent = (msg: IPCResponse | Record<string, unknown>): void => {
    if (process.send) process.send(msg);
  };

  const startHeartbeat = (): void => {
    heartbeatInterval = setInterval(() => {
      sendToParent({ type: 'event', event: 'heartbeat' });
    }, 5000);
  };

  const cleanup = async (): Promise<void> => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    await worker.destroy();
  };

  process.on('message', async (msg: IPCMessage | Record<string, unknown>) => {
    if ('type' in msg && msg.type === 'init') {
      startHeartbeat();
      sendToParent({ type: 'event', event: 'ready', sessionId: msg.sessionId });
      return;
    }

    if ('type' in msg && msg.type === 'shutdown') {
      await cleanup();
      process.exit(0);
      return;
    }

    if ('type' in msg && msg.type === 'request') {
      const ipcMsg = msg as IPCMessage;
      try {
        const result = await worker.execute(ipcMsg.method, ipcMsg.params);
        const response: IPCResponse = {
          id: ipcMsg.id,
          type: 'response',
          result: result ?? null,
        };
        sendToParent(response);
      } catch (err) {
        const response: IPCResponse = {
          id: ipcMsg.id,
          type: 'error',
          error: {
            code: 'COMMAND_ERROR',
            message: err instanceof Error ? err.message : String(err),
            tips: [],
          },
        };
        sendToParent(response);
      }
    }
  });

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });
}
