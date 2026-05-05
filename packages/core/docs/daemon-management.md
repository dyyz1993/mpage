# Daemon Management

Guide to using the daemon system in @dyyz1993/xcli-core.

## Overview

The daemon system provides:

- **Background Processes** — Long-running background services
- **Worker Pools** — Multi-process worker management
- **WebSocket Server** — Real-time communication
- **HTTP API** — RESTful API for command execution
- **Process Management** — PID tracking and lifecycle control

## Basic Usage

### Starting a Daemon

```typescript
import { startDaemon, isDaemonRunning, getDaemonStatus } from '@dyyz1993/xcli-core';

// Start daemon with default configuration
await startDaemon();

// Start daemon with custom configuration
await startDaemon({
  port: 9222,
  workerCount: 4,
  logLevel: 'info',
});

// Check if daemon is running
if (isDaemonRunning()) {
  console.log('Daemon is running');
  const status = getDaemonStatus();
  console.log('Status:', status);
}
```

### Stopping a Daemon

```typescript
import { stopDaemon, isDaemonRunning } from '@dyyz1993/xcli-core';

// Stop daemon
await stopDaemon();

// Verify daemon stopped
if (!isDaemonRunning()) {
  console.log('Daemon stopped');
}
```

### Killing All Daemons

```typescript
import { killAllDaemon } from '@dyyz1993/xcli-core';

// Force kill all daemon processes
killAllDaemon();
```

## Daemon Configuration

### DaemonConfig

```typescript
interface DaemonConfig {
  port?: number;              // WebSocket port (default: 9222)
  workerCount?: number;       // Number of worker processes (default: 3)
  logLevel?: string;          // Log level (default: 'info')
  httpPort?: number;          // HTTP API port (default: 9223)
  maxWorkers?: number;        // Maximum concurrent workers
  workerTimeout?: number;     // Worker timeout in ms (default: 30000)
}
```

### Example Configuration

```typescript
import { startDaemon } from '@dyyz1993/xcli-core';

await startDaemon({
  port: 9443,                 // Custom WebSocket port
  httpPort: 9444,             // Custom HTTP port
  workerCount: 8,             // 8 worker processes
  maxWorkers: 16,            // Max 16 concurrent workers
  workerTimeout: 60000,       // 60 second worker timeout
  logLevel: 'debug',          // Debug logging
});
```

## Worker Manager

The worker manager handles multi-process command execution.

### Starting Worker Manager

```typescript
import { WorkerManager } from '@dyyz1993/xcli-core';

const manager = new WorkerManager({
  workerCount: 4,
  workerTimeout: 30000,
});

await manager.start();
```

### Executing Commands

```typescript
import { WorkerManager } from '@dyyz1993/xcli-core';

const manager = new WorkerManager();

// Execute command in worker
const result = await manager.execute('goto', {
  url: 'https://example.com',
});

console.log('Result:', result);
```

### Worker Events

```typescript
import { WorkerManager } from '@dyyz1993/xcli-core';

const manager = new WorkerManager();

// Listen for worker events
manager.on('workerStart', (workerId) => {
  console.log('Worker started:', workerId);
});

manager.on('workerExit', (workerId, code) => {
  console.log('Worker exited:', workerId, 'code:', code);
});

manager.on('workerError', (workerId, error) => {
  console.error('Worker error:', workerId, error);
});

manager.on('commandComplete', (result) => {
  console.log('Command completed:', result);
});
```

### Stopping Worker Manager

```typescript
import { WorkerManager } from '@dyyz1993/xcli-core';

const manager = new WorkerManager();

// Graceful shutdown
await manager.stop();

// Force shutdown
await manager.stop(true);
```

## WebSocket Server

### Starting WebSocket Server

```typescript
import { startWSServer, stopWSServer, getWSServer } from '@dyyz1993/xcli-core';

// Start WebSocket server
await startWSServer({
  port: 9222,
});

// Get server instance
const server = getWSServer();

// Stop server
await stopWSServer();
```

### WSServer Class

```typescript
import { WSServer } from '@dyyz1993/xcli-core';

const server = new WSServer({
  port: 9222,
  onMessage: (ws, message) => {
    console.log('Received:', message);
  },
  onConnect: (ws) => {
    console.log('Client connected');
  },
  onDisconnect: (ws) => {
    console.log('Client disconnected');
  },
});

await server.start();
```

### Broadcasting Messages

```typescript
import { WSServer } from '@dyyz1993/xcli-core';

const server = new WSServer();

// Broadcast to all clients
server.broadcast({
  type: 'event',
  data: { message: 'Hello everyone!' },
});

// Broadcast to specific channel
server.broadcast('channel-1', {
  type: 'event',
  data: { message: 'Channel 1 only!' },
});
```

### Subscriptions

```typescript
import { WSServer } from '@dyyz1993/xcli-core';

const server = new WSServer({
  port: 9222,
  onSubscribe: (ws, channel) => {
    console.log('Client subscribed to:', channel);
  },
  onUnsubscribe: (ws, channel) => {
    console.log('Client unsubscribed from:', channel);
  },
});

// Client can subscribe via message
// { type: 'subscribe', channel: 'channel-1' }
```

## HTTP Server

### Starting HTTP Server

```typescript
import { startHttpServer } from '@dyyz1993/xcli-core';

await startHttpServer({
  port: 9223,
  onCommand: async (command, args) => {
    console.log('Command:', command, args);
    return { ok: true, result: 'Executed' };
  },
});
```

### HTTP API Endpoints

The HTTP server provides RESTful endpoints:

#### Execute Command

```bash
POST /api/execute
Content-Type: application/json

{
  "command": "goto",
  "args": { "url": "https://example.com" }
}

Response:
{
  "success": true,
  "result": { "ok": true },
  "duration": 1234
}
```

