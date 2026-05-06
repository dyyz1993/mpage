import type { WorkerEntryPoint, WorkerContext } from '@dyyz1993/xcli-core';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { RecorderController, PlaybackEngine, executePageCommand } from '@dyyz1993/xpage';

interface WorkerSession {
  id: string;
  name: string;
  context: BrowserContext;
  page: Page;
  recorder?: RecorderController;
  screencastSessionId?: number;
}

const sessions = new Map<string, WorkerSession>();
let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browser) return browser;
  const executablePath =
    process.env.XCLI_CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium';
  browser = await chromium.launch({ executablePath });
  return browser;
}

function findSession(name: string): WorkerSession | undefined {
  for (const [, session] of sessions) {
    if (session.name === name) return session;
  }
  return undefined;
}

const SESSION_LIFECYCLE_COMMANDS = new Set([
  'session.create',
  'session.close',
  'session.closeAll',
  'session.list',
]);

const RECORDER_COMMANDS = new Set(['recorder.start', 'recorder.stop', 'recorder.status']);

const REPLAY_COMMANDS = new Set(['replay.start']);

const DIRECT_PAGE_COMMANDS: Record<string, string> = {
  'page.snapshot': 'a11y',
  'page.mouse': 'mouse',
  'page.get': 'getProperty',
  'page.navigate': '_navigate',
  'page.http': '_http',
  'page.fetch': '_http',
  'page.addCookie': 'setCookie',
};

const STORAGE_COMMANDS = new Set(['storage.get', 'storage.set', 'storage.clear']);

