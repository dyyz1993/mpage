import {
  createServer as createHttpServer,
  Server as HttpServer,
  IncomingMessage,
  ServerResponse,
} from 'http';
import { parse } from 'url';
import { readFileSync } from 'fs';
import { join } from 'path';
import { handleRPCCommandAsync } from './rpc-handlers';
import { listSessions } from './session-store';

const SWAGGER_JSON = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'core', 'swagger.json'), 'utf-8')
);
const VIEWER_HTML = readFileSync(join(process.cwd(), 'src', 'viewer.html'), 'utf-8');

function getSwaggerUI(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>XCLI Daemon API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: "/swagger.json",
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset]
      });
    };
  </script>
</body>
</html>`;
}

async function handleHttpRequest(req: IncomingMessage, res: ServerResponse) {
  const { pathname } = parse(req.url || '', true);

  if (pathname === '/' || pathname === '/docs') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getSwaggerUI());
    return;
  }

  if (pathname === '/swagger.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(SWAGGER_JSON, null, 2));
    return;
  }

  if (pathname === '/viewer.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(VIEWER_HTML);
    return;
  }

  if (pathname === '/api/sessions') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(listSessions()));
    return;
  }

  if (pathname === '/rpc') {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const { method, params } = JSON.parse(body);
        const result = await handleRPCCommandAsync(method, params);
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

export function startHttpServer(port: number): HttpServer {
  const httpServer = createHttpServer(handleHttpRequest);
  httpServer.listen(port, () => {
    console.log(`HTTP server listening on port ${port}`);
  });
  return httpServer;
}
