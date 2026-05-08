---
title: WebSocket
---

# WebSocket

实时通信，用于状态变更通知。

## WSServer

```typescript
class WSServer {
  constructor(config: WSServerConfig);
  start(): Promise<void>;
  stop(): Promise<void>;
  broadcast(message: WSMessage): void;
}
```

```typescript
import { WSServer } from '@dyyz1993/xcli-core';

const server = new WSServer({
  port: 9223,
  onMessage: (ws, message) => {
    console.log('Received:', message);
  },
});

await server.start();
```

## WSClient

```typescript
class WSClient {
  constructor(config: WSClientConfig);
  connect(): Promise<void>;
  send(message: WSMessage): void;
  on(event: 'message' | 'open' | 'close' | 'error', callback: Callback): void;
  onMessage(handler: (msg: WSMessage) => void): void;
  onEvent(eventType: string, handler: (data: unknown) => void): void;
}
```

```typescript
import { WSClient } from '@dyyz1993/xcli-core';

const client = new WSClient({ url: 'ws://localhost:8054' });
client.onMessage((msg) => {
  console.log('收到事件:', msg);
});
client.onEvent('database:ready', (data) => {
  console.log('数据库就绪:', data);
});
```

## Daemon 端 HTTP RPC

```typescript
import { startHttpServer, type RPCHandler } from '@dyyz1993/xcli-core';

const handlers: RPCHandler[] = [
  {
    method: 'execute',
    handle: async (params) => {
      return worker.execute(params.method, params.params);
    },
  },
];

await startHttpServer({ port: 8054, handlers });
```