async function routeCommand(method: string, params: Record<string, unknown>): Promise<unknown> {
  const p = params ?? {};

  if (SESSION_LIFECYCLE_COMMANDS.has(method)) {
    return handleSessionCommand(method, p);
  }

  if (STORAGE_COMMANDS.has(method)) {
    return handleStorageCommand(method, p);
  }

  if (RECORDER_COMMANDS.has(method)) {
    return handleRecorderCommand(method, p);
  }

  if (REPLAY_COMMANDS.has(method)) {
    return handleReplayCommand(method, p);
  }

  if (method in DIRECT_PAGE_COMMANDS) {
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

async function handleSessionCommand(method: string, p: Record<string, unknown>): Promise<unknown> {
  switch (method) {
    case 'session.create': {
      const b = await getBrowser();
      const context = await b.newContext();
      const page = await context.newPage();
      await page.goto(p.url as string);
      const session: WorkerSession = {
        id: p.sessionId as string,
        name: p.name as string,
        context,
        page,
      };
      sessions.set(session.id, session);
      return { id: session.id, name: session.name };
    }

    case 'session.close': {
      for (const [id, session] of sessions) {
        if (session.name === p.name) {
          await session.context.close();
          sessions.delete(id);
          return { ok: true };
        }
      }
      return { ok: true };
    }

    case 'session.closeAll': {
      for (const [, session] of sessions) {
        await session.context.close();
      }
      sessions.clear();
      return { ok: true };
    }

    case 'session.list': {
      return {
        sessions: Array.from(sessions.values()).map((s) => ({ id: s.id, name: s.name })),
      };
    }

    default:
      throw new Error(`Unknown session method: ${method}`);
  }
}

async function handleStorageCommand(method: string, p: Record<string, unknown>): Promise<unknown> {
  switch (method) {
    case 'storage.get': {
      const gs = findSession(p.name as string);
      if (!gs) return p.type === 'cookies' ? { cookies: [] } : { localStorage: {} };
      if (p.type === 'cookies') {
        const result = await executePageCommand(gs.page, 'getCookies', {});
        return result;
      }
      if (p.type === 'localStorage') {
        const result = await executePageCommand(gs.page, 'getLocalStorage', {});
        return { localStorage: (result as Record<string, unknown>).data };
      }
      return p.type === 'cookies' ? { cookies: [] } : { localStorage: {} };
    }

    case 'storage.set': {
      const ss = findSession(p.name as string);
      if (!ss) return { ok: true };
      if (p.type === 'cookies' && p.data) {
        await executePageCommand(ss.page, 'setCookie', p.data as Record<string, unknown>);
      } else if (p.type === 'localStorage' && p.key !== undefined) {
        await executePageCommand(ss.page, 'setLocalStorage', {
          key: p.key as string,
          value: (p.value as string) || '',
        });
      }
      return { ok: true };
    }

    case 'storage.clear': {
      const cs = findSession(p.name as string);
      if (!cs) return { ok: true };
      if (p.type === 'cookies') {
        await executePageCommand(cs.page, 'clearCookies', {});
      } else if (p.type === 'localStorage') {
        await executePageCommand(cs.page, 'clearLocalStorage', {});
      }
      return { ok: true };
    }

    default:
      throw new Error(`Unknown storage method: ${method}`);
  }
}

async function handleRecorderCommand(method: string, p: Record<string, unknown>): Promise<unknown> {
  switch (method) {
    case 'recorder.start': {
      const recSession = findSession(p.name as string);
      if (!recSession) throw new Error('Session not found');
      const recorder = new RecorderController(recSession.page);
      await recorder.start({
        url: p.url as string | undefined,
        name: p.recorderName as string | undefined,
      });
      recSession.recorder = recorder;
      return { ok: true, recordingId: recorder.id };
    }

    case 'recorder.stop': {
      const rSession = findSession(p.name as string);
      if (!rSession || !rSession.recorder) throw new Error('No active recorder for session');
      const recorderResult = await rSession.recorder.stop(p.outputPath as string | undefined);
      rSession.recorder = undefined;
      return {
        ok: true,
        path: recorderResult.path,
        eventCount: recorderResult.session.events.length,
      };
    }

    case 'recorder.status': {
      const sSession = findSession(p.name as string);
      if (!sSession || !sSession.recorder) return { ok: true, status: null };
      return { ok: true, status: sSession.recorder.getStatus() };
    }

    default:
      throw new Error(`Unknown recorder method: ${method}`);
  }
}

async function handleReplayCommand(method: string, p: Record<string, unknown>): Promise<unknown> {
  if (method === 'replay.start') {
    const replaySession = findSession(p.name as string);
    if (!replaySession) throw new Error('Session not found');
    const engine = await PlaybackEngine.fromFile(replaySession.page, p.filePath as string);
    const replayResult = await engine.play({ slowMo: (p.slowMo as number) || 1 });
    return { ok: true, result: replayResult };
  }
  throw new Error(`Unknown replay method: ${method}`);
}

async function handleDirectPageCommand(
  method: string,
  p: Record<string, unknown>
): Promise<unknown> {
  const session = findSession(p.name as string);
  if (!session) return { ok: false, error: 'Session not found' };

  switch (method) {
    case 'page.snapshot': {
      const result = await executePageCommand(session.page, 'a11y', {
        selector: p.selector || 'body',
        format: 'yaml',
      });
      return result;
    }

    case 'page.mouse': {
      return executePageCommand(session.page, 'mouse', {
        action: p.action,
        x: p.x,
        y: p.y,
        steps: p.steps,
      });
    }

    case 'page.get': {
      const prop = p.property as string;
      if (prop === 'url') {
        return { ok: true, property: prop, selector: p.selector, value: session.page.url() };
      }
      if (prop === 'title') {
        const titleResult = await executePageCommand(session.page, 'title', {});
        return {
          ok: true,
          property: prop,
          selector: p.selector,
          value: (titleResult as Record<string, unknown>).title as string,
        };
      }
      if (p.selector) {
        if (prop === 'value') {
          const valueResult = await executePageCommand(session.page, 'inputValue', {
            selector: p.selector,
          });
          return {
            ok: true,
            property: prop,
            selector: p.selector,
            value: (valueResult as Record<string, unknown>).value as string,
          };
        }
        const textResult = await executePageCommand(session.page, 'textContent', {
          selector: p.selector,
        });
        return {
          ok: true,
          property: prop,
          selector: p.selector,
          value: (textResult as Record<string, unknown>).text as string,
        };
      }
      return { ok: true, property: prop, selector: p.selector, value: '' };
    }

    case 'page.navigate': {
      const direction = p.direction as string;
      if (direction === 'back') {
        await executePageCommand(session.page, 'goBack', {});
      } else if (direction === 'forward') {
        await executePageCommand(session.page, 'goForward', {});
      }
      return { ok: true, direction };
    }

    case 'page.http':
    case 'page.fetch': {
      const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (p.headers) Object.assign(requestHeaders, p.headers as Record<string, string>);
      const fetchOptions: RequestInit = {
        method: (p.method as string) || 'GET',
        headers: requestHeaders,
      };
      if (p.body && (p.method === 'POST' || p.method === 'PUT' || p.method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(p.body);
      }
      const response = await session.page.evaluate(
        async ({ u, opts }: { u: string; opts: RequestInit }) => {
          const res = await fetch(u, opts);
          const contentType = res.headers.get('content-type') || '';
          let data;
          if (contentType.includes('json')) {
            data = await res.json();
          } else {
            data = await res.text();
          }
          return { status: res.status, ok: res.ok, contentType, data };
        },
        { u: p.url as string, opts: fetchOptions }
      );
      return response;
    }

    case 'page.addCookie': {
      await executePageCommand(session.page, 'setCookie', p.cookie as Record<string, unknown>);
      return { ok: true, cookie: p.cookie };
    }

    default:
      throw new Error(`Unknown direct page method: ${method}`);
  }
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

export { routeCommand, sessions, findSession, getBrowser };
