import { WebSocketServer, WebSocket } from 'ws';

export interface WSMessage {
  type:
    | 'broadcast'
    | 'emit'
    | 'on'
    | 'off'
    | 'ping'
    | 'pong'
    | 'subscribe-broadcast'
    | 'unsubscribe-broadcast';
  channel?: string;
  event?: string;
  data?: unknown;
  id?: string;
}

export interface WSServerConfig {
  port: number;
  host?: string;
  path?: string;
}

export type WSMessageHandler = (data: unknown) => void;

export class WSServer {
  private server: WebSocketServer | null = null;
  private channels = new Map<string, Set<WebSocket>>();
  private clients = new Map<WebSocket, Set<string>>();
  private eventHandlers = new Map<string, Set<WSMessageHandler>>();
  private broadcastListeners = new Map<WebSocket, Set<string>>();

  constructor(private config: WSServerConfig) {}

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const serverOptions: {
        port: number;
        host?: string;
        path?: string;
      } = {
        port: this.config.port,
        host: this.config.host || '0.0.0.0',
      };

      if (this.config.path) {
        serverOptions.path = this.config.path;
      }

      this.server = new WebSocketServer(serverOptions);

      this.server.on('listening', () => {
        resolve();
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.on('connection', (ws, _req) => {
        this.handleConnection(ws, _req);
      });
    });
  }

  private handleConnection(ws: WebSocket, _req: unknown): void {
    this.clients.set(ws, new Set());

    ws.on('message', (data: Buffer) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString('utf-8'));
        this.handleMessage(ws, msg);
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: 'error',
            data: 'Invalid message format',
          })
        );
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', () => {
      this.handleDisconnection(ws);
    });

    ws.send(JSON.stringify({ type: 'connected' }));
  }

  private handleMessage(ws: WebSocket, msg: WSMessage): void {
    switch (msg.type) {
      case 'broadcast':
        this.broadcast(msg.channel || 'default', msg.data);
        break;
      case 'emit':
        this.emit(ws, msg.event || 'message', msg.data);
        break;
      case 'on':
        this.on(ws, msg.event || 'message', msg.id);
        break;
      case 'off':
        this.off(ws, msg.id);
        break;
      case 'subscribe-broadcast':
        if (msg.channel) {
          this.addToBroadcastListeners(ws, msg.channel);
        }
        break;
      case 'unsubscribe-broadcast':
        if (msg.channel) {
          this.removeFromBroadcastListeners(ws, msg.channel);
        }
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', id: msg.id }));
        break;
      default:
        ws.send(
          JSON.stringify({
            type: 'error',
            data: `Unknown message type: ${msg.type}`,
          })
        );
    }
  }

  private handleDisconnection(ws: WebSocket): void {
    const clientChannels = this.clients.get(ws);
    if (clientChannels) {
      for (const channel of clientChannels) {
        const channelClients = this.channels.get(channel);
        if (channelClients) {
          channelClients.delete(ws);
          if (channelClients.size === 0) {
            this.channels.delete(channel);
          }
        }
      }
    }
    this.clients.delete(ws);
    this.broadcastListeners.delete(ws);
  }

  bindToChannel(sessionId: string, ws: WebSocket): void {
    const channel = `session:${sessionId}`;
    let channelClients = this.channels.get(channel);
    if (!channelClients) {
      channelClients = new Set();
      this.channels.set(channel, channelClients);
    }
    channelClients.add(ws);

    const clientChannels = this.clients.get(ws);
    if (clientChannels) {
      clientChannels.add(channel);
    }
  }

  broadcast(channel: string, data: unknown): void {
    for (const [client, channels] of this.broadcastListeners) {
      if (channels.has(channel) && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'broadcast', channel, data }));
      }
    }
  }

  private addToBroadcastListeners(ws: WebSocket, channel: string): void {
    let channels = this.broadcastListeners.get(ws);
    if (!channels) {
      channels = new Set();
      this.broadcastListeners.set(ws, channels);
    }
    channels.add(channel);
  }

  private removeFromBroadcastListeners(ws: WebSocket, channel: string): void {
    const channels = this.broadcastListeners.get(ws);
    if (channels) {
      channels.delete(channel);
      if (channels.size === 0) {
        this.broadcastListeners.delete(ws);
      }
    }
  }

  private emit(ws: WebSocket, event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in event handler for ${event}:`, err);
        }
      }
    }
  }

  private on(ws: WebSocket, event: string, handlerId?: string): void {
    const id = handlerId || `handler-${Date.now()}-${Math.random()}`;
    const channel = `handler:${id}`;
    let channelClients = this.channels.get(channel);
    if (!channelClients) {
      channelClients = new Set();
      this.channels.set(channel, channelClients);
    }
    channelClients.add(ws);

    const handler: WSMessageHandler = (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'event',
            event,
            id,
            data,
          })
        );
      }
    };

    let handlers = this.eventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(event, handlers);
    }
    handlers.add(handler);

    ws.send(JSON.stringify({ type: 'subscribed', event, id }));
  }

  private off(ws: WebSocket, handlerId?: string): void {
    if (!handlerId) return;

    const channel = `handler:${handlerId}`;
    const channelClients = this.channels.get(channel);
    if (channelClients) {
      channelClients.delete(ws);
      if (channelClients.size === 0) {
        this.channels.delete(channel);
      }
    }

    for (const [, handlers] of this.eventHandlers) {
      for (const handler of handlers) {
        handlers.delete(handler);
      }
    }

    ws.send(JSON.stringify({ type: 'unsubscribed', id: handlerId }));
  }

  getSessionConnections(sessionId: string): WebSocket[] {
    const channel = `session:${sessionId}`;
    const channelClients = this.channels.get(channel);
    return channelClients ? Array.from(channelClients) : [];
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      for (const ws of this.server.clients) {
        ws.close();
      }

      this.server.close(() => {
        this.server = null;
        this.channels.clear();
        this.clients.clear();
        this.eventHandlers.clear();
        resolve();
      });
    });
  }

  getConnectedClients(): number {
    return this.server?.clients.size || 0;
  }

  getChannelCount(channel: string): number {
    return this.channels.get(channel)?.size || 0;
  }
}
