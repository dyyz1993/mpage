import WebSocket, { WebSocketServer } from 'ws';
import { parse } from 'url';
import { sessions, wsConnections } from './session-store';

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
  await cdpSession.send('Page.startScreencast', { everyNthFrame: 1 });

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
    } catch {
      // ignore message error
    }
  });
}

export function setupWebSocket(httpServer: import('http').Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req: any, socket: any, head: any) => {
    const { pathname, query } = parse(req.url || '', true);
    if (pathname === '/ws') {
      const sessionId = query.s as string;
      wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        handleWebSocket(ws, sessionId);
      });
    } else {
      socket.destroy();
    }
  });

  return wss;
}
