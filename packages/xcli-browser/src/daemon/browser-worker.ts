import type { WorkerEntryPoint, WorkerContext } from '@dyyz1993/xcli-core';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { RecorderController, PlaybackEngine, executePageCommand } from '@dyyz1993/xpage';
import type { Cookie } from 'playwright';

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

interface MpageCommandMapping {
  command: string;
  mapArgs: (p: Record<string, unknown>) => Record<string, unknown>;
  mapResult: (result: unknown, p: Record<string, unknown>) => unknown;
}

const mpageCommandMap: Record<string, MpageCommandMapping> = {
  'page.goto': {
    command: 'goto',
    mapArgs: (p) => ({ url: p.url, waitUntil: p.waitUntil }),
    mapResult: (result, p) => ({ ok: true, ...(result as Record<string, unknown>), url: p.url }),
  },
  'page.click': {
    command: 'click',
    mapArgs: (p) => ({ selector: p.selector }),
    mapResult: (_r, p) => ({ ok: true, selector: p.selector }),
  },
  'page.fill': {
    command: 'fill',
    mapArgs: (p) => ({ selector: p.selector, value: p.text }),
    mapResult: (_r, p) => ({ ok: true, selector: p.selector, text: p.text }),
  },
  'page.type': {
    command: 'type',
    mapArgs: (p) => ({ selector: p.selector, text: p.text }),
    mapResult: (_r, p) => ({ ok: true, selector: p.selector, text: p.text }),
  },
  'page.press': {
    command: 'press',
    mapArgs: (p) => ({ selector: p.selector, key: p.key }),
    mapResult: (_r, p) => ({ ok: true, key: p.key, selector: p.selector }),
  },
  'page.select': {
    command: 'select',
    mapArgs: (p) => ({ selector: p.selector, value: p.value }),
    mapResult: (_r, p) => ({ ok: true, selector: p.selector, value: p.value }),
  },
  'page.check': {
    command: 'check',
    mapArgs: (p) => ({ selector: p.selector }),
    mapResult: (_r, p) => ({ ok: true, selector: p.selector }),
  },
  'page.html': {
    command: 'html',
    mapArgs: (p) => ({ selector: p.selector, clean: p.clean }),
    mapResult: (result) => result,
  },
  'page.screenshot': {
    command: 'screenshotBase64',
    mapArgs: (p) => ({ fullPage: p.fullPage, type: p.type }),
    mapResult: (result) => result,
  },
  'page.scroll': {
    command: 'scroll',
    mapArgs: (p) => {
      const dir = p.direction as string;
      const dist = p.distance as number;
      if (dir === 'up') return { x: 0, y: -dist };
      if (dir === 'down') return { x: 0, y: dist };
      return { x: p.x, y: p.y };
    },
    mapResult: (_r, p) => ({ ok: true, direction: p.direction, distance: p.distance }),
  },
  'page.eval': {
    command: 'evaluateRaw',
    mapArgs: (p) => ({ script: p.script }),
    mapResult: (result) => result,
  },
  'page.waitForSelector': {
    command: 'waitForSelector',
    mapArgs: (p) => ({ selector: p.selector, timeout: p.timeout }),
    mapResult: (_r, p) => ({ ok: true, selector: p.selector }),
  },
  'page.waitForTimeout': {
    command: 'wait',
    mapArgs: (p) => ({ timeout: p.timeout }),
    mapResult: (_r, p) => ({ ok: true, timeout: p.timeout }),
  },
  'page.refresh': {
    command: 'reload',
    mapArgs: () => ({}),
    mapResult: () => ({ ok: true }),
  },
  'page.structure': {
    command: 'structure',
    mapArgs: (p) => ({ selector: p.selector || 'body' }),
    mapResult: (result) => ({ ok: true, ...(result as Record<string, unknown>) }),
  },
};

async function executeMpageCommand(
  page: Page,
  mapping: MpageCommandMapping,
  p: Record<string, unknown>
): Promise<unknown> {
  const mpageArgs = mapping.mapArgs(p);
  const result = await executePageCommand(page, mapping.command, mpageArgs);
  return mapping.mapResult(result, p);
}

