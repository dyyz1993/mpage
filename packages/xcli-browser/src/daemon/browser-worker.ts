import type { WorkerEntryPoint, WorkerContext } from '@dyyz1993/xcli-core';
import { chromium, type Browser } from 'playwright';
import { executePageCommand } from '@dyyz1993/xpage';
import {
  sessions,
  findSession,
  isSessionCommand,
  handleSessionCommand,
  handleStorageCommand,
} from './worker-session-ops.js';
import {
  isRecorderCommand,
  handleRecorderCommand,
  handleReplayCommand,
  isDirectPageCommand,
  handleDirectPageCommand,
} from './worker-recorder-ops.js';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browser) return browser;
  const executablePath =
    process.env.XCLI_CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium';
  browser = await chromium.launch({ executablePath });
  return browser;
}

async function routeCommand(method: string, params: Record<string, unknown>): Promise<unknown> {
  const p = params ?? {};

  if (isSessionCommand(method)) {
    if (method.startsWith('session.')) {
      return handleSessionCommand(method, p);
    }
    return handleStorageCommand(method, p);
  }

  if (isRecorderCommand(method)) {
    if (method.startsWith('recorder.')) {
      return handleRecorderCommand(method, p);
    }
    return handleReplayCommand(method, p);
  }

  if (isDirectPageCommand(method)) {
    return handleDirectPageCommand(method, p);
  }

  if (method.startsWith('page.')) {
    const session = findSession(p.name as string);
    if (!session) return { ok: false, error: 'Session not found' };
    const commandName = method.replace('page.', '');
    const result = await executePageCommand(session.page, commandName, p);
    return { ok: true, ...(result as Record<string, unknown>) };
  }

  throw new Error(`Unknown method: ${method}`);
}

export class BrowserWorker implements WorkerEntryPoint {
  async init(_ctx: WorkerContext): Promise<void> {
    await getBrowser();
  }

  execute(method: string, params: Record<string, unknown>): Promise<unknown> {
    return routeCommand(method, params);
  }

  async destroy(): Promise<void> {
    for (const [, session] of sessions) {
      try {
        await session.context.close();
      } catch {
        // ignore close errors
      }
    }
    sessions.clear();
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore close errors
      }
      browser = null;
    }
  }
}

export { routeCommand, getBrowser };
export { sessions, findSession } from './worker-session-ops.js';
