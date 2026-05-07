import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { WSServer, type WSMessage } from '../../../src/daemon/ws-server.js';

function createServer(): Promise<{ server: WSServer; port: number }> {
  return new Promise((resolve, reject) => {
    const server = new WSServer({ port: 0, host: '127.0.0.1' });
    server
      .start()
      .then(() => {
        const internal = (server as unknown as { server: { address: () => { port: number } } })
          .server;
        const addr = internal.address();
        resolve({ server, port: addr.port });
      })
      .catch(reject);
  });
}

function connectAndReceive(
  port: number,
  timeout = 3000
): Promise<{ ws: WebSocket; firstMsg: WSMessage }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connect timeout')), timeout);
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    let firstMsg: WSMessage | null = null;

    ws.on('open', () => {
      // Wait for first message (connected)
    });

    ws.on('message', (data: Buffer) => {
      if (!firstMsg) {
        firstMsg = JSON.parse(data.toString('utf-8'));
        clearTimeout(timer);
        resolve({ ws, firstMsg });
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function send(ws: WebSocket, msg: WSMessage): void {
  ws.send(JSON.stringify(msg));
}

function recv(ws: WebSocket, timeout = 3000): Promise<WSMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('recv timeout')), timeout);
    ws.once('message', (data: Buffer) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString('utf-8')));
    });
  });
}

describe('WSServer', () => {
  let wsServer: WSServer;
  let port: number;
  let clients: WebSocket[] = [];

  beforeEach(async () => {
    const result = await createServer();
    wsServer = result.server;
    port = result.port;
  });

  afterEach(async () => {
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
    clients = [];
    await wsServer?.stop().catch(() => {});
  });

  function track(ws: WebSocket): WebSocket {
    clients.push(ws);
    return ws;
  }

  it('accepts client connections and sends connected message', async () => {
    const { ws, firstMsg } = await connectAndReceive(port);
    track(ws);
    expect(firstMsg.type).toBe('connected');
  });

  it('handles ping with pong', async () => {
    const { ws } = await connectAndReceive(port);
    track(ws);

    send(ws, { type: 'ping', id: 'test-1' });
    const msg = await recv(ws);
    expect(msg.type).toBe('pong');
    expect(msg.id).toBe('test-1');
  });

  it('subscribes to broadcast channel and receives broadcasts', async () => {
    const { ws: ws1 } = await connectAndReceive(port);
    const { ws: ws2 } = await connectAndReceive(port);
    track(ws1);
    track(ws2);

    send(ws1, { type: 'subscribe-broadcast', channel: 'test' });
    send(ws2, { type: 'subscribe-broadcast', channel: 'test' });
    await new Promise((r) => setTimeout(r, 100));

    send(ws1, { type: 'broadcast', channel: 'test', data: 'hello' });

    const msg1 = await recv(ws1);
    expect(msg1.type).toBe('broadcast');
    expect(msg1.channel).toBe('test');
    expect(msg1.data).toBe('hello');

    const msg2 = await recv(ws2);
    expect(msg2.type).toBe('broadcast');
    expect(msg2.data).toBe('hello');
  });

  it('only broadcasts to clients subscribed to the target channel', async () => {
    const { ws: ws1 } = await connectAndReceive(port);
    const { ws: ws2 } = await connectAndReceive(port);
    track(ws1);
    track(ws2);

    send(ws1, { type: 'subscribe-broadcast', channel: 'ch-a' });
    send(ws2, { type: 'subscribe-broadcast', channel: 'ch-b' });
    await new Promise((r) => setTimeout(r, 100));

    send(ws1, { type: 'broadcast', channel: 'ch-a', data: 'for-a' });

    const msg1 = await recv(ws1);
    expect(msg1.channel).toBe('ch-a');
    expect(msg1.data).toBe('for-a');

    send(ws1, { type: 'broadcast', channel: 'ch-b', data: 'for-b' });

    const msg2 = await recv(ws2);
    expect(msg2.channel).toBe('ch-b');
    expect(msg2.data).toBe('for-b');
  });

  it('handles event subscription (on/off)', async () => {
    const { ws } = await connectAndReceive(port);
    track(ws);

    send(ws, { type: 'on', event: 'custom-event', id: 'handler-1' });
    const subAck = await recv(ws);
    expect(subAck.type).toBe('subscribed');
    expect(subAck.event).toBe('custom-event');
    expect(subAck.id).toBe('handler-1');

    send(ws, { type: 'off', id: 'handler-1' });
    const unsubAck = await recv(ws);
    expect(unsubAck.type).toBe('unsubscribed');
    expect(unsubAck.id).toBe('handler-1');
  });

  it('returns error for unknown message type', async () => {
    const { ws } = await connectAndReceive(port);
    track(ws);

    send(ws, { type: 'unknown-type' } as WSMessage);
    const msg = await recv(ws);
    expect(msg.type).toBe('error');
    expect(msg.data).toContain('Unknown message type');
  });

  it('returns error for invalid JSON', async () => {
    const { ws } = await connectAndReceive(port);
    track(ws);

    ws.send('not-json');
    const msg = await recv(ws);
    expect(msg.type).toBe('error');
    expect(msg.data).toBe('Invalid message format');
  });

  it('handles disconnection and cleans up', async () => {
    const { ws } = await connectAndReceive(port);
    track(ws);

    send(ws, { type: 'subscribe-broadcast', channel: 'ch1' });
    await new Promise((r) => setTimeout(r, 100));

    expect(wsServer.getConnectedClients()).toBeGreaterThanOrEqual(1);

    ws.close();
    await new Promise((r) => setTimeout(r, 200));

    expect(wsServer.getConnectedClients()).toBe(0);
  });

  it('bindToChannel() and getSessionConnections()', async () => {
    const { ws } = await connectAndReceive(port);
    track(ws);

    wsServer.bindToChannel('session-123', ws as unknown as import('ws').WebSocket);

    const conns = wsServer.getSessionConnections('session-123');
    expect(conns.length).toBeGreaterThanOrEqual(1);

    const noConns = wsServer.getSessionConnections('nonexistent');
    expect(noConns).toEqual([]);
  });

  it('getChannelCount() returns correct count', async () => {
    const { ws } = await connectAndReceive(port);
    track(ws);

    wsServer.bindToChannel('ch', ws as unknown as import('ws').WebSocket);
    expect(wsServer.getChannelCount('session:ch')).toBe(1);
    expect(wsServer.getChannelCount('nonexistent')).toBe(0);
  });

  it('stop() closes all connections', async () => {
    const { ws: ws1 } = await connectAndReceive(port);
    const { ws: ws2 } = await connectAndReceive(port);
    track(ws1);
    track(ws2);

    await wsServer.stop();

    expect(ws1.readyState).not.toBe(WebSocket.OPEN);
    expect(ws2.readyState).not.toBe(WebSocket.OPEN);
  });
});
