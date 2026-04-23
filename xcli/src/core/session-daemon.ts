import { chromium, BrowserContext, Page, Browser } from 'playwright';
import { createServer as createHttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { parse } from 'url';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'fs';
import { createServer as createNetServer } from 'net';
import { join } from 'path';
import { homedir } from 'os';
import { randomBytes } from 'crypto';

const SWAGGER_JSON = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'core', 'swagger.json'), 'utf-8')
);

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');
const DAEMON_CONFIG_PATH = join(SESSION_DIR, 'daemon.json');
const DAEMON_SOCKET_PATH = join(SESSION_DIR, 'daemon.sock');
const VIEWER_PORT = 8054;
const VIEWER_HTML = readFileSync(join(process.cwd(), 'src', 'viewer.html'), 'utf-8');

function ensureSessionDir() {
  mkdirSync(SESSION_DIR, { recursive: true });
}

function saveDaemonConfig(pid: number) {
  ensureSessionDir();
  const config = { pid, port: VIEWER_PORT, startedAt: new Date().toISOString() };
  writeFileSync(DAEMON_CONFIG_PATH, JSON.stringify(config));
}

function generateSessionId(): string {
  return randomBytes(4).toString('hex');
}

interface Session {
  id: string;
  name: string;
  context: BrowserContext;
  page: Page;
  browser: Browser;
}

const sessions = new Map<string, Session>();
const wsConnections = new Map<string, Set<WebSocket>>();
let mainBrowser: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;

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

async function createSession(sessionName: string, url: string): Promise<Session> {
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

async function closeSession(name: string) {
  for (const [id, session] of sessions) {
    if (session.name === name) {
      await session.context.close();
      sessions.delete(id);
      wsConnections.delete(id);
      return;
    }
  }
}

async function closeAll() {
  for (const [, session] of sessions) {
    await session.context.close();
  }
  sessions.clear();
  wsConnections.clear();
}

function listSessions(): Array<{ id: string; name: string }> {
  return Array.from(sessions.values()).map((s) => ({ id: s.id, name: s.name }));
}

async function handleRPCCommandAsync(method: string, params?: any): Promise<any> {
  switch (method) {
    case 'session.open':
      return await createSession(params.name, params.url);
    case 'session.close':
      await closeSession(params.name);
      return { ok: true };
    case 'session.closeAll':
      await closeAll();
      return { ok: true };
    case 'session.list':
      return { sessions: listSessions() };
    case 'session.kill':
      killSession(params.name);
      return { ok: true };
    case 'storage.get':
      return getStorage(params.name, params.type);
    case 'storage.set':
      setStorage(params.name, params.type, params.key, params.value, params.data);
      return { ok: true };
    case 'storage.clear':
      clearStorage(params.name, params.type);
      return { ok: true };
    case 'page.html':
      return await getPageHtml(params.name);
    case 'page.screenshot':
      return await getPageScreenshot(params.name);
    case 'page.snapshot':
      return await getPageSnapshot(params.name, params.interactiveOnly || false);
    case 'page.mouse':
      return await handlePageMouse(params.name, params.action, params.x, params.y, params.steps);
    case 'page.click':
      return await handlePageClick(params.name, params.selector);
    case 'page.type':
      return await handlePageType(params.name, params.selector, params.text);
    case 'page.fill':
      return await handlePageFill(params.name, params.selector, params.text);
    case 'page.scroll':
      return await handlePageScroll(params.name, params.direction, params.distance);
    case 'page.eval':
      return await handlePageEval(params.name, params.script);
    case 'page.waitForSelector':
      return await handlePageWaitForSelector(params.name, params.selector, params.timeout);
    case 'page.waitForTimeout':
      return await handlePageWaitForTimeout(params.name, params.timeout);
    case 'page.goto':
      return await handlePageGoto(params.name, params.url);
    case 'page.navigate':
      return await handlePageNavigate(params.name, params.direction);
    case 'page.refresh':
      return await handlePageRefresh(params.name);
    case 'page.verifySlider':
      return await handlePageVerifySlider(params.name, params.baseUrl);
    case 'page.http':
      return await handlePageHttp(
        params.name,
        params.method,
        params.url,
        params.body,
        params.headers
      );
    case 'page.fetch':
      return await handlePageFetch(
        params.name,
        params.method,
        params.url,
        params.body,
        params.headers
      );
    case 'page.addCookie':
      return await handlePageAddCookie(params.name, params.cookie);
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

function killSession(name: string) {
  for (const [id, session] of sessions) {
    if (session.name === name) {
      session.context.close();
      sessions.delete(id);
      wsConnections.delete(id);
      return;
    }
  }
}

async function getStorage(name: string, type: string) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      if (type === 'cookies') {
        const cookies = await session.context.cookies();
        return { cookies };
      } else if (type === 'localStorage') {
        const localStorage = await session.page.evaluate(() => {
          const result: Record<string, string> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) result[key] = localStorage.getItem(key) || '';
          }
          return result;
        });
        return { localStorage };
      }
    }
  }
  return type === 'cookies' ? { cookies: [] } : { localStorage: {} };
}

