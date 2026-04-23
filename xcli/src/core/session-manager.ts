import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');

export interface SessionInfo {
  name: string;
  url: string;
  pid: number;
  createdAt: string;
}

interface SessionData {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  info: SessionInfo;
}

let currentSession: SessionData | null = null;

function ensureSessionDir() {
  mkdirSync(SESSION_DIR, { recursive: true });
}

export function getCurrentSession(): SessionData | null {
  return currentSession;
}

export async function openSession(name: string, url: string): Promise<SessionInfo> {
  if (currentSession) {
    await closeSession(name);
  }

  const executablePath =
    process.env.XCLI_CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium';
  const browser = await chromium.launch({ executablePath });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(url);

  const browserProcess = browser.process();
  const browserPID = browserProcess ? (await browserProcess).pid : 0;

  const info: SessionInfo = {
    name,
    url,
    pid: browserPID || 0,
    createdAt: new Date().toISOString(),
  };

  currentSession = { browser, context, page, info };

  saveSessionInfo(name, info);

  return info;
}

export async function htmlSession(_name?: string): Promise<string> {
  if (!currentSession) {
    throw new Error('No active session. Use "xcli open <url>" first.');
  }
  return await currentSession.page.content();
}

export async function closeSession(name?: string): Promise<void> {
  if (currentSession) {
    await currentSession.browser.close();
    if (name) {
      removeSessionInfo(name);
    }
    currentSession = null;
  }
}

export async function closeAllSessions(): Promise<void> {
  if (currentSession) {
    await currentSession.browser.close();
    currentSession = null;
  }
  const files = readdirSync(SESSION_DIR).filter((f) => f.endsWith('.json') && f !== 'daemon.json');
  for (const file of files) {
    try {
      unlinkSync(join(SESSION_DIR, file));
    } catch {
      /* ignore */
    }
  }
}

export function listSessions(): SessionInfo[] {
  ensureSessionDir();
  const sessions: SessionInfo[] = [];
  const files = readdirSync(SESSION_DIR).filter((f) => f.endsWith('.json') && f !== 'daemon.json');

  for (const file of files) {
    try {
      const info = JSON.parse(readFileSync(join(SESSION_DIR, file), 'utf-8'));
      sessions.push(info);
    } catch {
      /* ignore */
    }
  }

  return sessions;
}

export function getSession(name: string): SessionInfo | null {
  const path = join(SESSION_DIR, `${name}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function saveSessionInfo(name: string, info: SessionInfo): void {
  ensureSessionDir();
  writeFileSync(join(SESSION_DIR, `${name}.json`), JSON.stringify(info, null, 2));
}

function removeSessionInfo(name: string): void {
  const path = join(SESSION_DIR, `${name}.json`);
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

export async function getCookies(_name?: string): Promise<any[]> {
  if (!currentSession) {
    throw new Error('No active session');
  }
  return await currentSession.context.cookies();
}

export async function setCookie(
  name: string,
  value: string,
  domain: string,
  cookieName: string
): Promise<void> {
  if (!currentSession) {
    throw new Error('No active session');
  }
  await currentSession.context.addCookies([
    {
      name: cookieName,
      value,
      domain,
      path: '/',
    },
  ]);
}

export async function clearCookies(_name?: string): Promise<void> {
  if (!currentSession) {
    throw new Error('No active session');
  }
  await currentSession.context.clearCookies();
}

export async function getLocalStorage(_name?: string): Promise<Record<string, string>> {
  if (!currentSession) {
    throw new Error('No active session');
  }
  return await currentSession.page.evaluate(() => {
    const result: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        result[key] = localStorage.getItem(key) || '';
      }
    }
    return result;
  });
}

export async function setLocalStorage(key: string, value: string, _name?: string): Promise<void> {
  if (!currentSession) {
    throw new Error('No active session');
  }
  await currentSession.page.evaluate(
    ([k, v]) => {
      localStorage.setItem(k, v);
    },
    [key, value]
  );
}

export async function clearLocalStorage(_name?: string): Promise<void> {
  if (!currentSession) {
    throw new Error('No active session');
  }
  await currentSession.page.evaluate(() => {
    localStorage.clear();
  });
}

export function isDaemonRunning(): boolean {
  return currentSession !== null;
}

export async function killAll(): Promise<void> {
  await closeAllSessions();
}

export default {
  openSession,
  htmlSession,
  closeSession,
  closeAllSessions,
  killAll,
  listSessions,
  getSession,
  isDaemonRunning,
  getCookies,
  setCookie,
  clearCookies,
  getLocalStorage,
  setLocalStorage,
  clearLocalStorage,
};
