import {
  createServer as createHttpServer,
  type Server as NodeServer,
  type IncomingMessage,
  type ServerResponse,
} from 'http';
import { parse } from 'url';
import type {
  HttpServerConfig,
  HttpMiddleware,
  HttpRequest,
  HttpResponse,
  RouteHandler,
} from './types.js';
import { Router } from './router.js';
import { parseJsonBody, parseQuery } from './middleware.js';

export class HttpServer {
  private config: HttpServerConfig;
  private middlewares: HttpMiddleware[] = [];
  private router = new Router();
  private server: NodeServer | null = null;

  constructor(config: HttpServerConfig) {
    this.config = config;
  }

  use(middleware: HttpMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  get(path: string, handler: RouteHandler): this {
    this.router.add('GET', path, handler);
    return this;
  }

  post(path: string, handler: RouteHandler): this {
    this.router.add('POST', path, handler);
    return this;
  }

  put(path: string, handler: RouteHandler): this {
    this.router.add('PUT', path, handler);
    return this;
  }

  delete(path: string, handler: RouteHandler): this {
    this.router.add('DELETE', path, handler);
    return this;
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createHttpServer((req, res) => this.handleRequest(req, res));
      this.server.listen(this.config.port, this.config.host ?? '127.0.0.1', () => resolve());
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close((err) => {
        this.server = null;
        if (err) reject(err);
        else resolve();
      });
    });
  }

  get address(): { port: number; host: string } | null {
    if (!this.server) return null;
    const addr = this.server.address();
    if (!addr || typeof addr === 'string') return null;
    return { port: addr.port, host: addr.address };
  }

  private async handleRequest(nodeReq: IncomingMessage, nodeRes: ServerResponse): Promise<void> {
    const parsed = parse(nodeReq.url || '', true);
    const pathname = parsed.pathname || '/';
    const query = parseQuery(parsed.search || '');

    const req: HttpRequest = {
      method: nodeReq.method || 'GET',
      url: nodeReq.url || '/',
      pathname,
      params: {},
      query,
      body: undefined,
      headers: this.normalizeHeaders(nodeReq),
    };

    const res: HttpResponse = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: null,
    };

    try {
      const rawBody = await this.readBody(nodeReq);
      if (rawBody) {
        req.body = parseJsonBody(rawBody);
      }

      await this.runMiddlewares(req, res);

      if (res.body === null) {
        await this.runRoute(req, res);
      }

      this.sendResponse(nodeRes, res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      nodeRes.writeHead(500, { 'Content-Type': 'application/json' });
      nodeRes.end(JSON.stringify({ error: message }));
    }
  }

  private async runMiddlewares(req: HttpRequest, res: HttpResponse): Promise<void> {
    let index = 0;
    const middlewares = this.middlewares;

    const next = async (): Promise<void> => {
      if (index >= middlewares.length) return;
      const mw = middlewares[index++];
      await mw(req, res, next);
    };

    await next();
  }

  private async runRoute(req: HttpRequest, res: HttpResponse): Promise<void> {
    const match = this.router.match(req.method, req.pathname);
    if (!match) {
      res.statusCode = 404;
      res.body = { error: 'Not Found' };
      return;
    }

    req.params = match.params;
    const result = await match.handler(req);
    if (res.body === null) {
      res.body = result;
    }
  }

  private readBody(nodeReq: IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      let body = '';
      nodeReq.on('data', (chunk: Buffer) => {
        body += chunk;
      });
      nodeReq.on('end', () => resolve(body));
    });
  }

  private normalizeHeaders(nodeReq: IncomingMessage): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(nodeReq.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value.join(', ');
      }
    }
    return headers;
  }

  private sendResponse(nodeRes: ServerResponse, res: HttpResponse): void {
    const body = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
    nodeRes.writeHead(res.statusCode, res.headers);
    nodeRes.end(body);
  }
}
