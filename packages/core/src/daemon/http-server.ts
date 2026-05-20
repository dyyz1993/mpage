import {
  createServer as createHttpServer,
  type Server as HttpServer,
  type IncomingMessage,
  type ServerResponse,
} from 'http';
import { parse } from 'url';

export type RPCHandler = (method: string, params: Record<string, unknown>) => Promise<unknown>;

export interface HttpServerConfig {
  port: number;
  rpcHandler: RPCHandler;
  extraRoutes?: Array<{
    pathname: string;
    handler: (req: IncomingMessage, res: ServerResponse, rpcHandler: RPCHandler) => void;
  }>;
}

function handleHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: HttpServerConfig
): void {
  const { pathname } = parse(req.url || '', true);

  if (config.extraRoutes) {
    for (const route of config.extraRoutes) {
      if (pathname === route.pathname) {
        route.handler(req, res, config.rpcHandler);
        return;
      }
    }
  }

  if (pathname === '/rpc') {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const { method, params } = JSON.parse(body);
        const result = await config.rpcHandler(method, params);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}

export function startHttpServer(config: HttpServerConfig): HttpServer {
  const httpServer = createHttpServer((req, res) => handleHttpRequest(req, res, config));
  httpServer.listen(config.port, () => {
    console.log(`HTTP server listening on port ${config.port}`);
  });
  return httpServer;
}
