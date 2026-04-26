import { chromium, BrowserContext, Page, Browser } from 'playwright';
import { randomBytes } from 'crypto';
import WebSocket from 'ws';

export interface Session {
  id: string;
  name: string;
  context: BrowserContext;
  page: Page;
  browser: Browser;
  recorder?: import('@dyyz1993/xpage').RecorderController;
}

export const sessions = new Map<string, Session>();
export const wsConnections = new Map<string, Set<WebSocket>>();
let mainBrowser: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;

export function getMainBrowser(): Browser | null {
  return mainBrowser;
}

export function findSession(name: string): Session | undefined {
  for (const [, session] of sessions) {
    if (session.name === name) return session;
  }
  return undefined;
}

async function getBrowser(): Promise<Browser> {
  if (mainBrowser) return mainBrowser;
  if (browserPromise) return browserPromise;

  const executablePath =
    process.env.XCLI_CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium';
  browserPromise = chromium.launch({ executablePath }).then((browser) => {
    mainBrowser = browser;
    return browser;
  });
  return browserPromise;
}

function generateSessionId(): string {
  return randomBytes(4).toString('hex');
}

export async function createSession(sessionName: string, url: string): Promise<Session> {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);

  const id = generateSessionId();
  const session: Session = { id, name: sessionName, context, page, browser };
  sessions.set(id, session);
  wsConnections.set(id, new Set());

  return session;
}

export async function closeSession(name: string) {
  for (const [id, session] of sessions) {
    if (session.name === name) {
      await session.context.close();
      sessions.delete(id);
      wsConnections.delete(id);
      return;
    }
  }
}

export async function closeAll() {
  for (const [, session] of sessions) {
    await session.context.close();
  }
  sessions.clear();
  wsConnections.clear();
}

export function listSessions(): Array<{ id: string; name: string }> {
  return Array.from(sessions.values()).map((s) => ({ id: s.id, name: s.name }));
}

export function killSession(name: string) {
  for (const [id, session] of sessions) {
    if (session.name === name) {
      session.context.close();
      sessions.delete(id);
      wsConnections.delete(id);
      return;
    }
  }
}

export async function closeBrowser() {
  if (mainBrowser) {
    await mainBrowser.close();
    mainBrowser = null;
    browserPromise = null;
  }
}
