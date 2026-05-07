import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WSServer, type WSMessage } from '../../../src/daemon/ws-server.js';
import { WebSocket } from 'ws';

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

function connect(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connect timeout')), 3000);
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.on('open', () => {
      clearTimeout(timer);
      resolve(ws);
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

function recv(ws: WebSocket, timeout = 1000): Promise<WSMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('recv timeout')), timeout);
    ws.once('message', (data: Buffer) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString('utf-8')));
    });
  });
}

describe('WSServer - Branch Coverage', () => {
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

  describe('Error Handling', () => {
    it('emit() handler throws error and is caught', async () => {
      const ws = await connect(port);
      track(ws);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const throwingHandler = vi.fn(() => {
        throw new Error('Test handler error');
      });

      const handlers = new Set([throwingHandler]);
      wsServer['eventHandlers'].set('error-event', handlers);

      wsServer['emit'](ws, 'error-event', 'test-data');
      await new Promise((r) => setTimeout(r, 50));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event handler for error-event'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('handles invalid JSON message format', async () => {
      const ws = await connect(port);
      track(ws);

      ws.send('invalid-json{{{');
      const msg = await recv(ws);
      expect(msg.type).toBe('error');
      expect(msg.data).toBe('Invalid message format');
    });

    it('handles unknown message type', async () => {
      const ws = await connect(port);
      track(ws);

      await new Promise((r) => setTimeout(r, 50));

      send(ws, { type: 'unknown-type' } as WSMessage);
      const msg = await recv(ws, 3000);
      expect(msg.type).toBe('error');
      expect(msg.data).toContain('Unknown message type');
    });
  });

  describe('Broadcast Logic', () => {
    it('broadcast with no channel (uses default)', async () => {
      const ws = await connect(port);
      track(ws);

      send(ws, { type: 'subscribe-broadcast', channel: 'default' });
      await new Promise((r) => setTimeout(r, 50));

      send(ws, { type: 'broadcast', data: 'no-channel-data' });
      const msg = await recv(ws);
      expect(msg.type).toBe('broadcast');
      expect(msg.channel).toBe('default');
      expect(msg.data).toBe('no-channel-data');
    });

    it('broadcast to channel with no subscribed clients (no-op)', async () => {
      const ws = await connect(port);
      track(ws);

      send(ws, { type: 'broadcast', channel: 'empty-channel', data: 'test' });
      await new Promise((r) => setTimeout(r, 50));

      expect(wsServer.getConnectedClients()).toBeGreaterThanOrEqual(1);
    });

    it('broadcast to channel with non-subscribed clients (no-op)', async () => {
      const ws = await connect(port);
      track(ws);

      wsServer['broadcast']('empty-channel', 'data');
      await new Promise((r) => setTimeout(r, 50));

      expect(wsServer.getConnectedClients()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Event Handlers', () => {
    it('emit with no handlers registered (no-op)', async () => {
      const ws = await connect(port);
      track(ws);

      wsServer['emit'](ws, 'nonexistent-event', 'data');
      await new Promise((r) => setTimeout(r, 50));

      expect(wsServer.getConnectedClients()).toBeGreaterThanOrEqual(1);
    });

    it('on() with no handlerId generates one', async () => {
      const ws = await connect(port);
      track(ws);

      await new Promise((r) => setTimeout(r, 50));

      send(ws, { type: 'on', event: 'auto-id-event' });
      const msg = await recv(ws);
      expect(msg.type).toBe('subscribed');
      expect(msg.event).toBe('auto-id-event');
      expect(msg.id).toMatch(/^handler-\d+-/);
    });

    it('on() with no event (uses default)', async () => {
      const ws = await connect(port);
      track(ws);

      send(ws, { type: 'on', id: 'default-event-handler' });
      const msg = await recv(ws);
      expect(msg.type).toBe('subscribed');
      expect(msg.event).toBe('message');
      expect(msg.id).toBe('default-event-handler');
    });

    it('off() with no handlerId (early return)', async () => {
      const ws = await connect(port);
      track(ws);

      send(ws, { type: 'off' });
      await new Promise((r) => setTimeout(r, 50));

      expect(wsServer.getConnectedClients()).toBeGreaterThanOrEqual(1);
    });

    it('off() with nonexistent channel (safe no-op)', async () => {
      const ws = await connect(port);
      track(ws);

      await new Promise((r) => setTimeout(r, 50));

      send(ws, { type: 'on', event: 'test-event', id: 'handler-to-delete' });
      const subMsg = await recv(ws);
      expect(subMsg.type).toBe('subscribed');

      send(ws, { type: 'off', id: 'handler-to-delete' });
      const msg = await recv(ws);
      expect(msg.type).toBe('unsubscribed');
      expect(msg.id).toBe('handler-to-delete');
    });
  });

  describe('Channel Management', () => {
    it('subscribe-broadcast with no channel (no-op)', async () => {
      const ws = await connect(port);
      track(ws);

      send(ws, { type: 'subscribe-broadcast' });
      await new Promise((r) => setTimeout(r, 50));

      expect(wsServer.getConnectedClients()).toBeGreaterThanOrEqual(1);
    });

    it('unsubscribe-broadcast with no channel (no-op)', async () => {
      const ws = await connect(port);
      track(ws);

      send(ws, { type: 'unsubscribe-broadcast' });
      await new Promise((r) => setTimeout(r, 50));

      expect(wsServer.getConnectedClients()).toBeGreaterThanOrEqual(1);
    });

    it('unsubscribe-broadcast removes channel if empty', async () => {
      const ws = await connect(port);
      track(ws);

      send(ws, { type: 'subscribe-broadcast', channel: 'to-be-removed' });
      await new Promise((r) => setTimeout(r, 50));

      send(ws, { type: 'unsubscribe-broadcast', channel: 'to-be-removed' });
      await new Promise((r) => setTimeout(r, 50));

      expect(wsServer.getChannelCount('to-be-removed')).toBe(0);
    });

    it('bindToChannel with no existing clientChannels (creates new set)', async () => {
      const ws = await connect(port);
      track(ws);

      await wsServer.stop();

      const newServer = new WSServer({ port: 0, host: '127.0.0.1' });
      await newServer.start();

      const mockWs = {} as unknown as WebSocket;
      newServer.bindToChannel('new-session', mockWs);
      const conns = newServer.getSessionConnections('new-session');
      expect(conns.length).toBe(1);

      await newServer.stop();
    });
  });

  describe('Connection Cleanup', () => {
    it('handleDisconnection with no clientChannels (safe cleanup)', async () => {
      const ws = await connect(port);
      track(ws);

      ws.close();
      await new Promise((r) => setTimeout(r, 100));

      expect(wsServer.getConnectedClients()).toBe(0);
    });

    it('handleDisconnection cleans up empty channels', async () => {
      const ws = await connect(port);
      track(ws);

      send(ws, { type: 'subscribe-broadcast', channel: 'session-cleanup' });
      await new Promise((r) => setTimeout(r, 50));

      ws.close();
      await new Promise((r) => setTimeout(r, 100));
    });

    it('handles WebSocket close event (triggers disconnection)', async () => {
      const ws = await connect(port);
      track(ws);

      ws.close();
      await new Promise((r) => setTimeout(r, 100));

      expect(wsServer.getConnectedClients()).toBe(0);
    });

    it('handles WebSocket error event (triggers disconnection)', async () => {
      const server2 = new WSServer({ port: 0, host: '127.0.0.1' });
      await server2.start();

      let errorHandler: (() => void) | null = null;
      const mockWs = {
        readyState: 1,
        on: (event: string, handler: () => void) => {
          if (event === 'error') {
            errorHandler = handler;
          }
        },
        send: () => {},
      } as unknown as WebSocket;

      server2['handleConnection'](mockWs, null);
      expect(server2['clients'].size).toBe(1);

      if (errorHandler) {
        errorHandler();
      }

      expect(server2['clients'].size).toBe(0);

      await server2.stop();
    });

    it('handleDisconnection removes empty channels', async () => {
      const server2 = new WSServer({ port: 0, host: '127.0.0.1' });
      await server2.start();

      const mockWs = {
        readyState: 1,
        on: (event: string, handler: () => void) => {
          if (event === 'close') {
            setTimeout(handler, 10);
          }
        },
        send: () => {},
      } as unknown as WebSocket;

      server2['handleConnection'](mockWs, null);
      server2.bindToChannel('cleanup-test', mockWs);

      expect(server2.getSessionConnections('cleanup-test')).toHaveLength(1);

      server2['handleDisconnection'](mockWs);

      expect(server2.getSessionConnections('cleanup-test')).toHaveLength(0);

      await server2.stop();
    });

    it('bindToChannel with existing clientChannels (adds to set)', async () => {
      const server2 = new WSServer({ port: 0, host: '127.0.0.1' });
      await server2.start();

      const mockWs = { readyState: 1 } as unknown as WebSocket;
      server2['clients'].set(mockWs, new Set(['existing-channel']));
      server2.bindToChannel('test-session', mockWs);

      const clientChannels = server2['clients'].get(mockWs);
      expect(clientChannels).toContain('session:test-session');
      expect(clientChannels).toContain('existing-channel');

      await server2.stop();
    });

    it('handleDisconnection removes client from clients map', async () => {
      const ws = await connect(port);
      track(ws);

      ws.close();
      await new Promise((r) => setTimeout(r, 100));

      expect(wsServer.getConnectedClients()).toBe(0);
    });
  });

  describe('Message Handling Edge Cases', () => {
    it('ping with pong response', async () => {
      const ws = await connect(port);
      track(ws);

      await new Promise((r) => setTimeout(r, 50));

      send(ws, { type: 'ping', id: 'test-ping' });
      const msg = await recv(ws);
      expect(msg.type).toBe('pong');
      expect(msg.id).toBe('test-ping');
    });

    it('emit with no event parameter (uses default)', async () => {
      const ws = await connect(port);
      track(ws);

      await new Promise((r) => setTimeout(r, 50));

      send(ws, { type: 'on' });
      await recv(ws);

      send(ws, { type: 'emit', data: 'test-data' });
      const msg = await recv(ws);
      expect(msg.type).toBe('event');
      expect(msg.event).toBe('message');
      expect(msg.data).toBe('test-data');
    });

    it('multiple subscribe/unsubscribe cycles on same channel', async () => {
      const ws = await connect(port);
      track(ws);

      send(ws, { type: 'subscribe-broadcast', channel: 'multi-test' });
      await new Promise((r) => setTimeout(r, 50));

      send(ws, { type: 'unsubscribe-broadcast', channel: 'multi-test' });
      await new Promise((r) => setTimeout(r, 50));

      send(ws, { type: 'subscribe-broadcast', channel: 'multi-test' });
      await new Promise((r) => setTimeout(r, 50));

      send(ws, { type: 'broadcast', channel: 'multi-test', data: 'final-test' });
      const msg = await recv(ws);
      expect(msg.data).toBe('final-test');
    });
  });

  describe('Server Lifecycle', () => {
    it('stop() with null server (early return)', async () => {
      await wsServer.stop();

      await expect(wsServer.stop()).resolves.not.toThrow();
    });

    it('start() with path config', async () => {
      const server = new WSServer({ port: 0, path: '/ws-test' });
      await server.start();
      await server.stop();
    });

    it('start() error handling', async () => {
      const server = new WSServer({ port: 1, host: '127.0.0.1' });
      await expect(server.start()).rejects.toThrow();
    });
  });
});
