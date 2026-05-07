import { describe, it, expect, afterEach } from 'vitest';
import { request } from 'http';
import type { Server } from 'http';
import { startHttpServer, type RPCHandler } from '../../../src/daemon/http-server.js';

function getPort(server: Server): number {
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no address');
  return addr.port;
}

function rpcCall(
  port: number,
  method: string,
  params: Record<string, unknown>
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ method, params });
    const req = request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/rpc',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode!, body: JSON.parse(data) });
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpGet(port: number, path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode!, body: data });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('http-server', () => {
  let server: Server | null = null;

  afterEach(() => {
    if (server) {
      server.close();
      server = null;
    }
  });

  it('starts HTTP server on port 0 (random)', async () => {
    const handler: RPCHandler = async () => ({ ok: true });
    server = startHttpServer({ port: 0, rpcHandler: handler });
    await new Promise<void>((resolve) => server!.on('listening', resolve));
    expect(getPort(server!)).toBeGreaterThan(0);
  });

  it('handles /rpc POST and returns rpcHandler result', async () => {
    const handler: RPCHandler = async (method, params) => ({ method, echo: params });
    server = startHttpServer({ port: 0, rpcHandler: handler });
    await new Promise<void>((resolve) => server!.on('listening', resolve));
    const port = getPort(server!);

    const res = await rpcCall(port, 'navigate', { url: 'https://example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ method: 'navigate', echo: { url: 'https://example.com' } });
  });

  it('returns 500 when rpcHandler throws', async () => {
    const handler: RPCHandler = async () => {
      throw new Error('boom');
    };
    server = startHttpServer({ port: 0, rpcHandler: handler });
    await new Promise<void>((resolve) => server!.on('listening', resolve));
    const port = getPort(server!);

    const res = await rpcCall(port, 'fail', {});
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'boom' });
  });

  it('returns 500 with string error for non-Error throws', async () => {
    const handler: RPCHandler = async () => {
      throw 'string-error';
    };
    server = startHttpServer({ port: 0, rpcHandler: handler });
    await new Promise<void>((resolve) => server!.on('listening', resolve));
    const port = getPort(server!);

    const res = await rpcCall(port, 'fail', {});
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'string-error' });
  });

  it('returns 404 for unknown routes', async () => {
    const handler: RPCHandler = async () => ({});
    server = startHttpServer({ port: 0, rpcHandler: handler });
    await new Promise<void>((resolve) => server!.on('listening', resolve));
    const port = getPort(server!);

    const res = await httpGet(port, '/unknown');
    expect(res.status).toBe(404);
    expect(res.body).toBe('Not Found');
  });

  it('routes to extraRoutes when matched', async () => {
    const handler: RPCHandler = async () => ({});
    server = startHttpServer({
      port: 0,
      rpcHandler: handler,
      extraRoutes: [
        {
          pathname: '/health',
          handler: (_req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('ok');
          },
        },
      ],
    });
    await new Promise<void>((resolve) => server!.on('listening', resolve));
    const port = getPort(server!);

    const res = await httpGet(port, '/health');
    expect(res.status).toBe(200);
    expect(res.body).toBe('ok');
  });
});
