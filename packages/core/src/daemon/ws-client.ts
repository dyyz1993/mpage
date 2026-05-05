import WebSocket from 'ws';

export interface WSMessage {
  type:
    | 'broadcast'
    | 'emit'
    | 'on'
    | 'off'
    | 'ping'
    | 'pong'
    | 'connected'
    | 'error'
    | 'event'
    | 'subscribed'
    | 'unsubscribed'
    | 'subscribe-broadcast'
    | 'unsubscribe-broadcast';
  channel?: string;
  event?: string;
  data?: unknown;
  id?: string;
}

export interface WSClientConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export type WSMessageCallback = (msg: WSMessage) => void;
export type WSEventCallback = (data: unknown) => void;

export class WSClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers = new Set<WSMessageCallback>();
  private eventHandlers = new Map<string, Set<WSEventCallback>>();
  private pendingSubscriptions = new Map<string, WSEventCallback>();
  private pendingId = 0;

  constructor(private config: WSClientConfig) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.url);

      this.ws.on('open', () => {
        this.reconnectAttempts = 0;
        this.pendingSubscriptions.forEach((handler, event) => {
          this.subscribe(event, handler);
        });
        this.pendingSubscriptions.clear();
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const msg: WSMessage = JSON.parse(data.toString('utf-8'));
          this.handleMessage(msg);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      });

      this.ws.on('close', () => {
        this.handleDisconnect();
      });

      this.ws.on('error', (err) => {
        reject(err);
      });
    });
  }

  private handleMessage(msg: WSMessage): void {
    for (const handler of this.messageHandlers) {
      try {
        handler(msg);
      } catch (err) {
        console.error('Error in message handler:', err);
      }
    }

    if (msg.type === 'event' && msg.event) {
      const handlers = this.eventHandlers.get(msg.event);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(msg.data);
          } catch (err) {
            console.error(`Error in event handler for ${msg.event}:`, err);
          }
        }
      }
    }
  }

  private handleDisconnect(): void {
    if (this.config.reconnectInterval && this.config.maxReconnectAttempts) {
      if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectAttempts++;
          this.connect().catch((err) => {
            console.error('Reconnection failed:', err);
          });
        }, this.config.reconnectInterval);
      }
    }
  }

  send(type: WSMessage['type'], data?: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const msg: WSMessage = { type, data };
    this.ws.send(JSON.stringify(msg));
  }

  broadcast(channel: string, data: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const msg: WSMessage = { type: 'broadcast', channel, data };
    this.ws.send(JSON.stringify(msg));
  }

  subscribeToBroadcast(channel: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const msg: WSMessage = { type: 'subscribe-broadcast', channel };
    this.ws.send(JSON.stringify(msg));
  }

  unsubscribeFromBroadcast(channel: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const msg: WSMessage = { type: 'unsubscribe-broadcast', channel };
    this.ws.send(JSON.stringify(msg));
  }

  emit(event: string, data: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const msg: WSMessage = { type: 'emit', event, data };
    this.ws.send(JSON.stringify(msg));
  }

  subscribe(event: string, handler: WSEventCallback): void {
    this.eventHandlers.set(event, (this.eventHandlers.get(event) || new Set()).add(handler));

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingSubscriptions.set(event, handler);
      return;
    }

    const id = `${event}-${Date.now()}`;
    const msg: WSMessage = { type: 'on', event, id };
    this.ws.send(JSON.stringify(msg));
  }

  unsubscribe(event: string): void {
    this.eventHandlers.delete(event);

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingSubscriptions.delete(event);
      return;
    }

    const msg: WSMessage = { type: 'off', event };
    this.ws.send(JSON.stringify(msg));
  }

  onMessage(handler: WSMessageCallback): void {
    this.messageHandlers.add(handler);
  }

  offMessage(handler: WSMessageCallback): void {
    this.messageHandlers.delete(handler);
  }

  ping(): void {
    const id = `ping-${Date.now()}`;
    this.send('ping', { id });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.messageHandlers.clear();
    this.eventHandlers.clear();
    this.pendingSubscriptions.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}
