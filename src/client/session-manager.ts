import { spawn } from 'child_process';
import {
  loadSessionInfo,
  deleteSessionInfo,
  isProcessRunning,
  getSocketPath,
  tip,
} from '../index.js';
import type { SessionInfo } from '../types.js';

export async function startServer(
  serverPath: string,
  sessionName: string,
  cdpEndpoint?: string
): Promise<SessionInfo | null> {
  const args = [serverPath, sessionName];
  if (cdpEndpoint) args.push(cdpEndpoint);

  const serverProcess = spawn('tsx', args, {
    detached: true,
    stdio: 'ignore',
  });
  serverProcess.unref();

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const info = loadSessionInfo(sessionName);
    if (info && isProcessRunning(info.serverPid)) {
      const socket = getSocketPath(sessionName);
      if (socket) return info;
    }
  }

  return null;
}

export async function getOrCreateSession(
  serverPath: string,
  sessionName: string,
  cdpEndpoint?: string
): Promise<{ socketPath: string; info: SessionInfo } | null> {
  let info = loadSessionInfo(sessionName);

  if (info && isProcessRunning(info.serverPid)) {
    const socketPath = getSocketPath(sessionName);
    if (socketPath) {
      if (cdpEndpoint) {
        if (info.isCDP && info.cdpEndpoint === cdpEndpoint) {
          tip(`Session '${sessionName}' 已连接到此 CDP，无需重复指定 --cdp`);
        } else if (info.isCDP) {
          tip(
            `Session '${sessionName}' 已连接到其他 CDP (${info.cdpEndpoint})，如需更换请先 close`
          );
        } else {
          tip(`Session '${sessionName}' 不是 CDP session，如需使用 CDP 请先 close`);
        }
      }
      return { socketPath, info };
    }
  }

  if (info) {
    await deleteSessionInfo(sessionName);
  }

  info = await startServer(serverPath, sessionName, cdpEndpoint);
  if (!info) {
    return null;
  }

  const socketPath = getSocketPath(sessionName);
  return socketPath ? { socketPath, info } : null;
}
