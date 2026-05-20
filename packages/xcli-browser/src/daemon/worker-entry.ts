import { BrowserWorker } from './browser-worker.js';
import type { IPCMessage, IPCResponse } from '@dyyz1993/xcli-core';
import { runDaemonHost } from '@dyyz1993/xcli-core';
import { homedir } from 'os';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import type { IncomingMessage, ServerResponse } from 'http';
import type { RPCHandler } from '@dyyz1993/xcli-core';
import { WebSocketServer, WebSocket } from 'ws';

const VIEWER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>xcli-browser Viewer</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #1a1a2e; color: #eee; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; height: 100vh; overflow: hidden; touch-action: none; }
.header { padding: 10px 16px; background: #16213e; border-bottom: 1px solid #0f3460; display: flex; align-items: center; gap: 10px; }
.header h1 { font-size: 14px; font-weight: 600; }
.status { font-size: 11px; padding: 2px 6px; border-radius: 3px; background: #0f3460; }
.status.live { background: #1a8a3f; }
.status.error { background: #a83232; }
.viewport { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 12px; background: #111; position: relative; cursor: crosshair; }
.viewport img { max-width: 100%; max-height: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.5); border-radius: 4px; user-select: none; -webkit-user-drag: none; }
.viewport.mobile img { border: 2px solid #333; border-radius: 20px; }
.cursor { position: absolute; pointer-events: none; width: 0; height: 0; z-index: 10; display: none; }
.cursor::before { content: ''; display: block; width: 16px; height: 16px; border-left: 2px solid #fff; border-top: 2px solid #fff; transform: rotate(-45deg) skew(-10deg, -10deg); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8)); }
.cursor.pressing::before { border-color: #4fc3f7; }
.toolbar { padding: 6px 16px; background: #16213e; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.toolbar input { flex: 1; min-width: 120px; padding: 5px 10px; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #eee; font-size: 12px; }
.toolbar button, .toolbar select { padding: 5px 10px; border-radius: 4px; border: none; background: #0f3460; color: #eee; cursor: pointer; font-size: 12px; }
.toolbar button:hover { background: #1a5276; }
.toolbar select { background: #16213e; border: 1px solid #0f3460; }
.url-bar { font-size: 11px; color: #aaa; padding: 0 16px 6px; background: #16213e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
</head>
<body>
<div class="header">
  <h1>xcli-browser Viewer</h1>
  <span class="status" id="status">connecting...</span>
  <span style="font-size:10px;color:#666" id="fps"></span>
</div>
<div class="toolbar">
  <input id="urlInput" placeholder="Enter URL and press Enter" />
  <button onclick="goto()">Go</button>
  <button onclick="refresh()">&#8635;</button>
  <select id="deviceMode" onchange="switchDevice()">
    <option value="desktop">Desktop</option>
    <option value="mobile">Mobile (375x812)</option>
    <option value="tablet">Tablet (768x1024)</option>
  </select>
</div>
<div class="url-bar" id="currentUrl"></div>
<div class="viewport" id="viewport">
  <div class="cursor" id="cursor"></div>
  <img id="screen" style="display:none" draggable="false" />
  <div id="placeholder" style="color:#666;font-size:16px;">Waiting for screencast...</div>
</div>
<script>
const params = new URLSearchParams(location.search);
const sessionId = params.get('s') || 'default';
let rpcId = 0;
const pendingRpc = new Map();
let viewportWidth = 1280, viewportHeight = 720;

const ws = new WebSocket('ws://localhost:8055/?s=' + sessionId);
ws.binaryType = 'blob';

let frameCount = 0;
setInterval(() => {
  document.getElementById('fps').textContent = frameCount + ' fps';
  frameCount = 0;
}, 1000);

ws.onopen = () => {
  document.getElementById('status').textContent = 'LIVE';
  document.getElementById('status').className = 'status live';
  updateUrl();
  fetchViewport();
};
ws.onmessage = (event) => {
  if (event.data instanceof Blob) {
    const blobUrl = URL.createObjectURL(event.data);
    const img = document.getElementById('screen');
    img.src = blobUrl;
    img.onload = () => URL.revokeObjectURL(blobUrl);
    img.style.display = 'block';
    document.getElementById('placeholder').style.display = 'none';
    frameCount++;
    return;
  }
  try {
    const msg = JSON.parse(event.data);
    if (msg.type === 'rpcResponse') {
      const p = pendingRpc.get(msg.id);
      if (p) { pendingRpc.delete(msg.id); p(msg.result || msg); }
    }
  } catch {}
};
ws.onclose = () => {
  document.getElementById('status').textContent = 'disconnected';
  document.getElementById('status').className = 'status error';
};
ws.onerror = () => {
  document.getElementById('status').textContent = 'error';
  document.getElementById('status').className = 'status error';
};

function rpc(method, p) {
  const id = ++rpcId;
  return new Promise(resolve => {
    pendingRpc.set(id, resolve);
    ws.send(JSON.stringify({ type: 'rpc', id, method, params: { ...p, sessionId, name: sessionId } }));
  });
}

function mapCoords(e) {
  const img = document.getElementById('screen');
  const rect = img.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left) / rect.width * viewportWidth);
  const y = Math.round((e.clientY - rect.top) / rect.height * viewportHeight);
  return { x: Math.max(0, Math.min(x, viewportWidth)), y: Math.max(0, Math.min(y, viewportHeight)) };
}

let isDown = false;
let lastMove = 0;

const vp = document.getElementById('viewport');

vp.addEventListener('mousedown', async (e) => {
  e.preventDefault();
  isDown = true;
  document.getElementById('cursor').classList.add('pressing');
  const { x, y } = mapCoords(e);
  await rpc('page.mouse', { action: 'move', x, y });
  await rpc('page.mouse', { action: 'down', x, y, button: 'left' });
});

vp.addEventListener('mousemove', async (e) => {
  const { x, y } = mapCoords(e);
  const cursor = document.getElementById('cursor');
  const img = document.getElementById('screen');
  const rect = img.getBoundingClientRect();
  cursor.style.display = 'block';
  cursor.style.left = (e.clientX - rect.left + img.offsetLeft) + 'px';
  cursor.style.top = (e.clientY - rect.top + img.offsetTop) + 'px';
  if (isDown) cursor.classList.add('pressing');
  else cursor.classList.remove('pressing');
  const now = Date.now();
  if (now - lastMove < 50) return;
  lastMove = now;
  rpc('page.mouse', { action: 'move', x, y });
});

vp.addEventListener('mouseup', async (e) => {
  if (!isDown) return;
  isDown = false;
  document.getElementById('cursor').classList.remove('pressing');
  const { x, y } = mapCoords(e);
  await rpc('page.mouse', { action: 'up', x, y, button: 'left' });
  setTimeout(updateUrl, 300);
});

vp.addEventListener('click', async (e) => {
  const { x, y } = mapCoords(e);
  await rpc('page.mouse', { action: 'click', x, y, button: 'left' });
  setTimeout(updateUrl, 300);
});

vp.addEventListener('dblclick', async (e) => {
  const { x, y } = mapCoords(e);
  await rpc('page.mouse', { action: 'dblclick', x, y });
  setTimeout(updateUrl, 300);
});

vp.addEventListener('contextmenu', async (e) => {
  e.preventDefault();
  const { x, y } = mapCoords(e);
  await rpc('page.mouse', { action: 'down', x, y, button: 'right' });
  await rpc('page.mouse', { action: 'up', x, y, button: 'right' });
});

vp.addEventListener('mouseleave', () => {
  document.getElementById('cursor').style.display = 'none';
});

vp.addEventListener('wheel', async (e) => {
  e.preventDefault();
  const { x, y } = mapCoords(e);
  await rpc('page.mouse', { action: 'move', x, y });
  rpc('page.scroll', { x: viewportWidth / 2, y: viewportHeight / 2 });
}, { passive: false });

vp.addEventListener('touchstart', async (e) => {
  e.preventDefault();
  const t = e.touches[0];
  const { x, y } = mapCoords(t);
  await rpc('page.mouse', { action: 'move', x, y });
  await rpc('page.mouse', { action: 'down', x, y });
}, { passive: false });

vp.addEventListener('touchmove', async (e) => {
  e.preventDefault();
  const t = e.touches[0];
  const now = Date.now();
  if (now - lastMove < 30) return;
  lastMove = now;
  const { x, y } = mapCoords(t);
  rpc('page.mouse', { action: 'move', x, y });
}, { passive: false });

vp.addEventListener('touchend', async (e) => {
  e.preventDefault();
  const t = e.changedTouches[0];
  const { x, y } = mapCoords(t);
  await rpc('page.mouse', { action: 'up', x, y });
  setTimeout(updateUrl, 300);
}, { passive: false });

async function switchDevice() {
  const mode = document.getElementById('deviceMode').value;
  const vEl = document.getElementById('viewport');
  vEl.classList.remove('mobile');
  if (mode === 'mobile') {
    viewportWidth = 375; viewportHeight = 812;
    vEl.classList.add('mobile');
  } else if (mode === 'tablet') {
    viewportWidth = 768; viewportHeight = 1024;
  } else {
    viewportWidth = 1280; viewportHeight = 720;
  }
  await rpc('page.setViewport', { width: viewportWidth, height: viewportHeight, isMobile: mode !== 'desktop', hasTouch: mode !== 'desktop', deviceScaleFactor: mode === 'mobile' ? 2 : 1 });
}

async function fetchViewport() {
  try {
    const r = await rpc('page.viewport', {});
    if (r && r.ok) { viewportWidth = r.width || 1280; viewportHeight = r.height || 720; }
  } catch {}
}

async function updateUrl() {
  try {
    const urlData = await rpc('page.url', {});
    if (urlData && urlData.ok && urlData.url) {
      document.getElementById('currentUrl').textContent = urlData.url;
      document.getElementById('urlInput').value = urlData.url;
    }
  } catch {}
}
async function goto() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return;
  await rpc('page.goto', { url });
  setTimeout(updateUrl, 1000);
}
async function refresh() {
  await rpc('page.refresh', {});
  setTimeout(updateUrl, 1000);
}
document.getElementById('urlInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') goto();
});
setInterval(updateUrl, 3000);
</script>
</body>
</html>`;

if (process.argv.includes('--daemon')) {
  const configDir = process.env.XCLI_CONFIG_DIR || resolve(homedir(), '.xcli-browser');
  let rpcHandler: RPCHandler | null = null;
  const viewers = new Map<string, Set<WebSocket>>();
  const wss = new WebSocketServer({ port: 8055 });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const urlParams = new URL(req.url || '/', 'ws://localhost:8055').searchParams;
    const sid = urlParams.get('s') || 'default';
    let viewerSet = viewers.get(sid);
    if (!viewerSet) {
      viewerSet = new Set();
      viewers.set(sid, viewerSet);
    }
    viewerSet.add(ws);

    ws.on('message', async (raw: Buffer) => {
      if (!rpcHandler) return;
      try {
        const msg = JSON.parse(raw.toString('utf-8'));
        if (msg.type === 'rpc') {
          try {
            const result = await rpcHandler(msg.method, msg.params || {});
            ws.send(JSON.stringify({ type: 'rpcResponse', id: msg.id, result }));
          } catch (err) {
            ws.send(
              JSON.stringify({
                type: 'rpcResponse',
                id: msg.id,
                error: err instanceof Error ? err.message : String(err),
              })
            );
          }
        }
      } catch {}
    });

    ws.on('close', () => {
      viewerSet!.delete(ws);
      if (viewerSet!.size === 0) viewers.delete(sid);
    });
  });

  runDaemonHost({
    configDir,
    workerEntryPath: fileURLToPath(import.meta.url),
    eventHandler: (event: string, data: unknown) => {
      if (event === 'screencastFrame') {
        const frame = data as { sessionId: string; data: string };
        const viewerSet = viewers.get(frame.sessionId);
        if (viewerSet) {
          const binary = Buffer.from(frame.data, 'base64');
          for (const ws of viewerSet) {
            if (ws.readyState === WebSocket.OPEN) ws.send(binary);
          }
        }
      }
    },
    onReady: (handler: RPCHandler) => {
      rpcHandler = handler;
    },
    extraRoutes: [
      {
        pathname: '/viewer.html',
        handler: (_req: IncomingMessage, res: ServerResponse) => {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(VIEWER_HTML);
        },
      },
      {
        pathname: '/api/sessions',
        handler: async (_req: IncomingMessage, res: ServerResponse, handler: RPCHandler) => {
          try {
            const result = await handler('session.list', {});
            const sessions = (result as { sessions: Array<{ id: string; name: string }> }).sessions;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(sessions || []));
          } catch {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('[]');
          }
        },
      },
    ],
  });
} else {
  const worker = new BrowserWorker();
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  const sendToParent = (msg: IPCResponse | Record<string, unknown>): void => {
    if (process.send) process.send(msg);
  };

  const startHeartbeat = (): void => {
    heartbeatInterval = setInterval(() => {
      sendToParent({ type: 'event', event: 'heartbeat' });
    }, 5000);
  };

  const cleanup = async (): Promise<void> => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    await worker.destroy();
  };

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
        const result = await worker.execute(ipcMsg.method, ipcMsg.params);
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
}