function setStorage(name: string, type: string, key?: string, value?: string, data?: any) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      if (type === 'cookies' && data) {
        session.context.addCookies([data]);
      } else if (type === 'localStorage' && key !== undefined) {
        session.page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value || '']);
      }
    }
  }
}

function clearStorage(name: string, type: string) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      if (type === 'cookies') {
        session.context.clearCookies();
      } else if (type === 'localStorage') {
        session.page.evaluate(() => localStorage.clear());
      }
    }
  }
}

async function getPageHtml(name: string) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      return { html: await session.page.content() };
    }
  }
  return { html: '' };
}

async function getPageScreenshot(name: string) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      const screenshot = await session.page.screenshot();
      return { screenshot: screenshot.toString('base64') };
    }
  }
  return { screenshot: '' };
}

async function getPageSnapshot(name: string, interactiveOnly: boolean) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      const elements = await session.page.evaluate((interactive: boolean) => {
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
      }, interactiveOnly);

      return { elements };
    }
  }
  return { elements: [] };
}

async function handlePageMouse(name: string, action: string, x: number, y: number, steps?: number) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      if (action === 'move') {
        await session.page.mouse.move(x, y, { steps: steps || 1 });
      } else if (action === 'down') {
        await session.page.mouse.down();
      } else if (action === 'up') {
        await session.page.mouse.up();
      } else if (action === 'click') {
        await session.page.mouse.click(x, y);
      }
      return { ok: true, action, x, y };
    }
  }
  return { ok: false, error: 'Session not found' };
}

async function handlePageClick(name: string, selector: string) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      await session.page.click(selector);
      return { ok: true, selector };
    }
  }
  return { ok: false, error: 'Session not found' };
}

async function handlePageType(name: string, selector: string, text: string) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      await session.page.type(selector, text);
      return { ok: true, selector, text };
    }
  }
  return { ok: false, error: 'Session not found' };
}

async function handlePageFill(name: string, selector: string, text: string) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      await session.page.fill(selector, text);
      return { ok: true, selector, text };
    }
  }
  return { ok: false, error: 'Session not found' };
}

async function handlePageScroll(name: string, direction: string, distance: number) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      const scrollAmount = direction === 'up' ? -distance : distance;
      await session.page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
      return { ok: true, direction, distance };
    }
  }
  return { ok: false, error: 'Session not found' };
}

async function handlePageEval(name: string, script: string) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      try {
        const result = await session.page.evaluate(`(async () => { return ${script}; })()`);
        return { result };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    }
  }
  return { error: 'Session not found' };
}

async function handlePageWaitForSelector(name: string, selector: string, timeout: number) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      await session.page.waitForSelector(selector, { timeout });
      return { ok: true, selector };
    }
  }
  return { ok: false, error: 'Session not found' };
}

async function handlePageWaitForTimeout(name: string, timeout: number) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      await session.page.waitForTimeout(timeout);
      return { ok: true, timeout };
    }
  }
  return { ok: false, error: 'Session not found' };
}

async function handlePageGoto(name: string, url: string) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      await session.page.goto(url);
      return { ok: true, url };
    }
  }
  return { ok: false, error: 'Session not found' };
}

async function handlePageNavigate(name: string, direction: string) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      if (direction === 'back') {
        await session.page.goBack();
      } else if (direction === 'forward') {
        await session.page.goForward();
      }
      return { ok: true, direction };
    }
  }
  return { ok: false, error: 'Session not found' };
}

async function handlePageRefresh(name: string) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      await session.page.reload();
      return { ok: true };
    }
  }
  return { ok: false, error: 'Session not found' };
}

async function handlePageVerifySlider(name: string, baseUrl: string) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      const captchaData = await session.page.evaluate(async (url) => {
        const res = await fetch(url);
        return res.json();
      }, `${baseUrl}/examples/33/slider-captcha`);

      const { captchaId, targetX } = captchaData;

      const result = await session.page.evaluate(
        async ({ cId, tX, verifyUrl }) => {
          const sliderKnob = document.getElementById('slider-knob');
          const sliderBg = document.getElementById('slider-bg');
          if (!sliderKnob || !sliderBg) return { error: 'Elements not found' };

          const currentLeft = parseInt(sliderKnob.style.left || '0', 10);
          const distance = tX - currentLeft;

          const dispatchDrag = (type, clientX) => {
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
  }
  return { ok: false, error: 'Session not found' };
}

async function handlePageHttp(
  name: string,
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      const result = await session.page.evaluate(
        async ({ m, u, b, h }) => {
          const res = await fetch(u, {
            method: m,
            headers: { 'Content-Type': 'application/json', ...h },
            body: b ? JSON.stringify(b) : undefined,
          });
          const contentType = res.headers.get('content-type') || '';
          let data;
          if (contentType.includes('json')) {
            data = await res.json();
          } else {
            data = await res.text();
          }
          return { status: res.status, ok: res.ok, contentType, data };
        },
        { m: method, u: url, b: body, h: headers }
      );
      return result;
    }
  }
  return { ok: false, error: 'Session not found' };
}

