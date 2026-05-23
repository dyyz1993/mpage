import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import {
  SESSION_DIR,
  type SessionInfo,
  daemonRpc,
  type DaemonRpcConfig,
} from '@dyyz1993/xcli-core';
import { randomUUID } from 'crypto';

const DAEMON_CONFIG: DaemonRpcConfig = {
  configDir: resolve(homedir(), '.xcli-browser'),
};

function getDaemonPort(): number {
  const configPath = join(DAEMON_CONFIG.configDir, 'daemon.json');
  if (!existsSync(configPath)) return 0;
  try {
    const cfg = JSON.parse(readFileSync(configPath, 'utf-8')) as { port?: number };
    return cfg.port || 0;
  } catch {
    return 0;
  }
}

export function initDaemonConfig(workerEntryPath: string): void {
  DAEMON_CONFIG.workerEntryPath = workerEntryPath;
}

function ensureSessionDir() {
  mkdirSync(SESSION_DIR, { recursive: true });
}

// eslint-disable-next-line require-await
export async function daemonRequest(
  method: string,
  params?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return daemonRpc(DAEMON_CONFIG, method, params);
}

export function requireSession(name?: string): string {
  const sessionName = name || 'default';
  const sessionFile = join(SESSION_DIR, `${sessionName}.json`);
  if (!existsSync(sessionFile)) {
    throw new Error(`Session '${sessionName}' not found. Use "xcli open <url>" to create one.`);
  }
  return sessionName;
}

// eslint-disable-next-line require-await
export async function getSession(name: string): Promise<SessionInfo | null> {
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

// eslint-disable-next-line require-await
export async function saveSession(session: SessionInfo): Promise<void> {
  const path = join(SESSION_DIR, `${session.name}.json`);
  writeFileSync(path, JSON.stringify(session, null, 2));
}

export async function openSession(name: string, url: string): Promise<SessionInfo> {
  ensureSessionDir();
  const id = randomUUID();
  await daemonRequest('session.create', { sessionId: id, name, url });
  const session: SessionInfo = {
    id,
    name,
    url,
    createdAt: new Date().toISOString(),
  };
  await saveSession(session);
  return session;
}

export async function closeSession(name: string): Promise<void> {
  await daemonRequest('session.close', { name });
}

export async function closeAllSessions(): Promise<void> {
  await daemonRequest('session.closeAll');
}

export async function listSessions(): Promise<Array<{ id: string; name: string }>> {
  const port = getDaemonPort();
  if (!port) return [];
  try {
    const res = await fetch(`http://localhost:${port}/api/sessions`);
    if (res.ok) {
      return (await res.json()) as Array<{ id: string; name: string }>;
    }
  } catch {
    // ignore fetch error
  }
  return [];
}

export async function htmlSession(name?: string): Promise<string> {
  const sessionName = requireSession(name);
  const result = (await daemonRequest('page.html', { name: sessionName })) as { html: string };
  return result.html;
}

export async function screenshotSession(name?: string): Promise<string> {
  const sessionName = requireSession(name);
  const result = (await daemonRequest('page.screenshot', { name: sessionName })) as {
    screenshot: string;
  };
  return `data:image/png;base64,${result.screenshot}`;
}

export interface SnapshotElement {
  ref: string;
  tag: string;
  text: string;
  attrs: Record<string, string>;
}

export async function snapshotSession(
  name?: string,
  interactiveOnly = false
): Promise<SnapshotElement[]> {
  const sessionName = requireSession(name);
  const result = (await daemonRequest('page.snapshot', {
    name: sessionName,
    interactiveOnly,
  })) as { elements: SnapshotElement[] };
  return result.elements || [];
}

export async function gotoSession(name: string, url: string): Promise<{ ok: boolean }> {
  const sessionName = requireSession(name);
  return (await daemonRequest('page.goto', { name: sessionName, url })) as { ok: boolean };
}

export async function refreshSession(name: string): Promise<{ ok: boolean }> {
  const sessionName = requireSession(name);
  return (await daemonRequest('page.reload', { name: sessionName })) as { ok: boolean };
}

export async function navigateSession(
  name: string,
  direction: 'back' | 'forward'
): Promise<{ ok: boolean }> {
  const sessionName = requireSession(name);
  return (await daemonRequest('page.navigate', { name: sessionName, direction })) as {
    ok: boolean;
  };
}

export async function clickSession(name: string, selector: string): Promise<{ ok: boolean }> {
  const sessionName = requireSession(name);
  return (await daemonRequest('page.click', { name: sessionName, selector })) as { ok: boolean };
}

export async function fillSession(
  name: string,
  selector: string,
  text: string
): Promise<{ ok: boolean }> {
  const sessionName = requireSession(name);
  return (await daemonRequest('page.fill', { name: sessionName, selector, text })) as {
    ok: boolean;
  };
}

export async function typeSession(
  name: string,
  selector: string,
  text: string
): Promise<{ ok: boolean }> {
  const sessionName = requireSession(name);
  return (await daemonRequest('page.type', { name: sessionName, selector, text })) as {
    ok: boolean;
  };
}

export async function pressSession(
  name: string,
  key: string,
  selector?: string
): Promise<{ ok: boolean; key: string }> {
  const sessionName = requireSession(name);
  return (await daemonRequest('page.press', { name: sessionName, key, selector })) as {
    ok: boolean;
    key: string;
  };
}

export async function selectSession(
  name: string,
  selector: string,
  value: string
): Promise<{ ok: boolean; value: string }> {
  const sessionName = requireSession(name);
  return (await daemonRequest('page.select', { name: sessionName, selector, value })) as {
    ok: boolean;
    value: string;
  };
}

export async function checkSession(name: string, selector: string): Promise<{ ok: boolean }> {
  const sessionName = requireSession(name);
  return (await daemonRequest('page.check', { name: sessionName, selector })) as { ok: boolean };
}

export async function scrollSession(
  name: string,
  direction: 'up' | 'down',
  distance = 500
): Promise<{ ok: boolean }> {
  const sessionName = requireSession(name);
  const deltaY = direction === 'down' ? distance : -distance;
  return (await daemonRequest('page.scroll', { name: sessionName, deltaX: 0, deltaY })) as {
    ok: boolean;
  };
}

export async function mouseSession(
  name: string,
  action: 'move' | 'down' | 'up' | 'click',
  x?: number,
  y?: number,
  steps?: number
): Promise<{ ok: boolean }> {
  const sessionName = requireSession(name);
  return (await daemonRequest('page.mouse', {
    name: sessionName,
    action,
    x: x || 0,
    y: y || 0,
    steps,
  })) as { ok: boolean };
}

export async function evalScriptSession(name: string, script: string): Promise<unknown> {
  const sessionName = requireSession(name);
  const result = (await daemonRequest('page.eval', { name: sessionName, script })) as {
    result: unknown;
  };
  return result.result;
}

export async function getCookies(
  sessionName?: string
): Promise<
  Array<{ name: string; value: string; domain: string; path: string; [key: string]: unknown }>
> {
  const name = requireSession(sessionName);
  const result = (await daemonRequest('storage.get', { name, type: 'cookies' })) as {
    cookies: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      [key: string]: unknown;
    }>;
  };
  return result.cookies || [];
}

