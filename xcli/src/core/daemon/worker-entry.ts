// eslint-disable-next-line no-restricted-imports -- worker 进程：允许直接操作 playwright
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { IPCMessage, IPCResponse } from './ipc-types';
import { RecorderController, PlaybackEngine, STRUCTURE_EXTRACTOR_CODE } from '@dyyz1993/xpage';
// eslint-disable-next-line no-restricted-imports -- worker 进程：允许使用 playwright 类型
import type { Cookie } from 'playwright';

interface WorkerSession {
  id: string;
  name: string;
  context: BrowserContext;
  page: Page;
  recorder?: RecorderController;
  screencastSessionId?: number;
}

type ScreencastFrameCallback = (frame: {
  data: string;
  sessionId: number;
  viewport: { width: number; height: number } | null;
}) => void;

let screencastCallback: ScreencastFrameCallback | null = null;

export function setScreencastCallback(cb: ScreencastFrameCallback): void {
  screencastCallback = cb;
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

async function executeCommand(msg: IPCMessage): Promise<unknown> {
  const { method, params } = msg;
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

    case 'page.html': {
      const hs = findSession(p.name as string);
      if (!hs) return { html: '' };
      return { html: await hs.page.content() };
    }

    case 'page.screenshot': {
      const ss2 = findSession(p.name as string);
      if (!ss2) return { screenshot: '' };
      const screenshot = await ss2.page.screenshot();
      return { screenshot: screenshot.toString('base64') };
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

    case 'page.click': {
      const cs2 = findSession(p.name as string);
      if (!cs2) return { ok: false, error: 'Session not found' };
      await cs2.page.click(p.selector as string);
      return { ok: true, selector: p.selector };
    }

    case 'page.select': {
      const sels = findSession(p.name as string);
      if (!sels) return { ok: false, error: 'Session not found' };
      await sels.page.selectOption(p.selector as string, p.value as string);
      return { ok: true, selector: p.selector, value: p.value };
    }

    case 'page.check': {
      const chs = findSession(p.name as string);
      if (!chs) return { ok: false, error: 'Session not found' };
      await chs.page.check(p.selector as string);
      return { ok: true, selector: p.selector };
    }

    case 'page.press': {
      const ps = findSession(p.name as string);
      if (!ps) return { ok: false, error: 'Session not found' };
      if (p.selector) {
        await ps.page.press(p.selector as string, p.key as string);
      } else {
        await ps.page.keyboard.press(p.key as string);
      }
      return { ok: true, key: p.key, selector: p.selector };
    }

    case 'page.get': {
      const gts = findSession(p.name as string);
      if (!gts) return { ok: false, error: 'Session not found' };
      let value = '';
      const prop = p.property as string;
      if (prop === 'url') {
        value = gts.page.url();
      } else if (prop === 'title') {
        value = await gts.page.title();
      } else if (prop === 'text' && p.selector) {
        value = (await gts.page.locator(p.selector as string).textContent()) || '';
      } else if (prop === 'value' && p.selector) {
        value = (await gts.page.locator(p.selector as string).inputValue()) || '';
      } else if (p.selector) {
        value = (await gts.page.locator(p.selector as string).textContent()) || '';
      }
      return { ok: true, property: prop, selector: p.selector, value };
    }

    case 'page.type': {
      const ts = findSession(p.name as string);
      if (!ts) return { ok: false, error: 'Session not found' };
      await ts.page.type(p.selector as string, p.text as string);
      return { ok: true, selector: p.selector, text: p.text };
    }

    case 'page.fill': {
      const fs = findSession(p.name as string);
      if (!fs) return { ok: false, error: 'Session not found' };
      await fs.page.fill(p.selector as string, p.text as string);
      return { ok: true, selector: p.selector, text: p.text };
    }

    case 'page.scroll': {
      const scs = findSession(p.name as string);
      if (!scs) return { ok: false, error: 'Session not found' };
      const dir = p.direction as string;
      const dist = p.distance as number;
      const scrollAmount = dir === 'up' ? -dist : dist;
      await scs.page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
      return { ok: true, direction: dir, distance: dist };
    }

    case 'page.eval': {
      const es = findSession(p.name as string);
      if (!es) return { error: 'Session not found' };
      try {
        const result = await es.page.evaluate(`(async () => { return ${p.script as string}; })()`);
        return { result };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    }

    case 'page.waitForSelector': {
      const ws = findSession(p.name as string);
      if (!ws) return { ok: false, error: 'Session not found' };
      await ws.page.waitForSelector(p.selector as string, { timeout: p.timeout as number });
      return { ok: true, selector: p.selector };
    }

    case 'page.waitForTimeout': {
      const wts = findSession(p.name as string);
      if (!wts) return { ok: false, error: 'Session not found' };
      await wts.page.waitForTimeout(p.timeout as number);
      return { ok: true, timeout: p.timeout };
    }

    case 'page.goto': {
      const gts2 = findSession(p.name as string);
      if (!gts2) return { ok: false, error: 'Session not found' };
      await gts2.page.goto(p.url as string);
      return { ok: true, url: p.url };
    }

    case 'page.navigate': {
      const ns = findSession(p.name as string);
      if (!ns) return { ok: false, error: 'Session not found' };
      if (p.direction === 'back') {
        await ns.page.goBack();
      } else if (p.direction === 'forward') {
        await ns.page.goForward();
      }
      return { ok: true, direction: p.direction };
    }

    case 'page.refresh': {
      const rs = findSession(p.name as string);
      if (!rs) return { ok: false, error: 'Session not found' };
      await rs.page.reload();
      return { ok: true };
    }

    case 'page.verifySlider': {
      const vs = findSession(p.name as string);
      if (!vs) return { ok: false, error: 'Session not found' };
      const baseUrl = p.baseUrl as string;
      const captchaData = await vs.page.evaluate(async (url: string) => {
        const res = await fetch(url);
        return res.json();
      }, `${baseUrl}/examples/33/slider-captcha`);
      const { captchaId, targetX } = captchaData;
      const result = await vs.page.evaluate(
        async ({ cId, tX, verifyUrl }: { cId: string; tX: number; verifyUrl: string }) => {
          const sliderKnob = document.getElementById('slider-knob');
          const sliderBg = document.getElementById('slider-bg');
          if (!sliderKnob || !sliderBg) return { error: 'Elements not found' };
          const currentLeft = parseInt(sliderKnob.style.left || '0', 10);
          const distance = tX - currentLeft;
          const dispatchDrag = (type: string, clientX: number) => {
            const evt = new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              clientX: clientX,
              clientY: 100,
            });
            sliderKnob.dispatchEvent(evt);
          };
          dispatchDrag('mousedown', sliderBg.getBoundingClientRect().left);
          for (let i = 0; i <= 20; i++) {
            const x = sliderBg.getBoundingClientRect().left + currentLeft + (distance * i) / 20;
            dispatchDrag('mousemove', x);
          }
          dispatchDrag('mouseup', sliderBg.getBoundingClientRect().left + tX);
          const verifyRes = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ captchaId: cId, x: tX }),
          }).then((r) => r.json());
          return { ok: verifyRes.success, targetX: tX, verifyResult: verifyRes };
        },
        { cId: captchaId, tX: targetX, verifyUrl: `${baseUrl}/examples/33/verify-slider` }
      );
      return result;
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
      const result = await rSession.recorder.stop(p.outputPath as string | undefined);
      rSession.recorder = undefined;
      return { ok: true, path: result.path, eventCount: result.session.events.length };
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

    case 'page.structure': {
      const structSession = findSession(p.name as string);
      if (!structSession) throw new Error('Session not found');
      const selector = (p.selector as string) || 'body';
      const structResult = await structSession.page.evaluate(
        `(${STRUCTURE_EXTRACTOR_CODE})({ selector: "${selector}" })`
      );
      return { ok: true, structure: structResult };
    }

    case 'ws.initScreencast': {
      const wsSession = sessions.get(p.sessionId as string);
      if (!wsSession) return { ok: false, error: 'Session not found' };
      const cdpSession = await wsSession.context.newCDPSession(wsSession.page);
      await cdpSession.send('Page.startScreencast', { everyNthFrame: 1 });

      cdpSession.on('Page.screencastFrame', (frame: Record<string, unknown>) => {
        const data = frame.data as string;
        const cdpSessionId = frame.sessionId as number;
        const viewport = wsSession.page.viewportSize();
        const viewportData = viewport ? { width: viewport.width, height: viewport.height } : null;

        wsSession.screencastSessionId = cdpSessionId;

        cdpSession.send('Page.screencastFrameAck', { sessionId: cdpSessionId }).catch(() => {});

        if (screencastCallback) {
          screencastCallback({
            data,
            sessionId: cdpSessionId,
            viewport: viewportData,
          });
        }
      });
      return { ok: true };
    }

    case 'ws.navigate': {
      const navSession = sessions.get(p.sessionId as string);
      if (!navSession) return { ok: false };
      await navSession.page.goto(p.url as string);
      return { ok: true };
    }

    case 'ws.click': {
      const clickSession = sessions.get(p.sessionId as string);
      if (!clickSession) return { ok: false };
      await clickSession.page.mouse.click(p.x as number, p.y as number);
      return { ok: true };
    }

    case 'ws.mousemove': {
      const moveSession = sessions.get(p.sessionId as string);
      if (!moveSession) return { ok: false };
      await moveSession.page.mouse.move(p.x as number, p.y as number);
      return { ok: true };
    }

    case 'ws.key': {
      const keySession = sessions.get(p.sessionId as string);
      if (!keySession) return { ok: false };
      await keySession.page.keyboard.press(p.key as string);
      return { ok: true };
    }

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

