import { describe, it, expect, afterEach } from 'vitest';
import { request } from 'http';
import { HttpServer, cors, bearerTokenAuth, jsonBody } from '../../src/http/index.js';
import type { HttpServerConfig } from '../../src/http/types.js';

function httpRequest(opts: {
  port: number;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}): Promise<{
  status: number;
  body: string;
  headers: Record<string, string | string[] | undefined>;
}> {
  return new Promise((resolve, reject) => {
    const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : '';
    const req = request(
      {
        hostname: '127.0.0.1',
        port: opts.port,
        path: opts.path,
        method: opts.method,
        headers: {
          'Content-Type': 'application/json',
          ...(opts.body !== undefined ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
          ...(opts.headers ?? {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode!,
            body: data,
            headers: res.headers as Record<string, string | string[] | undefined>,
          });
        });
      }
    );
    req.on('error', reject);
    if (opts.body !== undefined) req.write(bodyStr);
    req.end();
  });
}

function getPort(server: HttpServer): number {
  const addr = server.address;
  if (!addr) throw new Error('server not started');
  return addr.port;
}

describe('HttpServer', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  async function boot(
    cfg?: Partial<HttpServerConfig>
  ): Promise<{ server: HttpServer; port: number }> {
    const s = new HttpServer({ port: 0, ...cfg });
    server = s;
    return { server: s, port: 0 };
  }

  async function start(s: HttpServer): Promise<number> {
    await s.start();
    return getPort(s);
  }

  it('matches exact path', async () => {
    const { server: s } = await boot();
    s.get('/hello', async () => ({ msg: 'world' }));
    const port = await start(s);

    const res = await httpRequest({ port, method: 'GET', path: '/hello' });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ msg: 'world' });
  });

  it('extracts :param from path', async () => {
    const { server: s } = await boot();
    s.get('/users/:id', async (req) => ({ id: req.params.id }));
    const port = await start(s);

    const res = await httpRequest({ port, method: 'GET', path: '/users/42' });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ id: '42' });
  });

  it('returns 404 for unmatched routes', async () => {
    const { server: s } = await boot();
    s.get('/exists', async () => ({ ok: true }));
    const port = await start(s);

    const res = await httpRequest({ port, method: 'GET', path: '/missing' });
    expect(res.status).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: 'Not Found' });
  });

  it('routes GET/POST/PUT/DELETE independently', async () => {
    const { server: s } = await boot();
    s.get('/item', async () => ({ method: 'GET' }));
    s.post('/item', async () => ({ method: 'POST' }));
    s.put('/item', async () => ({ method: 'PUT' }));
    s.delete('/item', async () => ({ method: 'DELETE' }));
    const port = await start(s);

    const [g, po, pu, d] = await Promise.all([
      httpRequest({ port, method: 'GET', path: '/item' }),
      httpRequest({ port, method: 'POST', path: '/item' }),
      httpRequest({ port, method: 'PUT', path: '/item' }),
      httpRequest({ port, method: 'DELETE', path: '/item' }),
    ]);

    expect(JSON.parse(g.body)).toEqual({ method: 'GET' });
    expect(JSON.parse(po.body)).toEqual({ method: 'POST' });
    expect(JSON.parse(pu.body)).toEqual({ method: 'PUT' });
    expect(JSON.parse(d.body)).toEqual({ method: 'DELETE' });
  });

  it('registers multiple routes independently', async () => {
    const { server: s } = await boot();
    s.get('/a', async () => ({ route: 'a' }));
    s.get('/b', async () => ({ route: 'b' }));
    s.get('/c', async () => ({ route: 'c' }));
    const port = await start(s);

    const [a, b, c] = await Promise.all([
      httpRequest({ port, method: 'GET', path: '/a' }),
      httpRequest({ port, method: 'GET', path: '/b' }),
      httpRequest({ port, method: 'GET', path: '/c' }),
    ]);

    expect(JSON.parse(a.body)).toEqual({ route: 'a' });
    expect(JSON.parse(b.body)).toEqual({ route: 'b' });
    expect(JSON.parse(c.body)).toEqual({ route: 'c' });
  });

  it('executes middleware chain in order', async () => {
    const { server: s } = await boot();
    const order: number[] = [];

    s.use(async (_req, _res, next) => {
      order.push(1);
      await next();
    });
    s.use(async (_req, _res, next) => {
      order.push(2);
      await next();
    });
    s.get('/test', async () => {
      order.push(3);
      return { ok: true };
    });
    const port = await start(s);

    await httpRequest({ port, method: 'GET', path: '/test' });
    expect(order).toEqual([1, 2, 3]);
  });

  it('middleware can short-circuit response', async () => {
    const { server: s } = await boot();
    s.use(async (_req, res, _next) => {
      res.statusCode = 403;
      res.body = { blocked: true };
    });
    s.get('/never', async () => ({ should: 'not reach' }));
    const port = await start(s);

    const res = await httpRequest({ port, method: 'GET', path: '/never' });
    expect(res.status).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ blocked: true });
  });

  it('parses query string', async () => {
    const { server: s } = await boot();
    s.get('/search', async (req) => ({ q: req.query.q, page: req.query.page }));
    const port = await start(s);

    const res = await httpRequest({ port, method: 'GET', path: '/search?q=hello&page=2' });
    expect(JSON.parse(res.body)).toEqual({ q: 'hello', page: '2' });
  });
});

