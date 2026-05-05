# WebSocket Integration

Guide to WebSocket server and client in @dyyz1993/xcli-core.

## Overview

The WebSocket system provides:

- **Real-time Communication** — Bidirectional message passing
- **Channel Subscriptions** — Topic-based messaging
- **Message Broadcasting** — Send to all or specific clients
- **Automatic Reconnection** — Client-side reconnection logic
- **Event-driven** — Event-based API for messages and events

## WebSocket Server

### Starting the Server

```typescript
import { startWSServer, WSServer } from '@dyyz1993/xcli-core';

// Using convenience function
await startWSServer({
  port: 9222,
});

// Or using WSServer class
const server = new WSServer({
  port: 9222,
  onMessage: (ws, message) => {
    console.log('Received:', message);
  },
});

await server.start();
```

### Server Configuration

```typescript
interface WSServerConfig {
  port?: number;                          // Server port (default: 9222)
  host?: string;                          // Host to bind to (default: '0.0.0.0')
  path?: string;                          // WebSocket path (default: '/')
  onConnect?: (ws: WebSocket) => void;     // Connection callback
  onMessage?: (ws: WebSocket, message: WSMessage) => void; // Message callback
  onDisconnect?: (ws: WebSocket) => void;  // Disconnection callback
  onError?: (ws: WebSocket, error: Error) => void; // Error callback
  onSubscribe?: (ws: WebSocket, channel: string) => void; // Subscribe callback
  onUnsubscribe?: (ws: WebSocket, channel: string) => void; // Unsubscribe callback
}
```

### Sending Messages

#### Send to Specific Client

```typescript
import { WSServer } from '@dyyz1993/xcli-core';

const server = new WSServer();

// Send message to a specific client
server.send(clientWebSocket, {
  type: 'command',
  data: { command: 'goto', url: 'https://example.com' },
});
```

#### Broadcast to All Clients

```typescript
import { WSServer } from '@dyyz1993/xcli-core';

const server = new WSServer();

// Broadcast to all clients
server.broadcast({
  type: 'notification',
  data: { message: 'System update available' },
});

// Broadcast to specific channel
server.broadcast('updates', {
  type: 'notification',
  data: { message: 'Channel update' },
});
```

### Channel Subscriptions

Channels allow clients to subscribe to specific topics.

#### Server-side Channel Management

```typescript
import { WSServer } from '@dyyz1993/xcli-core';

const server = new WSServer({
  onSubscribe: (ws, channel) => {
    console.log(`Client ${ws} subscribed to ${channel}`);
  },
  onUnsubscribe: (ws, channel) => {
    console.log(`Client ${ws} unsubscribed from ${channel}`);
  },
});

// Broadcast to channel
server.broadcast('channel-1', {
  type: 'event',
  data: { message: 'Channel 1 event' },
});
```

#### Client-side Subscription

Clients can subscribe by sending a message:

```typescript
// Client sends subscription request
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'channel-1',
}));

// Client sends unsubscription request
ws.send(JSON.stringify({
  type: 'unsubscribe',
  channel: 'channel-1',
}));
```

### Server Events

```typescript
import { WSServer } from '@dyyz1993/xcli-core';

const server = new WSServer({
  onConnect: (ws) => {
    console.log('Client connected:', ws);
  },
  onMessage: (ws, message) => {
    console.log('Message from client:', message);
  },
  onDisconnect: (ws) => {
    console.log('Client disconnected:', ws);
  },
  onError: (ws, error) => {
    console.error('WebSocket error:', error);
  },
  onSubscribe: (ws, channel) => {
    console.log('Client subscribed to:', channel);
  },
  onUnsubscribe: (ws, channel) => {
    console.log('Client unsubscribed from:', channel);
  },
});
```

### Server Management

```typescript
import { WSServer } from '@dyyz1993/xcli-core';

const server = new WSServer();

// Get number of connected clients
const clientCount = server.getClientCount();
console.log('Connected clients:', clientCount);

// Get list of connected clients
const clients = server.getClients();

// Check if specific client is connected
const isConnected = server.hasClient(clientWebSocket);

// Stop server
await server.stop();
```

## WebSocket Client

### Connecting to Server

```typescript
import { WSClient } from '@dyyz1993/xcli-core';

const client = new WSClient({
  url: 'ws://localhost:9222',
  autoReconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
});

await client.connect();
```

### Client Configuration

```typescript
interface WSClientConfig {
  url: string;                           // WebSocket server URL
  autoReconnect?: boolean;               // Auto reconnect on disconnect (default: true)
  reconnectInterval?: number;            // Reconnect interval in ms (default: 5000)
  maxReconnectAttempts?: number;         // Max reconnect attempts (default: 10)
  onOpen?: () => void;                    // Connection open callback
  onClose?: (code: number, reason: string) => void; // Close callback
  onError?: (error: Error) => void;       // Error callback
  onMessage?: (message: WSMessage) => void; // Message callback
}
```