#### Get Status

```bash
GET /api/status

Response:
{
  "status": "running",
  "workers": 4,
  "uptime": 123456
}
```

#### List Sessions

```bash
GET /api/sessions

Response:
{
  "sessions": [
    { "id": "default", "createdAt": "2025-01-01T00:00:00.000Z" }
  ]
}
```

### RPCHandler

```typescript
import { startHttpServer } from '@dyyz1993/xcli-core';

await startHttpServer({
  port: 9223,
  rpcHandler: async (method, params) => {
    switch (method) {
      case 'execute':
        return { ok: true, result: 'executed' };
      case 'status':
        return { status: 'running' };
      default:
        throw new Error('Unknown method');
    }
  },
});
```

## WebSocket Client

### Connecting to WebSocket Server

```typescript
import { WSClient } from '@dyyz1993/xcli-core';

const client = new WSClient({
  url: 'ws://localhost:9222',
  autoReconnect: true,
  reconnectInterval: 5000,
});

await client.connect();
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
    args: { url: 'https://example.com' },
  },
});
```

### Event Listeners

```typescript
import { WSClient } from '@dyyz1993/xcli-core';

const client = new WSClient({ url: 'ws://localhost:9222' });

await client.connect();

// Message received
client.on('message', (message) => {
  console.log('Received:', message);
});

// Connected
client.on('open', () => {
  console.log('Connected to server');
});

// Disconnected
client.on('close', () => {
  console.log('Disconnected from server');
});

// Error
client.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

### Subscriptions

```typescript
import { WSClient } from '@dyyz1993/xcli-core';

const client = new WSClient({ url: 'ws://localhost:9222' });

await client.connect();

// Subscribe to channel
client.subscribe('channel-1');

// Handle channel messages
client.on('channel-1', (message) => {
  console.log('Channel message:', message);
});

// Unsubscribe
client.unsubscribe('channel-1');
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

## Advanced Usage

### Custom Worker Entry Point

```typescript
import { startDaemon, type WorkerEntryPoint } from '@dyyz1993/xcli-core';

// Define custom worker entry point
const workerEntryPoint: WorkerEntryPoint = async (context) => {
  const { sessionId, port } = context;

  console.log('Worker started for session:', sessionId);

  // Initialize custom resources
  const customResource = await initCustomResource();

  // Handle commands
  context.onCommand(async (command, args) => {
    console.log('Executing:', command);

    // Custom command handling
    if (command === 'customCommand') {
      return { ok: true, data: await customResource.process(args) };
    }

    return { ok: false, error: 'Unknown command' };
  });

  // Cleanup on exit
  context.onExit(async () => {
    await customResource.cleanup();
  });
};

// Start daemon with custom worker
await startDaemon({
  workerEntryPoint,
});
```

### Monitoring Workers

```typescript
import { WorkerManager } from '@dyyz1993/xcli-core';

const manager = new WorkerManager();

// Get worker statistics
const stats = manager.getWorkerStats();

console.log('Active workers:', stats.active);
console.log('Idle workers:', stats.idle);
console.log('Total commands:', stats.totalCommands);
console.log('Failed commands:', stats.failedCommands);
console.log('Average execution time:', stats.avgExecutionTime);
```

### Health Checks

```typescript
import { isDaemonRunning, getDaemonStatus } from '@dyyz1993/xcli-core';

async function healthCheck() {
  if (!isDaemonRunning()) {
    return { status: 'unhealthy', message: 'Daemon not running' };
  }

  const status = getDaemonStatus();

  if (status.workers === 0) {
    return { status: 'unhealthy', message: 'No workers available' };
  }

  return { status: 'healthy', uptime: status.uptime };
}
```

## Best Practices

### 1. Graceful Shutdown

```typescript
import { stopDaemon } from '@dyyz1993/xcli-core';

async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`);

  // Stop accepting new commands
  // ...

  // Wait for in-flight commands to complete
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Stop daemon
  await stopDaemon();

  console.log('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### 2. Worker Timeout Handling

```typescript
import { WorkerManager } from '@dyyz1993/xcli-core';

const manager = new WorkerManager({
  workerTimeout: 30000, // 30 second timeout
});

manager.on('workerTimeout', (workerId, command) => {
  console.error(`Worker ${workerId} timed out on command:`, command);
  // Restart worker or take other action
});
```

### 3. Resource Limits

```typescript
import { startDaemon } from '@dyyz1993/xcli-core';

await startDaemon({
  workerCount: 4,           // Limit worker count
  maxWorkers: 8,            // Limit concurrent workers
  workerTimeout: 60000,     // 60 second timeout
});
```

## API Reference

### Functions

#### startDaemon

```typescript
function startDaemon(config?: DaemonConfig): Promise<void>
```

#### stopDaemon

```typescript
function stopDaemon(): Promise<void>
```

#### isDaemonRunning

```typescript
function isDaemonRunning(): boolean
```

#### getDaemonStatus

```typescript
function getDaemonStatus(): DaemonStatus
```

#### killAllDaemon

```typescript
function killAllDaemon(): void
```

#### startWSServer

```typescript
function startWSServer(config?: WSServerConfig): Promise<void>
```

#### stopWSServer

```typescript
function stopWSServer(): Promise<void>
```

#### getWSServer

```typescript
function getWSServer(): WSServer | undefined
```

#### startHttpServer

```typescript
function startHttpServer(config?: HttpServerConfig): Promise<void>
```

## See Also

- [Architecture](./architecture.md) — Framework architecture overview
- [Session Management](./session-management.md) — Session system guide
- [WebSocket Integration](./websocket.md) — WebSocket server/client guide
