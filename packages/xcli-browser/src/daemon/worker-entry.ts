import { BrowserWorker } from './browser-worker.js';
import type { IPCMessage, IPCResponse } from '@dyyz1993/xcli-core';
import { runDaemonHost } from '@dyyz1993/xcli-core';
import { homedir } from 'os';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import type { IncomingMessage, ServerResponse } from 'http';
import type { RPCHandler } from '@dyyz1993/xcli-core';

const VIEWER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>xcli-browser Viewer</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #1a1a2e; color: #eee; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; height: 100vh; }
.header { padding: 12px 20px; background: #16213e; border-bottom: 1px solid #0f3460; display: flex; align-items: center; gap: 12px; }
.header h1 { font-size: 16px; font-weight: 600; }
.status { font-size: 12px; padding: 3px 8px; border-radius: 4px; background: #0f3460; }
.status.live { background: #1a8a3f; }
.viewport { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; padding: 20px; }
.viewport img { max-width: 100%; max-height: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.5); border-radius: 4px; }
.toolbar { padding: 8px 20px; background: #16213e; border-top: 1px solid #0f3460; display: flex; gap: 8px; align-items: center; }
.toolbar input { flex: 1; padding: 6px 12px; border-radius: 4px; border: 1px solid #0f3460; background: #1a1a2e; color: #eee; font-size: 13px; }
.toolbar button { padding: 6px 14px; border-radius: 4px; border: none; background: #0f3460; color: #eee; cursor: pointer; font-size: 13px; }
.toolbar button:hover { background: #1a5276; }
.url-bar { font-size: 12px; color: #aaa; padding: 0 20px 8px; background: #16213e; }
</style>
</head>
<body>
<div class="header">
  <h1>xcli-browser Viewer</h1>
  <span class="status" id="status">connecting...</span>
</div>
<div class="toolbar">
  <input id="urlInput" placeholder="Enter URL and press Enter" />
  <button onclick="goto()">Go</button>
  <button onclick="refresh()">Refresh</button>
</div>
<div class="url-bar" id="currentUrl"></div>
<div class="viewport">
  <img id="screen" style="display:none" />
  <div id="placeholder" style="color:#666;font-size:18px;">Waiting for screenshot...</div>
</div>
<script>
const params = new URLSearchParams(location.search);
const sessionId = params.get('s') || 'default';
const rpc = async (method, params) => {
  const res = await fetch('/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params: { ...params, sessionId, name: sessionId } }),
  });
  return res.json();
};
let intervalId = null;
async function updateScreenshot() {
  try {
    const data = await rpc('page.screenshotBase64');
    if (data.ok && data.screenshot) {
      document.getElementById('screen').src = 'data:image/png;base64,' + data.screenshot;
      document.getElementById('screen').style.display = 'block';
      document.getElementById('placeholder').style.display = 'none';
      document.getElementById('status').textContent = 'LIVE';
      document.getElementById('status').className = 'status live';
    }
    const urlData = await rpc('page.url');
    if (urlData.ok && urlData.url) {
      document.getElementById('currentUrl').textContent = urlData.url;
      document.getElementById('urlInput').value = urlData.url;
    }
  } catch (e) {
    document.getElementById('status').textContent = 'error';
  }
}
async function goto() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return;
  await rpc('page.goto', { url });
  setTimeout(updateScreenshot, 1000);
}
async function refresh() {
  await rpc('page.refresh');
  setTimeout(updateScreenshot, 1000);
}
document.getElementById('urlInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') goto();
});
updateScreenshot();
intervalId = setInterval(updateScreenshot, 1000);
</script>
</body>
</html>`;

if (process.argv.includes('--daemon')) {
  const configDir = process.env.XCLI_CONFIG_DIR || resolve(homedir(), '.xcli-browser');
  runDaemonHost({
    configDir,
    workerEntryPath: fileURLToPath(import.meta.url),
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
        handler: async (_req: IncomingMessage, res: ServerResponse, rpcHandler: RPCHandler) => {
          try {
            const result = await rpcHandler('session.list', {});
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