export async function setCookie(
  name: string,
  value: string,
  domain: string,
  sessionName?: string
): Promise<void> {
  const sName = requireSession(sessionName);
  await daemonRequest('storage.set', {
    name: sName,
    type: 'cookies',
    data: { name, value, domain, path: '/' },
  });
}

export async function clearCookies(sessionName?: string): Promise<void> {
  const name = requireSession(sessionName);
  await daemonRequest('storage.clear', { name, type: 'cookies' });
}

export async function getLocalStorage(sessionName?: string): Promise<Record<string, string>> {
  const name = requireSession(sessionName);
  const result = (await daemonRequest('storage.get', { name, type: 'localStorage' })) as {
    localStorage: Record<string, string>;
  };
  return result.localStorage || {};
}

export async function setLocalStorage(
  key: string,
  value: string,
  sessionName?: string
): Promise<void> {
  const name = requireSession(sessionName);
  await daemonRequest('storage.set', { name, type: 'localStorage', key, value });
}

export async function clearLocalStorage(sessionName?: string): Promise<void> {
  const name = requireSession(sessionName);
  await daemonRequest('storage.clear', { name, type: 'localStorage' });
}

export async function waitForSelector(
  name: string,
  selector: string,
  timeout = 30000
): Promise<boolean> {
  const sessionName = requireSession(name);
  const result = (await daemonRequest('page.waitForSelector', {
    name: sessionName,
    selector,
    timeout,
  })) as { found: boolean };
  return result.found;
}

export async function waitForTimeout(name: string, timeout: number): Promise<void> {
  const sessionName = requireSession(name);
  await daemonRequest('page.waitForTimeout', { name: sessionName, timeout });
}

export async function getElementSession(
  name: string,
  property: string,
  selector?: string
): Promise<{ ok: boolean; value: string }> {
  const sessionName = requireSession(name);
  return (await daemonRequest('page.get', { name: sessionName, property, selector })) as {
    ok: boolean;
    value: string;
  };
}
