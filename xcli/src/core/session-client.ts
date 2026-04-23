import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';
import net from 'net';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');
const DAEMON_CONFIG_PATH = join(SESSION_DIR, 'daemon.json');
const DAEMON_SOCKET_PATH = join(SESSION_DIR, 'daemon.sock');

export interface SessionInfo {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

function ensureSessionDir() {
  mkdirSync(SESSION_DIR, { recursive: true });
}

function getDaemonPort(): number {
  if (!existsSync(DAEMON_CONFIG_PATH)) {
    return 0;
  }
  try {
    const config = JSON.parse(readFileSync(DAEMON_CONFIG_PATH, 'utf-8'));
    return config.port || 0;
  } catch {
    return 0;
  }
}

async function checkDaemonRunning(): Promise<boolean> {
  const port = getDaemonPort();
  if (!port) return false;
  try {
    const res = await fetch(`http://localhost:${port}/api/sessions`);
    return res.ok;
  } catch {
    return false;
  }
}

let daemonAutoStartTried = false;

async function ensureDaemon(): Promise<void> {
  if (daemonAutoStartTried) return;
  daemonAutoStartTried = true;

  const running = await checkDaemonRunning();
  if (running) return;

  const daemonPath = join(process.cwd(), 'xcli', 'dist', 'session-daemon.cjs');
  spawn('node', [daemonPath], {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd(),
  }).unref();

  await new Promise<void>((resolve) => {
    const check = async () => {
      if (await checkDaemonRunning()) {
        resolve();
      } else {
        setTimeout(check, 500);
      }
    };
    check();
  });
}

async function daemonRequest(method: string, params?: any): Promise<any> {
  await ensureDaemon();

  if (!existsSync(DAEMON_SOCKET_PATH)) {
    throw new Error('Daemon not running. Use "xcli daemon" to start.');
  }

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ method, params }) + '\n';
    const client = net.createConnection(DAEMON_SOCKET_PATH, () => {
      client.write(body);
      client.end();
    });

    let data = '';
    client.on('data', (chunk) => {
      data += chunk.toString();
    });

    client.on('end', () => {
      try {
        const result = JSON.parse(data.trim());
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch (e) {
        reject(e);
      }
    });

    client.on('error', reject);
    client.setTimeout(60000, () => {
      client.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

export async function openSession(name: string, url: string): Promise<SessionInfo> {
  const result = await daemonRequest('session.open', { name, url });
  const info: SessionInfo = {
    id: result.id,
    name: result.name,
    url: result.url,
    createdAt: new Date().toISOString(),
  };
  ensureSessionDir();
  writeFileSync(join(SESSION_DIR, `${name}.json`), JSON.stringify(info, null, 2));
  return info;
}

export async function htmlSession(name?: string): Promise<string> {
  const result = await daemonRequest('page.html', { name: name || 'default' });
  return result.html;
}

export async function closeSession(name?: string): Promise<void> {
  await daemonRequest('session.close', { name: name || 'default' });
  if (name) {
    const path = join(SESSION_DIR, `${name}.json`);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
}

export async function closeAllSessions(): Promise<void> {
  await daemonRequest('session.closeAll', {});
}

export async function listSessions(): Promise<SessionInfo[]> {
  if (!existsSync(DAEMON_SOCKET_PATH)) return [];
  try {
    const result = await daemonRequest('session.list');
    return result.sessions.map((s: any) => ({
      id: s.id,
      name: s.name,
      url: s.url || '',
      createdAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export function getSession(name: string): SessionInfo | null {
  const path = join(SESSION_DIR, `${name}.json`);
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

export async function getCookies(name?: string): Promise<any[]> {
  const result = await daemonRequest('storage.get', { name: name || 'default', type: 'cookies' });
  return result.cookies || [];
}

export async function setCookie(name: string, cookie: any): Promise<void> {
  await daemonRequest('storage.set', { name, type: 'cookies', data: cookie });
}

export async function clearCookies(name?: string): Promise<void> {
  await daemonRequest('storage.clear', { name: name || 'default', type: 'cookies' });
}

export async function getLocalStorage(name?: string): Promise<Record<string, string>> {
  const result = await daemonRequest('storage.get', {
    name: name || 'default',
    type: 'localStorage',
  });
  return result.localStorage || {};
}

export async function setLocalStorage(name: string, key: string, value: string): Promise<void> {
  await daemonRequest('storage.set', { name, type: 'localStorage', key, value });
}

export async function clearLocalStorage(name?: string): Promise<void> {
  await daemonRequest('storage.clear', { name: name || 'default', type: 'localStorage' });
}

export async function killSession(name: string): Promise<void> {
  await daemonRequest('session.kill', { name });
}
