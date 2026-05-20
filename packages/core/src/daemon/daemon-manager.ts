import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync, readFileSync, readdirSync, unlinkSync } from 'fs';
import type { DaemonConfig } from './worker-protocol.js';
import { WSServer, type WSServerConfig } from './ws-server.js';

export interface DaemonPaths {
  configDir: string;
  daemonConfigPath: string;
}

export interface ExtendedDaemonConfig extends DaemonConfig {
  wsServer?: WSServerConfig;
}

let wsServer: WSServer | null = null;

function resolvePaths(config: DaemonConfig): DaemonPaths {
  return {
    configDir: config.configDir,
    daemonConfigPath: join(config.configDir, 'daemon.json'),
  };
}

function getDaemonPort(paths: DaemonPaths): number {
  if (!existsSync(paths.daemonConfigPath)) {
    return 0;
  }
  try {
    const cfg = JSON.parse(readFileSync(paths.daemonConfigPath, 'utf-8')) as {
      port?: number;
      pid?: number;
      startedAt?: number;
    };
    return cfg.port || 0;
  } catch {
    return 0;
  }
}

function getDaemonPid(paths: DaemonPaths): number {
  if (!existsSync(paths.daemonConfigPath)) {
    return 0;
  }
  try {
    const cfg = JSON.parse(readFileSync(paths.daemonConfigPath, 'utf-8')) as {
      port?: number;
      pid?: number;
      startedAt?: number;
    };
    return cfg.pid || 0;
  } catch {
    return 0;
  }
}

function removeDaemonConfig(paths: DaemonPaths): void {
  if (existsSync(paths.daemonConfigPath)) {
    unlinkSync(paths.daemonConfigPath);
  }
}

export function isDaemonRunning(config: DaemonConfig): boolean {
  const paths = resolvePaths(config);
  const port = getDaemonPort(paths);
  if (!port) return false;

  try {
    process.kill(getDaemonPid(paths), 0);
    return true;
  } catch {
    removeDaemonConfig(paths);
    return false;
  }
}

export async function startWSServer(config: WSServerConfig): Promise<WSServer> {
  if (wsServer) {
    return wsServer;
  }

  wsServer = new WSServer(config);
  await wsServer.start();
  return wsServer;
}

export async function stopWSServer(): Promise<void> {
  if (wsServer) {
    await wsServer.stop();
    wsServer = null;
  }
}

export function getWSServer(): WSServer | null {
  return wsServer;
}

// eslint-disable-next-line require-await
export async function startDaemon(config: DaemonConfig): Promise<{ port: number; pid: number }> {
  const paths = resolvePaths(config);
  if (isDaemonRunning(config)) {
    const port = getDaemonPort(paths);
    const pid = getDaemonPid(paths);
    return { port, pid };
  }

  const basePort = config.basePort ?? 8054;

  const isTs = config.workerEntryPath.endsWith('.ts');
  const args = isTs
    ? ['--import', 'tsx', config.workerEntryPath, '--daemon']
    : [config.workerEntryPath, '--daemon'];
  const child = spawn('node', args, {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();

  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        removeDaemonConfig(paths);
        reject(new Error('Daemon start timeout'));
      }
    }, 15000);

    const checkInterval = setInterval(() => {
      if (existsSync(paths.daemonConfigPath)) {
        try {
          const cfg = JSON.parse(readFileSync(paths.daemonConfigPath, 'utf-8')) as {
            port?: number;
            pid?: number;
            startedAt?: number;
          };
          if (cfg.port === basePort && cfg.pid) {
            resolved = true;
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve({ port: cfg.port, pid: cfg.pid });
          }
        } catch {
          /* ignore */
        }
      }
    }, 100);

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        clearInterval(checkInterval);
        reject(err);
      }
    });
  });
}

// eslint-disable-next-line require-await
export async function stopDaemon(config: DaemonConfig): Promise<void> {
  const paths = resolvePaths(config);
  if (!isDaemonRunning(config)) {
    removeDaemonConfig(paths);
  } else {
    const pid = getDaemonPid(paths);
    try {
      process.kill(pid, 'SIGTERM');
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== 'ESRCH') {
        throw e;
      }
    }
    removeDaemonConfig(paths);
  }

  await stopWSServer();
}

export function getDaemonStatus(config: DaemonConfig): {
  running: boolean;
  port: number;
  pid: number;
} {
  const paths = resolvePaths(config);
  const port = getDaemonPort(paths);
  const pid = getDaemonPid(paths);
  return {
    running: isDaemonRunning(config),
    port,
    pid,
  };
}

// eslint-disable-next-line require-await
export async function killAllDaemon(config: DaemonConfig): Promise<void> {
  const paths = resolvePaths(config);
  if (!isDaemonRunning(config)) {
    removeDaemonConfig(paths);
  } else {
    const pid = getDaemonPid(paths);
    try {
      process.kill(pid, 'SIGKILL');
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== 'ESRCH') {
        throw e;
      }
    }
    removeDaemonConfig(paths);
  }

  await stopWSServer();

  const files = readdirSync(paths.configDir).filter(
    (f: string) => f.endsWith('.json') && f !== 'daemon.json'
  );
  for (const file of files) {
    try {
      unlinkSync(join(paths.configDir, file));
    } catch {
      /* ignore */
    }
  }
}