async function handlePageFetch(
  name: string,
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (headers) {
        Object.assign(requestHeaders, headers);
      }

      const fetchOptions: RequestInit = {
        method: method || 'GET',
        headers: requestHeaders,
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await session.page.evaluate(
        async ({ u, opts }) => {
          const res = await fetch(u, opts);
          const contentType = res.headers.get('content-type') || '';
          let data;
          if (contentType.includes('json')) {
            data = await res.json();
          } else {
            data = await res.text();
          }
          return {
            status: res.status,
            ok: res.ok,
            contentType,
            data,
          };
        },
        { u: url, opts: fetchOptions }
      );

      return response;
    }
  }
  return { ok: false, error: 'Session not found' };
}

async function handlePageAddCookie(name: string, cookie: any) {
  for (const [, session] of sessions) {
    if (session.name === name) {
      await session.context.addCookies([cookie]);
      return { ok: true, cookie };
    }
  }
  return { ok: false, error: 'Session not found' };
}

async function handleHttpRequest(req: any, res: any) {
  const { pathname } = parse(req.url || '', true);

  if (pathname === '/' || pathname === '/docs') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getSwaggerUI());
    return;
  }

  if (pathname === '/swagger.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(SWAGGER_JSON, null, 2));
    return;
  }

  if (pathname === '/viewer.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(VIEWER_HTML);
    return;
  }

  if (pathname === '/api/sessions') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(listSessions()));
    return;
  }

  if (pathname === '/rpc') {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const { method, params } = JSON.parse(body);
        const result = await handleRPCCommandAsync(method, params);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}

function getSwaggerUI(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>XCLI Daemon API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: "/swagger.json",
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset]
      });
    };
  </script>
</body>
</html>`;
}

async function handleWebSocket(ws: WebSocket, sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) {
    ws.close();
    return;
  }

  const conns = wsConnections.get(sessionId);
  if (conns) conns.add(ws);

  ws.on('close', () => {
    conns?.delete(ws);
  });

  const cdpSession = await session.context.newCDPSession(session.page);
  await cdpSession.send('Page.startScreencast', { everyFrame: true });

  cdpSession.on('Page.screencastFrame', (frame: any) => {
    const data = frame.data;
    const sessionId2 = frame.sessionId;
    const metadata = frame.metadata || {};
    const viewport = session.page.viewportSize();
    const viewportData = viewport ? { width: viewport.width, height: viewport.height } : null;

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'screenshot',
          data,
          sessionId: sessionId2,
          viewport: viewportData,
          metadata,
        })
      );
    }
    cdpSession.send('Page.screencastFrameAck', { sessionId: sessionId2 }).catch(() => {});
  });

  ws.on('message', async (msg: any) => {
    try {
      const cmd = JSON.parse(msg.toString());
      if (cmd.type === 'navigate') {
        await session!.page.goto(cmd.url);
      } else if (cmd.type === 'click') {
        await session!.page.mouse.click(cmd.x, cmd.y);
      } else if (cmd.type === 'mousemove') {
        await session!.page.mouse.move(cmd.x, cmd.y);
      } else if (cmd.type === 'key') {
        await session!.page.keyboard.press(cmd.key);
      }
    } catch {}
  });
}

async function main() {
  ensureSessionDir();

  if (existsSync(DAEMON_SOCKET_PATH)) {
    try {
      unlinkSync(DAEMON_SOCKET_PATH);
    } catch {}
  }

  const httpServer = createHttpServer(handleHttpRequest);
  httpServer.listen(VIEWER_PORT, () => {
    console.log(`HTTP server listening on port ${VIEWER_PORT}`);
  });

  const wss = new WebSocketServer({ noServer: true });
  httpServer.on('upgrade', (req, socket, head) => {
    const { pathname, query } = parse(req.url || '', true);
    if (pathname === '/ws') {
      const sessionId = query.s as string;
      wss.handleUpgrade(req, socket, head, (ws) => {
        handleWebSocket(ws, sessionId);
      });
    } else {
      socket.destroy();
    }
  });

  const socketServer = createNetServer((socket) => {
    let data = '';
    socket.on('data', (chunk) => {
      data += chunk.toString();
    });
    socket.on('close', async () => {});
    socket.on('end', async () => {
      try {
        if (!data.trim()) {
          return;
        }
        const { method, params } = JSON.parse(data.trim());
        const result = await handleRPCCommandAsync(method, params);
        socket.write(JSON.stringify(result) + '\n');
        socket.end();
      } catch (err: any) {
        try {
          socket.write(JSON.stringify({ error: err.message }) + '\n');
          socket.end();
        } catch {
          socket.end();
        }
      }
    });
    socket.on('error', () => {});
  });

  socketServer.listen(DAEMON_SOCKET_PATH, () => {
    console.log(`Daemon listening on ${DAEMON_SOCKET_PATH}`);
  });

  saveDaemonConfig(process.pid);

  process.on('SIGINT', async () => {
    await closeAll();
    if (mainBrowser) await mainBrowser.close();
    httpServer.close();
    socketServer.close();
    process.exit(0);
  });
}

main().catch(console.error);
