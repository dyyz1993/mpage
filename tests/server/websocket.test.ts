import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { WSServer, type WSMessage } from '../../packages/core/src/daemon/ws-server.js';
import { WSClient } from '../../packages/core/src/daemon/ws-client.js';

describe('WebSocket Server', () => {
  let server: WSServer;
  const port = 8765;

  before(async () => {
    server = new WSServer({ port });
    await server.start();
  });

  after(async () => {
    await server.stop();
  });

  it('should start and accept connections', async () => {
    const client = new WSClient({
      url: `ws://localhost:${port}`,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });

    await client.connect();
    assert.strictEqual(client.isConnected(), true);
    client.disconnect();
  });

  it('should handle broadcast messages', async () => {
    const client1 = new WSClient({
      url: `ws://localhost:${port}`,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });

    const client2 = new WSClient({
      url: `ws://localhost:${port}`,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });

    await client1.connect();
    await client2.connect();

    const received1: unknown[] = [];
    const received2: unknown[] = [];

    client1.subscribeToBroadcast('test-channel');
    client2.subscribeToBroadcast('test-channel');

    client1.onMessage((msg: WSMessage) => {
      if (msg.type === 'broadcast' && msg.channel === 'test-channel') {
        received1.push(msg.data);
      }
    });

    client2.onMessage((msg: WSMessage) => {
      if (msg.type === 'broadcast' && msg.channel === 'test-channel') {
        received2.push(msg.data);
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    client1.broadcast('test-channel', { hello: 'world' });

    await new Promise((resolve) => setTimeout(resolve, 200));

    assert.strictEqual(received1.length, 1);
    assert.strictEqual(received2.length, 1);
    assert.deepStrictEqual(received1[0], { hello: 'world' });
    assert.deepStrictEqual(received2[0], { hello: 'world' });

    client1.disconnect();
    client2.disconnect();
  });

  it('should bind clients to session channels', async () => {
    const sessionId = 'test-session-123';
    const client = new WSClient({
      url: `ws://localhost:${port}`,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });

    await client.connect();

    const received: unknown[] = [];

    client.onMessage((msg: WSMessage) => {
      if (msg.type === 'broadcast') {
        received.push(msg.data);
      }
    });

    server.broadcast(`session:${sessionId}`, { test: 'data' });

    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.strictEqual(received.length, 0);

    client.disconnect();
  });

  it('should track connected clients', async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const clientCount = server.getConnectedClients();
    assert.strictEqual(typeof clientCount, 'number');
  });

  it('should count channel members', () => {
    const channelCount = server.getChannelCount('test-channel');
    assert.strictEqual(typeof channelCount, 'number');
  });
});

describe('WebSocket Client', () => {
  let server: WSServer;
  const port = 8766;

  before(async () => {
    server = new WSServer({ port });
    await server.start();
  });

  after(async () => {
    await server.stop();
  });

  it('should connect to server', async () => {
    const client = new WSClient({
      url: `ws://localhost:${port}`,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });

    await client.connect();
    assert.strictEqual(client.isConnected(), true);
    client.disconnect();
  });

  it('should send and receive messages', async () => {
    const client = new WSClient({
      url: `ws://localhost:${port}`,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });

    await client.connect();

    const messages: WSMessage[] = [];

    client.onMessage((msg: WSMessage) => {
      messages.push(msg);
    });

    client.send('ping', { timestamp: Date.now() });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const pongMessage = messages.find((m) => m.type === 'pong');
    assert.ok(pongMessage);

    client.disconnect();
  });

  it('should subscribe to events', async () => {
    const client = new WSClient({
      url: `ws://localhost:${port}`,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });

    await client.connect();

    const eventReceived: unknown[] = [];

    client.subscribe('test-event', (data: unknown) => {
      eventReceived.push(data);
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.strictEqual(eventReceived.length, 0);

    client.disconnect();
  });

  it('should unsubscribe from events', async () => {
    const client = new WSClient({
      url: `ws://localhost:${port}`,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });

    await client.connect();

    const eventReceived: unknown[] = [];

    const handler = (data: unknown) => {
      eventReceived.push(data);
    };

    client.subscribe('test-event', handler);
    await new Promise((resolve) => setTimeout(resolve, 50));

    client.unsubscribe('test-event');
    await new Promise((resolve) => setTimeout(resolve, 50));

    client.disconnect();
  });

  it('should disconnect gracefully', async () => {
    const client = new WSClient({
      url: `ws://localhost:${port}`,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });

    await client.connect();
    assert.strictEqual(client.isConnected(), true);

    client.disconnect();
    assert.strictEqual(client.isConnected(), false);
  });
});

describe('WebSocket Integration', () => {
  let server: WSServer;
  const port = 8767;

  before(async () => {
    server = new WSServer({ port });
    await server.start();
  });

  after(async () => {
    await server.stop();
  });

  it('should handle multiple clients', async () => {
    const clients: WSClient[] = [];

    for (let i = 0; i < 5; i++) {
      const client = new WSClient({
        url: `ws://localhost:${port}`,
        reconnectInterval: 1000,
        maxReconnectAttempts: 3,
      });
      await client.connect();
      clients.push(client);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.strictEqual(server.getConnectedClients(), 5);

    for (const client of clients) {
      client.disconnect();
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.strictEqual(server.getConnectedClients(), 0);
  });

  it('should broadcast to specific channel', async () => {
    const client1 = new WSClient({
      url: `ws://localhost:${port}`,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });

    const client2 = new WSClient({
      url: `ws://localhost:${port}`,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });

    const client3 = new WSClient({
      url: `ws://localhost:${port}`,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
    });

    await client1.connect();
    await client2.connect();
    await client3.connect();

    const received1: unknown[] = [];
    const received2: unknown[] = [];
    const received3: unknown[] = [];

    client1.subscribeToBroadcast('exclusive');
    client2.subscribeToBroadcast('exclusive');
    client3.subscribeToBroadcast('other');

    client1.onMessage((msg: WSMessage) => {
      if (msg.type === 'broadcast' && msg.channel === 'exclusive') {
        received1.push(msg.data);
      }
    });

    client2.onMessage((msg: WSMessage) => {
      if (msg.type === 'broadcast' && msg.channel === 'exclusive') {
        received2.push(msg.data);
      }
    });

    client3.onMessage((msg: WSMessage) => {
      if (msg.type === 'broadcast' && msg.channel === 'other') {
        received3.push(msg.data);
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    client1.broadcast('exclusive', { message: 'hello' });

    await new Promise((resolve) => setTimeout(resolve, 200));

    assert.strictEqual(received1.length, 1);
    assert.strictEqual(received2.length, 1);
    assert.strictEqual(received3.length, 0);

    client1.disconnect();
    client2.disconnect();
    client3.disconnect();
  });
});
