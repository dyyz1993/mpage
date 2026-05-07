import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { WSServer } from '../../../src/daemon/ws-server.js';
import { WSClient } from '../../../src/daemon/ws-client.js';

describe('WSClient', () => {
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

  it('connects to server', async () => {
    client = new WSClient({ url });
    await client.connect();
    expect(client.isConnected()).toBe(true);
  });

  it('disconnects cleanly', async () => {
    client = new WSClient({ url });
    await client.connect();
    expect(client.isConnected()).toBe(true);

    client.disconnect();
    expect(client.isConnected()).toBe(false);
    expect(client.getReadyState()).toBe(WebSocket.CLOSED);
  });

  it('throws when sending on disconnected socket', () => {
    client = new WSClient({ url });
    expect(() => client.send('ping')).toThrow('WebSocket is not connected');
    expect(() => client.broadcast('ch', 'data')).toThrow('WebSocket is not connected');
    expect(() => client.emit('evt', 'data')).toThrow('WebSocket is not connected');
    expect(() => client.subscribeToBroadcast('ch')).toThrow('WebSocket is not connected');
    expect(() => client.unsubscribeFromBroadcast('ch')).toThrow('WebSocket is not connected');
  });

  it('sends ping and receives pong', async () => {
    client = new WSClient({ url });
    await client.connect();

    let received = false;
    client.onMessage((msg) => {
      if (msg.type === 'pong') received = true;
    });

    client.ping();

    await new Promise((r) => setTimeout(r, 200));
    expect(received).toBe(true);
  });

  it('broadcasts data to channel', async () => {
    client = new WSClient({ url });
    await client.connect();

    const listener = new WSClient({ url });
    await listener.connect();
    extras.push(listener);

    await new Promise((r) => setTimeout(r, 100));

    listener.subscribeToBroadcast('test-ch');
    client.subscribeToBroadcast('test-ch');
    await new Promise((r) => setTimeout(r, 100));

    let received = false;
    listener.onMessage((msg) => {
      if (msg.type === 'broadcast' && msg.channel === 'test-ch') received = true;
    });

    client.broadcast('test-ch', { hello: 'world' });

    await new Promise((r) => setTimeout(r, 200));
    expect(received).toBe(true);
  });

  it('subscribes and receives events', async () => {
    client = new WSClient({ url });
    await client.connect();

    const emitter = new WSClient({ url });
    await emitter.connect();
    extras.push(emitter);

    let eventReceived = false;
    client.subscribe('test-event', (data) => {
      if ((data as { value: number }).value === 42) eventReceived = true;
    });

    await new Promise((r) => setTimeout(r, 100));

    emitter.emit('test-event', { value: 42 });

    await new Promise((r) => setTimeout(r, 200));
    expect(eventReceived).toBe(true);
  });

  it('unsubscribes from events', async () => {
    client = new WSClient({ url });
    await client.connect();

    client.subscribe('evt', () => {});
    client.unsubscribe('evt');

    client.disconnect();
  });

  it('onMessage and offMessage work', async () => {
    client = new WSClient({ url });
    await client.connect();

    const handler = vi.fn();
    client.onMessage(handler);
    client.offMessage(handler);

    client.ping();
    await new Promise((r) => setTimeout(r, 200));

    expect(handler).not.toHaveBeenCalled();
  });

  it('queues pending subscriptions when not connected', () => {
    client = new WSClient({ url });
    const handler = vi.fn();
    client.subscribe('test', handler);
    client.disconnect();
  });

  it('reconnects on disconnect when configured', async () => {
    const reconnectClient = new WSClient({
      url,
      reconnectInterval: 100,
      maxReconnectAttempts: 2,
    });
    extras.push(reconnectClient);

    await reconnectClient.connect();
    expect(reconnectClient.isConnected()).toBe(true);

    await wsServer.stop();
    await new Promise((r) => setTimeout(r, 100));

    await wsServer.start();
    await new Promise((r) => setTimeout(r, 500));

    reconnectClient.disconnect();
  });
});