### Sending Messages

```typescript
import { WSClient } from '@dyyz1993/xcli-core';

const client = new WSClient({ url: 'ws://localhost:9222' });

await client.connect();

// Send message
client.send({
  type: 'command',
  data: {
    command: 'goto',
    url: 'https://example.com',
  },
});

// Send with acknowledgment
client.send({
  type: 'command',
  data: { command: 'click', selector: '#btn' },
  id: 'msg-123',
});
```

### Message Types

```typescript
interface WSMessage {
  type: string;                          // Message type
  data?: unknown;                        // Message data
  channel?: string;                      // Target channel
  id?: string;                           // Message ID
}
```

### Event Listeners

```typescript
import { WSClient } from '@dyyz1993/xcli-core';

const client = new WSClient({ url: 'ws://localhost:9222' });

await client.connect();

// Listen for messages
client.on('message', (message) => {
  console.log('Received:', message);
});

// Listen for connection open
client.on('open', () => {
  console.log('Connected to server');
});

// Listen for connection close
client.on('close', (code, reason) => {
  console.log('Disconnected:', code, reason);
});

// Listen for errors
client.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Listen for reconnection attempts
client.on('reconnecting', (attempt) => {
  console.log('Reconnecting, attempt:', attempt);
});
```

### Channel Subscriptions

```typescript
import { WSClient } from '@dyyz1993/xcli-core';

const client = new WSClient({ url: 'ws://localhost:9222' });

await client.connect();

// Subscribe to channel
client.subscribe('updates');

// Listen for channel messages
client.on('updates', (message) => {
  console.log('Update received:', message);
});

// Unsubscribe from channel
client.unsubscribe('updates');
```

### One-time Events

```typescript
import { WSClient } from '@dyyz1993/xcli-core';

const client = new WSClient({ url: 'ws://localhost:9222' });

await client.connect();

// Listen once for message
client.once('message', (message) => {
  console.log('First message:', message);
});

// Listen once for connection open
client.once('open', () => {
  console.log('Connected once');
});
```

### Disconnecting

```typescript
import { WSClient } from '@dyyz1993/xcli-core';

const client = new WSClient({ url: 'ws://localhost:9222' });

await client.connect();

// Graceful disconnect
await client.disconnect();

// Force disconnect
client.disconnect(true);
```

### Client State

```typescript
import { WSClient } from '@dyyz1993/xcli-core';

const client = new WSClient({ url: 'ws://localhost:9222' });

// Check if connected
if (client.isConnected()) {
  console.log('Client is connected');
}

// Get connection state
const state = client.getState();
console.log('State:', state); // 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
```

## Message Patterns

### Request-Response Pattern

```typescript
// Client
const client = new WSClient({ url: 'ws://localhost:9222' });
await client.connect();

// Send request with ID
client.send({
  type: 'request',
  id: 'req-123',
  data: { action: 'get-info' },
});

// Listen for response
client.on('message', (message) => {
  if (message.id === 'req-123' && message.type === 'response') {
    console.log('Response:', message.data);
  }
});
```

```typescript
// Server
server.on('message', (ws, message) => {
  if (message.type === 'request') {
    // Process request
    const result = processRequest(message.data);

    // Send response
    server.send(ws, {
      type: 'response',
      id: message.id,
      data: result,
    });
  }
});
```

### Event Streaming Pattern

```typescript
// Server
let progress = 0;

setInterval(() => {
  progress += 10;

  server.broadcast('progress', {
    type: 'progress',
    data: { progress },
  });

  if (progress >= 100) progress = 0;
}, 1000);
```

```typescript
// Client
client.subscribe('progress');

client.on('progress', (message) => {
  console.log('Progress:', message.data.progress);
});
```

### Chat Room Pattern

```typescript
// Server
server.on('message', (ws, message) => {
  if (message.type === 'chat') {
    // Broadcast chat message to all clients in channel
    server.broadcast('chat', {
      type: 'chat',
      data: {
        user: message.data.user,
        text: message.data.text,
        timestamp: Date.now(),
      },
    });
  }
});
```

```typescript
// Client
client.subscribe('chat');

// Send chat message
client.send({
  type: 'chat',
  channel: 'chat',
  data: { user: 'Alice', text: 'Hello everyone!' },
});

// Listen for chat messages
client.on('chat', (message) => {
  console.log(`${message.data.user}: ${message.data.text}`);
});
```

## Advanced Usage