async function routeCommand(method: string, params: Record<string, unknown>): Promise<unknown> {
  const p = params ?? {};

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

    case 'storage.get': {
      const gs = findSession(p.name as string);
      if (!gs) return p.type === 'cookies' ? { cookies: [] } : { localStorage: {} };
      if (p.type === 'cookies') {
        const cookies = await gs.context.cookies();
        return { cookies };
      }
      if (p.type === 'localStorage') {
        const lsData = await gs.page.evaluate(() => {
          const result: Record<string, string> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) result[key] = localStorage.getItem(key) || '';
          }
          return result;
        });
        return { localStorage: lsData };
      }
      return p.type === 'cookies' ? { cookies: [] } : { localStorage: {} };
    }

    case 'storage.set': {
      const ss = findSession(p.name as string);
      if (!ss) return { ok: true };
      if (p.type === 'cookies' && p.data) {
        await ss.context.addCookies([p.data as Cookie]);
      } else if (p.type === 'localStorage' && p.key !== undefined) {
        await ss.page.evaluate(
          ([k, v]) => localStorage.setItem(k, v),
          [p.key as string, (p.value as string) || '']
        );
      }
      return { ok: true };
    }

    case 'storage.clear': {
      const cs = findSession(p.name as string);
      if (!cs) return { ok: true };
      if (p.type === 'cookies') {
        await cs.context.clearCookies();
      } else if (p.type === 'localStorage') {
        await cs.page.evaluate(() => localStorage.clear());
      }
      return { ok: true };
    }

    case 'page.snapshot': {
      const snps = findSession(p.name as string);
      if (!snps) return { elements: [] };
      const elements = await snps.page.evaluate(
        (interactive: boolean) => {
          const allElements = document.querySelectorAll(
            interactive ? 'a, button, input, select, textarea, [onclick], [role="button"]' : '*'
          );
          const results: Array<{ tag: string; text: string; attrs: Record<string, string> }> = [];
          const seen = new Set<string>();

          allElements.forEach((el) => {
            const tag = el.tagName.toLowerCase();
            const text = el.textContent?.trim().slice(0, 100) || '';
            const attrs: Record<string, string> = {};
            for (const attr of el.attributes) {
              attrs[attr.name] = attr.value;
            }
            const key = `${tag}-${text}-${Object.keys(attrs).join(',')}`;
            if (!seen.has(key) && (text || tag === 'img' || tag === 'input')) {
              seen.add(key);
              results.push({ tag, text, attrs });
            }
          });

          return results.slice(0, 100).map((item, idx) => ({
            ref: `@e${idx + 1}`,
            ...item,
          }));
        },
        (p.interactiveOnly as boolean) || false
      );
      return { elements };
    }

    case 'page.mouse': {
      const ms = findSession(p.name as string);
      if (!ms) return { ok: false, error: 'Session not found' };
      const action = p.action as string;
      const x = p.x as number;
      const y = p.y as number;
      const steps = p.steps as number | undefined;
      if (action === 'move') {
        await ms.page.mouse.move(x, y, { steps: steps || 1 });
      } else if (action === 'down') {
        await ms.page.mouse.down();
      } else if (action === 'up') {
        await ms.page.mouse.up();
      } else if (action === 'click') {
        await ms.page.mouse.click(x, y);
      }
      return { ok: true, action, x, y };
    }

    case 'page.get': {
      const gts = findSession(p.name as string);
      if (!gts) return { ok: false, error: 'Session not found' };
      const prop = p.property as string;
      if (prop === 'url') {
        return { ok: true, property: prop, selector: p.selector, value: gts.page.url() };
      }
      if (prop === 'title') {
        const titleResult = await executePageCommand(gts.page, 'title', {});
        return {
          ok: true,
          property: prop,
          selector: p.selector,
          value: (titleResult as Record<string, unknown>).title as string,
        };
      }
      if (p.selector) {
        if (prop === 'value') {
          const valueResult = await executePageCommand(gts.page, 'inputValue', {
            selector: p.selector,
          });
          return {
            ok: true,
            property: prop,
            selector: p.selector,
            value: (valueResult as Record<string, unknown>).value as string,
          };
        }
        const textResult = await executePageCommand(gts.page, 'textContent', {
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
      const ns = findSession(p.name as string);
      if (!ns) return { ok: false, error: 'Session not found' };
      const direction = p.direction as string;
      if (direction === 'back') {
        await executePageCommand(ns.page, 'goBack', {});
      } else if (direction === 'forward') {
        await executePageCommand(ns.page, 'goForward', {});
      }
      return { ok: true, direction };
    }

    case 'page.http':
    case 'page.fetch': {
      const fts = findSession(p.name as string);
      if (!fts) return { ok: false, error: 'Session not found' };
      const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (p.headers) Object.assign(requestHeaders, p.headers as Record<string, string>);
      const fetchOptions: RequestInit = {
        method: (p.method as string) || 'GET',
        headers: requestHeaders,
      };
      if (p.body && (p.method === 'POST' || p.method === 'PUT' || p.method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(p.body);
      }
      const response = await fts.page.evaluate(
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
      const acs = findSession(p.name as string);
      if (!acs) return { ok: false, error: 'Session not found' };
      await acs.context.addCookies([p.cookie as Cookie]);
      return { ok: true, cookie: p.cookie };
    }

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

    case 'replay.start': {
      const replaySession = findSession(p.name as string);
      if (!replaySession) throw new Error('Session not found');
      const engine = await PlaybackEngine.fromFile(replaySession.page, p.filePath as string);
      const replayResult = await engine.play({ slowMo: (p.slowMo as number) || 1 });
      return { ok: true, result: replayResult };
    }

    default: {
      if (method in mpageCommandMap) {
        const session = findSession(p.name as string);
        if (!session) return { ok: false, error: 'Session not found' };
        return executeMpageCommand(session.page, mpageCommandMap[method], p);
      }
      throw new Error(`Unknown method: ${method}`);
    }
  }
}

export class BrowserWorker implements WorkerEntryPoint {
  async init(_ctx: WorkerContext): Promise<void> {
    await getBrowser();
  }

  // eslint-disable-next-line require-await
  async execute(method: string, params: Record<string, unknown>): Promise<unknown> {
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