describe('cors middleware', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  it('sets CORS headers', async () => {
    server = new HttpServer({ port: 0 });
    server.use(cors());
    server.get('/data', async () => ({ ok: true }));
    const port = await server.start().then(() => getPort(server!));

    const res = await httpRequest({ port, method: 'GET', path: '/data' });
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-methods']).toBeDefined();
  });

  it('handles OPTIONS preflight', async () => {
    server = new HttpServer({ port: 0 });
    server.use(cors());
    server.get('/data', async () => ({ ok: true }));
    const port = await server.start().then(() => getPort(server!));

    const res = await httpRequest({ port, method: 'OPTIONS', path: '/data' });
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});

describe('bearerTokenAuth middleware', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  const TOKENS = ['secret-token-1', 'secret-token-2'];

  function makeAuthServer(publicPaths?: string[]): HttpServer {
    const s = new HttpServer({ port: 0 });
    s.use(bearerTokenAuth({ tokens: TOKENS, publicPaths }));
    s.get('/protected', async () => ({ secret: 'data' }));
    s.get('/public', async () => ({ public: true }));
    return s;
  }

  async function startAuthServer(publicPaths?: string[]): Promise<number> {
    server = makeAuthServer(publicPaths);
    await server.start();
    return getPort(server);
  }

  it('rejects missing token', async () => {
    const port = await startAuthServer();
    const res = await httpRequest({ port, method: 'GET', path: '/protected' });
    expect(res.status).toBe(401);
  });

  it('rejects wrong token', async () => {
    const port = await startAuthServer();
    const res = await httpRequest({
      port,
      method: 'GET',
      path: '/protected',
      headers: { Authorization: 'Bearer wrong' },
    });
    expect(res.status).toBe(403);
  });

  it('allows valid token', async () => {
    const port = await startAuthServer();
    const res = await httpRequest({
      port,
      method: 'GET',
      path: '/protected',
      headers: { Authorization: 'Bearer secret-token-1' },
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ secret: 'data' });
  });

  it('allows public paths without token', async () => {
    const port = await startAuthServer(['/public']);
    const res = await httpRequest({ port, method: 'GET', path: '/public' });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ public: true });
  });
});

describe('jsonBody middleware', () => {
  let server: HttpServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  it('parses POST JSON body', async () => {
    server = new HttpServer({ port: 0 });
    server.use(jsonBody());
    server.post('/data', async (req) => ({ echo: req.body }));
    const port = await server.start().then(() => getPort(server!));

    const res = await httpRequest({
      port,
      method: 'POST',
      path: '/data',
      body: { name: 'test', value: 42 },
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ echo: { name: 'test', value: 42 } });
  });

  it('defaults body to {} for POST without content', async () => {
    server = new HttpServer({ port: 0 });
    server.use(jsonBody());
    server.post('/empty', async (req) => ({ body: req.body }));
    const port = await server.start().then(() => getPort(server!));

    const res = await httpRequest({ port, method: 'POST', path: '/empty' });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ body: {} });
  });
});