### Authentication

```typescript
// Server
server.on('connect', async (ws) => {
  // Wait for auth message
  ws.once('message', async (message) => {
    if (message.type === 'auth') {
      const { token } = message.data;

      // Validate token
      const isValid = await validateToken(token);

      if (isValid) {
        ws.authenticated = true;
        ws.user = await getUserFromToken(token);
        server.send(ws, { type: 'auth-success' });
      } else {
        server.send(ws, { type: 'auth-failed' });
        ws.close();
      }
    }
  });
});

// Client
await client.connect();
client.send({
  type: 'auth',
  data: { token: 'your-auth-token' },
});
```

### Message Queue

```typescript
import { WSClient } from '@dyyz1993/xcli-core';

const client = new WSClient({
  url: 'ws://localhost:9222',
  autoReconnect: true,
});

// Queue messages while disconnected
client.queueMessage({ type: 'hello' });
client.queueMessage({ type: 'ping' });

// Connect and send queued messages
await client.connect();
```

### Rate Limiting

```typescript
import { WSServer } from '@dyyz1993/xcli-core';

const rateLimits = new Map<WebSocket, { count: number; resetTime: number }>();

server.on('message', (ws, message) => {
  const now = Date.now();
  const limit = rateLimits.get(ws) || { count: 0, resetTime: now + 60000 };

  if (now > limit.resetTime) {
    // Reset counter
    limit.count = 0;
    limit.resetTime = now + 60000;
  }

  if (limit.count >= 100) {
    // Rate limit exceeded
    server.send(ws, { type: 'error', data: { message: 'Rate limit exceeded' } });
    return;
  }

  limit.count++;
  rateLimits.set(ws, limit);

  // Process message
  processMessage(ws, message);
});
```

### Heartbeat

```typescript
import { WSClient } from '@dyyz1993/xcli-core';

// Client heartbeat
const client = new WSClient({ url: 'ws://localhost:9222' });

setInterval(() => {
  if (client.isConnected()) {
    client.send({ type: 'ping' });
  }
}, 30000);

// Server heartbeat
server.on('message', (ws, message) => {
  if (message.type === 'ping') {
    server.send(ws, { type: 'pong' });
  }
});
```

## Best Practices

### 1. Handle Errors Gracefully

```typescript
client.on('error', (error) => {
  console.error('WebSocket error:', error);
  // Implement retry logic or notify user
});
```

### 2. Use Message IDs

```typescript
client.send({
  type: 'request',
  id: `req-${Date.now()}`,
  data: { action: 'get-data' },
});
```

### 3. Clean Up Subscriptions

```typescript
// When component unmounts
client.off('message', messageHandler);
client.unsubscribe('updates');
await client.disconnect();
```

### 4. Validate Messages

```typescript
server.on('message', (ws, message) => {
  if (!message.type || !message.data) {
    server.send(ws, { type: 'error', data: { message: 'Invalid message' } });
    return;
  }

  // Validate data schema
  if (message.type === 'command') {
    const result = CommandSchema.safeParse(message.data);
    if (!result.success) {
      server.send(ws, { type: 'error', data: { message: 'Invalid command data' } });
      return;
    }
  }
});
```

## API Reference

### WSServer

```typescript
class WSServer {
  constructor(config: WSServerConfig);
  start(): Promise<void>;
  stop(): Promise<void>;
  send(ws: WebSocket, message: WSMessage): void;
  broadcast(message: WSMessage): void;
  broadcast(channel: string, message: WSMessage): void;
  getClientCount(): number;
  getClients(): WebSocket[];
  hasClient(ws: WebSocket): boolean;
}
```

### WSClient

```typescript
class WSClient {
  constructor(config: WSClientConfig);
  connect(): Promise<void>;
  disconnect(force?: boolean): void;
  send(message: WSMessage): void;
  subscribe(channel: string): void;
  unsubscribe(channel: string): void;
  on(event: string, callback: WSMessageCallback | WSEventCallback): void;
  off(event: string, callback: WSMessageCallback | WSEventCallback): void;
  once(event: string, callback: WSMessageCallback | WSEventCallback): void;
  queueMessage(message: WSMessage): void;
  isConnected(): boolean;
  getState(): ConnectionState;
}
```

### Types

```typescript
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

type WSMessageCallback = (message: WSMessage) => void;
type WSEventCallback = (...args: unknown[]) => void;

interface WSMessage {
  type: string;
  data?: unknown;
  channel?: string;
  id?: string;
}
```

## See Also

- [Architecture](./architecture.md) — Framework architecture overview
- [Daemon Management](./daemon-management.md) — Background process management
- [Plugin System](./plugin-system.md) — Plugin development guide
