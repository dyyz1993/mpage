import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import { WSServer } from '../../../src/daemon/ws-server.js';
import { WSClient } from '../../../src/daemon/ws-client.js';

describe('WSClient — uncovered branch tests', () => {
  let wsServer: WSServer;
  let port: number;
  let url: string;
  let client: WSClient;
  let extras: WSClient[] = [];

  async function createServer(): Promise<void> {
    const server = new WSServer({ port: 0, host: '127.0.0.1' });
    await server.start();
    const internal = (server as unknown as { server: { address: () => { port: number } } }).server;
    const addr = internal.address();
    wsServer = server;
    port = addr.port;
    url = `ws://127.0.0.1:${port}`;
  }

  beforeEach(async () => {
    await createServer();
  });

  afterEach(async () => {
    client?.disconnect();
    for (const e of extras) e.disconnect();
    extras = [];
    await wsServer?.stop().catch(() => {});
  });

  describe('subscribeToBroadcast — connected path', () => {
    it('should send subscribe-broadcast and receive broadcasts on that channel', async () => {
      client = new WSClient({ url });
      await client.connect();

      const listener = new WSClient({ url });
      await listener.connect();
      extras.push(listener);

      listener.subscribeToBroadcast('ch1');
      client.subscribeToBroadcast('ch1');
      await new Promise((r) => setTimeout(r, 100));

      let received = false;
      listener.onMessage((msg) => {
        if (msg.type === 'broadcast' && msg.channel === 'ch1') received = true;
      });

      client.broadcast('ch1', { data: 'hello' });

      await new Promise((r) => setTimeout(r, 200));
      expect(received).toBe(true);
    });
  });

  describe('unsubscribeFromBroadcast — connected path', () => {
    it('should stop receiving broadcasts after unsubscribe', async () => {
      client = new WSClient({ url });
      await client.connect();

      client.subscribeToBroadcast('ch2');
      await new Promise((r) => setTimeout(r, 100));

      client.unsubscribeFromBroadcast('ch2');
      await new Promise((r) => setTimeout(r, 100));

      let received = false;
      client.onMessage((msg) => {
        if (msg.type === 'broadcast' && msg.channel === 'ch2') received = true;
      });

      const broadcaster = new WSClient({ url });
      await broadcaster.connect();
      extras.push(broadcaster);
      broadcaster.subscribeToBroadcast('ch2');
      await new Promise((r) => setTimeout(r, 100));
      broadcaster.broadcast('ch2', { data: 'hello' });

      await new Promise((r) => setTimeout(r, 200));
      expect(received).toBe(false);
    });
  });

  describe('unsubscribe — connected path', () => {
    it('should send off message without throwing when connected', async () => {
      client = new WSClient({ url });
      await client.connect();

      client.subscribe('test-evt', () => {});
      await new Promise((r) => setTimeout(r, 100));

      expect(() => client.unsubscribe('test-evt')).not.toThrow();

      await new Promise((r) => setTimeout(r, 100));
    });
  });

  describe('broadcast — message format', () => {
    it('should send broadcast message with channel and data', async () => {
      client = new WSClient({ url });
      await client.connect();

      const listener = new WSClient({ url });
      await listener.connect();
      extras.push(listener);

      listener.subscribeToBroadcast('fmt-ch');
      client.subscribeToBroadcast('fmt-ch');
      await new Promise((r) => setTimeout(r, 100));

      let receivedData: unknown = null;
      listener.onMessage((msg) => {
        if (msg.type === 'broadcast' && msg.channel === 'fmt-ch') {
          receivedData = msg.data;
        }
      });

      client.broadcast('fmt-ch', { hello: 'world' });

      await new Promise((r) => setTimeout(r, 200));
      expect(receivedData).toEqual({ hello: 'world' });
    });
  });

  describe('emit — message format', () => {
    it('should send emit message with event and data', async () => {
      client = new WSClient({ url });
      await client.connect();

      const receiver = new WSClient({ url });
      await receiver.connect();
      extras.push(receiver);

      let receivedData: unknown = null;
      receiver.subscribe('my-event', (data) => {
        receivedData = data;
      });

      await new Promise((r) => setTimeout(r, 100));

      client.emit('my-event', { value: 123 });

      await new Promise((r) => setTimeout(r, 200));
      expect(receivedData).toEqual({ value: 123 });
    });
  });

  describe('handleDisconnect — max reconnect attempts reached', () => {
    it('should not reconnect when max attempts exceeded', async () => {
      const reconnectClient = new WSClient({
        url,
        reconnectInterval: 50,
        maxReconnectAttempts: 1,
      });
      extras.push(reconnectClient);

      await reconnectClient.connect();
      expect(reconnectClient.isConnected()).toBe(true);

      await wsServer.stop();
      await new Promise((r) => setTimeout(r, 300));

      expect(reconnectClient.isConnected()).toBe(false);

      await wsServer.start();
      const internal = (wsServer as unknown as { server: { address: () => { port: number } } })
        .server;
      const addr = internal.address();
      port = addr.port;
      url = `ws://127.0.0.1:${port}`;

      await new Promise((r) => setTimeout(r, 400));
      expect(reconnectClient.isConnected()).toBe(false);
    });
  });

  describe('pending subscriptions replay', () => {
    it('should replay pending subscriptions on reconnect', async () => {
      const reconnectClient = new WSClient({
        url,
        reconnectInterval: 100,
        maxReconnectAttempts: 3,
      });
      extras.push(reconnectClient);

      reconnectClient.subscribe('pending-evt', () => {});

      await reconnectClient.connect();

      await new Promise((r) => setTimeout(r, 100));
      expect(reconnectClient.isConnected()).toBe(true);

      reconnectClient.disconnect();
    });
  });

  describe('error handling in message handlers', () => {
    it('should catch errors in message handlers', async () => {
      client = new WSClient({ url });
      await client.connect();

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      client.onMessage(() => {
        throw new Error('handler error');
      });

      client.ping();

      await new Promise((r) => setTimeout(r, 200));
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should catch errors in event handlers', async () => {
      client = new WSClient({ url });
      await client.connect();

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      client.subscribe('error-evt', () => {
        throw new Error('event handler error');
      });

      await new Promise((r) => setTimeout(r, 100));

      const emitter = new WSClient({ url });
      await emitter.connect();
      extras.push(emitter);

      emitter.emit('error-evt', { test: true });

      await new Promise((r) => setTimeout(r, 300));
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should handle invalid JSON from server gracefully', async () => {
      client = new WSClient({ url });
      await client.connect();

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const ws = (client as any).ws;
      ws.emit('message', Buffer.from('not json'));

      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy.mock.calls[0][0]).toContain('Failed to parse');
      errorSpy.mockRestore();
    });
  });

  describe('unsubscribe — not connected path', () => {
    it('should delete from pendingSubscriptions when not connected', async () => {
      client = new WSClient({ url });
      await client.connect();

      client.subscribe('pending-unsub', () => {});
      await new Promise((r) => setTimeout(r, 100));

      client.disconnect();

      client.subscribe('pending-unsub-2', () => {});
      expect(() => client.unsubscribe('pending-unsub-2')).not.toThrow();
    });
  });

  describe('getReadyState', () => {
    it('should return CLOSED when not connected', () => {
      client = new WSClient({ url });
      expect(client.getReadyState()).toBe(WebSocket.CLOSED);
    });

    it('should return OPEN when connected', async () => {
      client = new WSClient({ url });
      await client.connect();
      expect(client.getReadyState()).toBe(WebSocket.OPEN);
    });
  });
});
