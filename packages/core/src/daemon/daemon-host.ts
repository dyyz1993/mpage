import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { DaemonConfig } from './worker-protocol.js';
import { DEFAULT_DAEMON_CONFIG } from './worker-protocol.js';
import { WorkerManager } from './worker-manager.js';
import { startHttpServer, type HttpServerConfig, type RPCHandler } from './http-server.js';
import { WSServer, type WSServerConfig } from './ws-server.js';

export interface DaemonHostConfig extends DaemonConfig {
  wsServer?: WSServerConfig;
  extraRoutes?: HttpServerConfig['extraRoutes'];
  eventHandler?: (event: string, data: unknown) => void;
  onReady?: (rpcHandler: RPCHandler) => void;
}

export async function runDaemonHost(config: DaemonHostConfig): Promise<void> {
  const fullConfig = { ...DEFAULT_DAEMON_CONFIG, ...config };
  const port = fullConfig.basePort;

  mkdirSync(config.configDir, { recursive: true });

  const workerManager = new WorkerManager({
    workerEntryPath: config.workerEntryPath,
    requestTimeout: fullConfig.requestTimeout,
    heartbeatInterval: fullConfig.heartbeatInterval,
  });

  if (config.eventHandler) {
    workerManager.on('screencastFrame', (data) => config.eventHandler?.('screencastFrame', data));
  }

  const rpcHandler: RPCHandler = async (method, params) => {
    const sessionId = (params.sessionId as string) || 'default';

    if (!workerManager.getActiveWorkers().includes(sessionId)) {
      await workerManager.spawnWorker(sessionId);
    }

    const response = await workerManager.sendCommand(sessionId, {
      type: 'request',
      method,
      params,
      sessionId,
    });

    if (response.type === 'error' && response.error) {
      throw new Error(`${response.error.code}: ${response.error.message}`);
    }

    return response.result;
  };

  startHttpServer({
    port,
    rpcHandler,
    extraRoutes: config.extraRoutes,
  });

  writeFileSync(
    join(config.configDir, 'daemon.json'),
    JSON.stringify({ port, pid: process.pid, startedAt: Date.now() }, null, 2)
  );

  let wsServer: WSServer | undefined;
  if (config.wsServer) {
    wsServer = new WSServer(config.wsServer);
    await wsServer.start();
  }

  const shutdown = async () => {
    await workerManager.shutdown();
    if (wsServer) {
      await wsServer.stop();
    }
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  config.onReady?.(rpcHandler);

  setInterval(() => {}, 24 * 60 * 60 * 1000);
}
