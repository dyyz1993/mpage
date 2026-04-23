import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';
import http from 'http';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');
const DAEMON_CONFIG_PATH = join(SESSION_DIR, 'daemon.json');

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

  const port = getDaemonPort();
  if (!port) {
    throw new Error('Daemon not running. Use "xcli daemon" to start.');
  }

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ method, params });
    const options = {
      hostname: 'localhost',
      port,
      path: '/rpc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(body);
    req.end();
  });
}

export async function openSession(name: string, url: string): Promise<SessionInfo> {
  const result = await daemonRequest('open', { name, url });
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
  return await daemonRequest('html', { name: name || 'default' });
}

export async function closeSession(name?: string): Promise<void> {
  await daemonRequest('close', { name: name || 'default' });
  if (name) {
    const path = join(SESSION_DIR, `${name}.json`);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
}

export async function closeAllSessions(): Promise<void> {
  await daemonRequest('closeAll');
  const files = readdirSync(SESSION_DIR).filter(
    (f: string) => f.endsWith('.json') && f !== 'daemon.json'
  );
  for (const file of files) {
    try {
      unlinkSync(join(SESSION_DIR, file));
    } catch {
      /* ignore */
    }
  }
}

export async function listSessions(): Promise<SessionInfo[]> {
  const port = getDaemonPort();
  if (!port) return [];

  try {
    const res = await fetch(`http://localhost:${port}/api/sessions`);
    const data = await res.json();
    return data.map((s: any) => ({
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
  return await daemonRequest('getCookies', { name: name || 'default' });
}

export async function setCookie(name: string, cookie: any): Promise<void> {
  await daemonRequest('setCookie', { name, cookie });
}

export async function clearCookies(name?: string): Promise<void> {
  await daemonRequest('clearCookies', { name: name || 'default' });
}

export async function getLocalStorage(name?: string): Promise<Record<string, string>> {
  return await daemonRequest('getLocalStorage', { name: name || 'default' });
}

export async function setLocalStorage(name: string, key: string, value: string): Promise<void> {
  await daemonRequest('setLocalStorage', { name, key, value });
}

export async function clearLocalStorage(name?: string): Promise<void> {
  await daemonRequest('clearLocalStorage', { name: name || 'default' });
}