function sendToParent(msg: IPCResponse | Record<string, unknown>): void {
  if (process.send) process.send(msg);
}

function startHeartbeat(): void {
  heartbeatInterval = setInterval(() => {
    sendToParent({ type: 'event', event: 'heartbeat' });
  }, 5000);
}

async function cleanup(): Promise<void> {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
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

process.on('message', async (msg: IPCMessage | Record<string, unknown>) => {
  if ('type' in msg && msg.type === 'init') {
    startHeartbeat();
    sendToParent({ type: 'event', event: 'ready', sessionId: msg.sessionId });
    return;
  }

  if ('type' in msg && msg.type === 'shutdown') {
    await cleanup();
    process.exit(0);
    return;
  }

  if ('type' in msg && msg.type === 'request') {
    const ipcMsg = msg as IPCMessage;
    try {
      const result = await executeCommand(ipcMsg);
      const response: IPCResponse = {
        id: ipcMsg.id,
        type: 'response',
        result: result ?? null,
      };
      sendToParent(response);
    } catch (err) {
      const response: IPCResponse = {
        id: ipcMsg.id,
        type: 'error',
        error: {
          code: 'COMMAND_ERROR',
          message: err instanceof Error ? err.message : String(err),
          tips: [],
        },
      };
      sendToParent(response);
    }
  }
});

process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});
