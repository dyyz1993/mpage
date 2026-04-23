import { spawn, ChildProcess } from 'child_process';
import { createServer as createHttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { parse } from 'url';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'fs';
import { createServer as createNetServer } from 'net';
import { join } from 'path';
import { homedir } from 'os';
import { randomBytes } from 'crypto';

const SWAGGER_JSON = JSON.parse(
  readFileSync(join(process.cwd(), 'xcli', 'src', 'core', 'swagger.json'), 'utf-8')
);

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');
const DAEMON_CONFIG_PATH = join(SESSION_DIR, 'daemon.json');
const DAEMON_SOCKET_PATH = join(SESSION_DIR, 'daemon.sock');
const VIEWER_PORT = 8054;
const VIEWER_HTML = readFileSync(join(process.cwd(), 'xcli', 'src', 'viewer.html'), 'utf-8');

function ensureSessionDir() {
  mkdirSync(SESSION_DIR, { recursive: true });
}

function saveDaemonConfig(port: number, pid: number) {
  ensureSessionDir();
  writeFileSync(
    DAEMON_CONFIG_PATH,
    JSON.stringify({ port, pid, startedAt: new Date().toISOString() })
  );
}

function generateSessionId(): string {
  return randomBytes(4).toString('hex');
}

interface BrowserProcess {
  id: string;
  name: string;
  process: ChildProcess;
}

const browsers = new Map<string, BrowserProcess>();
const wsConnections = new Map<string, Set<WebSocket>>();

function createBrowserProcess(id: string, sessionName: string, url: string): Promise<void> {
  return new Promise((resolve) => {
    const script = `
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('${url}');
  process.send({ type: 'ready' });

  let cdpsession = null;
  let screencastActive = false;

  process.on('message', async (msg) => {
    if (msg.type === 'start' && !screencastActive) {
      cdpsession = await page.context().newCDPSession(page);
      await cdpsession.send('Page.startScreencast', { everyFrame: true });
      screencastActive = true;

      const viewport = page.viewportSize();
      const viewportData = viewport ? { width: viewport.width, height: viewport.height } : null;

      cdpsession.on('Page.screencastFrame', (frame) => {
        const data = frame.data;
        const sessionId = frame.sessionId;
        const metadata = frame.metadata || {};
        process.send({
          type: 'screenshot',
          data: data,
          sessionId: sessionId,
          viewport: viewportData,
          metadata: metadata
        });
        cdpsession.send('Page.screencastFrameAck', { sessionId: sessionId }).catch(() => {});
      });

    } else if (msg.type === 'stop' && screencastActive) {
      await cdpsession.send('Page.stopScreencast').catch(() => {});
      screencastActive = false;
      cdpsession = null;

    } else if (msg.type === 'navigate') {
      await page.goto(msg.url);

    } else if (msg.type === 'click') {
      await page.mouse.click(msg.x, msg.y);

    } else if (msg.type === 'mousemove') {
      await page.mouse.move(msg.x, msg.y);

    } else if (msg.type === 'key') {
      await page.keyboard.press(msg.key);
    }
  });
})();
`;

    const child = spawn('node', ['-e', script], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    child.on('message', (msg: any) => {
      if (msg.type === 'ready') {
        browsers.set(id, { id, name: sessionName, process: child });
        resolve();
      } else if (msg.type === 'screenshot') {
        const conns = wsConnections.get(id);
        if (conns) {
          for (const ws of conns) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'screenshot', data: msg.data }));
            }
          }
        }
      }
    });

    child.on('error', (err) => {
      console.error('Browser process error:', err.message);
    });
    child.on('exit', () => {
      browsers.delete(id);
      const conns = wsConnections.get(id);
      if (conns) {
        for (const ws of conns) {
          ws.send(JSON.stringify({ type: 'error', message: 'Browser disconnected' }));
          ws.close();
        }
        wsConnections.delete(id);
      }
    });
  });
}

async function closeSession(name: string) {
  for (const [id, bp] of browsers) {
    if (bp.name === name) {
      bp.process.kill();
      browsers.delete(id);
      const conns = wsConnections.get(id);
      if (conns) {
        for (const ws of conns) ws.close();
        wsConnections.delete(id);
      }
      return;
    }
  }
}

async function closeAll() {
  for (const [, bp] of browsers) {
    bp.process.kill();
  }
  browsers.clear();
  wsConnections.clear();
  if (existsSync(DAEMON_CONFIG_PATH)) {
    unlinkSync(DAEMON_CONFIG_PATH);
  }
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
    const sessionList = Array.from(browsers.entries()).map(([id, bp]) => ({
      id,
      name: bp.name,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sessionList));
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

function handleRPCCommand(method: string, params?: any): any {
  const [namespace, action] = method.split('.');

  switch (namespace) {
    case 'session':
      return handleSessionCommand(action, params);
    case 'storage':
      return handleStorageCommand(action, params);
    case 'page':
      return handlePageCommand(action, params);
    default:
      throw new Error(`Unknown namespace: ${namespace}`);
  }
}

function handleSessionCommand(action: string, params?: any): any {
  switch (action) {
    case 'open':
      return openSessionSync(params.name, params.url);
    case 'close':
      closeSession(params.name);
      return { ok: true };
    case 'closeAll':
      closeAll();
      return { ok: true };
    case 'kill':
      killSession(params.name);
      return { ok: true };
    case 'list':
      return { sessions: listSessions() };
    default:
      throw new Error(`Unknown session action: ${action}`);
  }
}

function handleStorageCommand(action: string, params?: any): any {
  const { name, type } = params || {};
  switch (action) {
    case 'get':
      if (type === 'cookies') return { cookies: [] };
      if (type === 'localStorage') return { localStorage: {} };
      throw new Error('Invalid storage type');
    case 'set':
      if (type === 'cookies') {
        setSessionCookie(name, params.data);
      } else if (type === 'localStorage') {
        setSessionLocalStorage(name, params.key, params.value);
      } else {
        throw new Error('Invalid storage type');
      }
      return { ok: true };
    case 'clear':
      if (type === 'cookies') {
        clearSessionCookies(name);
      } else if (type === 'localStorage') {
        clearSessionLocalStorage(name);
      } else {
        throw new Error('Invalid storage type');
      }
      return { ok: true };
    default:
      throw new Error(`Unknown storage action: ${action}`);
  }
}

function handlePageCommand(action: string, params?: any): any {
  switch (action) {
    case 'html':
      return { html: getSessionHtml(params.name) };
    case 'screenshot':
      return { screenshot: getSessionScreenshot(params.name) };
    default:
      throw new Error(`Unknown page action: ${action}`);
  }
}

function killSession(name: string) {
  for (const [id, bp] of browsers) {
    if (bp.name === name) {
      bp.process.kill('SIGKILL');
      browsers.delete(id);
      wsConnections.delete(id);
      return;
    }
  }
}

function getSessionHtml(name: string): string {
  for (const [, bp] of browsers) {
    if (bp.name === name) {
      bp.process.send({ type: 'html' });
    }
  }
  return '';
}

function getSessionScreenshot(name: string): string {
  for (const [, bp] of browsers) {
    if (bp.name === name) {
      bp.process.send({ type: 'screenshot' });
    }
  }
  return '';
}

function setSessionCookie(name: string, cookie: any) {
  for (const [, bp] of browsers) {
    if (bp.name === name) {
      bp.process.send({ type: 'setCookie', cookie });
    }
  }
}

function clearSessionCookies(name: string) {
  for (const [, bp] of browsers) {
    if (bp.name === name) {
      bp.process.send({ type: 'clearCookies' });
    }
  }
}

function setSessionLocalStorage(name: string, key: string, value: string) {
  for (const [, bp] of browsers) {
    if (bp.name === name) {
      bp.process.send({ type: 'setLocalStorage', key, value });
    }
  }
}

function clearSessionLocalStorage(name: string) {
  for (const [, bp] of browsers) {
    if (bp.name === name) {
      bp.process.send({ type: 'clearLocalStorage' });
    }
  }
}

function openSessionSync(name: string, url: string): { id: string; name: string; url: string } {
  const id = generateSessionId();
  createBrowserProcess(id, name, url);
  return { id, name, url };
}

function listSessions(): Array<{ id: string; name: string }> {
  return Array.from(browsers.entries()).map(([id, bp]) => ({ id, name: bp.name }));
}

function handleRPCRequest(req: any, res: any) {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', (chunk: any) => {
    body += chunk;
  });
  req.on('end', async () => {
    try {
      const { method, params } = JSON.parse(body);
      const result = handleRPCCommand(method, params);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

const server = createHttpServer(async (req, res) => {
  const { pathname } = parse(req.url || '', true);

  if (pathname === '/ws') {
    return;
  }

  if (pathname === '/rpc') {
    handleRPCRequest(req, res);
    return;
  }

  await handleHttpRequest(req, res);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, _req: any) => {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const { type, sessionId } = msg;

      if (type === 'attach') {
        const bp = browsers.get(sessionId);
        if (!bp) {
          ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
          return;
        }
        wsConnections.get(sessionId)?.add(ws);
        bp.process.send({ type: 'start' });
        ws.send(JSON.stringify({ type: 'attached' }));
        (ws as any)._sessionId = sessionId;
      } else if (type === 'navigate') {
        const bp = browsers.get(sessionId);
        if (bp) bp.process.send({ type: 'navigate', url: msg.url });
      } else if (type === 'click') {
        const bp = browsers.get(sessionId);
        if (bp) bp.process.send({ type: 'click', x: msg.x, y: msg.y });
      } else if (type === 'mousemove') {
        const bp = browsers.get(sessionId);
        if (bp) bp.process.send({ type: 'mousemove', x: msg.x, y: msg.y });
      } else if (type === 'key') {
        const bp = browsers.get(sessionId);
        if (bp) bp.process.send({ type: 'key', key: msg.key });
      }
    } catch (err: any) {
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    const sessionId = (ws as any)._sessionId;
    if (sessionId) {
      const bp = browsers.get(sessionId);
      if (bp) bp.process.send({ type: 'stop' });
      wsConnections.get(sessionId)?.delete(ws);
    }
  });
});

const pid = process.pid;
ensureSessionDir();
if (existsSync(DAEMON_SOCKET_PATH)) {
  unlinkSync(DAEMON_SOCKET_PATH);
}
saveDaemonConfig(VIEWER_PORT, pid);

const socketServer = createNetServer((socket) => {
  let buffer = '';
  socket.on('data', (data) => {
    buffer += data.toString();
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.trim()) {
        try {
          const req = JSON.parse(line);
          const result = handleRPCCommand(req.method, req.params);
          socket.write(JSON.stringify(result) + '\n');
        } catch (err: any) {
          socket.write(JSON.stringify({ error: err.message }) + '\n');
        }
      }
    }
  });
  socket.on('error', () => {});
});

socketServer.listen(DAEMON_SOCKET_PATH, () => {
  console.log(`XCLI daemon socket: ${DAEMON_SOCKET_PATH}`);
});

server.listen(VIEWER_PORT, () => {
  console.log(`XCLI daemon HTTP/WS: http://localhost:${VIEWER_PORT}`);
  console.log(`Viewer: http://localhost:${VIEWER_PORT}/viewer.html`);
});

process.on('SIGTERM', async () => {
  await closeAll();
  server.close();
  process.exit(0);
});
