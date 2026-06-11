import type { HttpMiddleware, HttpRequest, HttpResponse } from './types.js';

export function cors(options?: { origins?: string[]; methods?: string[] }): HttpMiddleware {
  const origins = options?.origins ?? ['*'];
  const methods = options?.methods ?? ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

  return async (req: HttpRequest, res: HttpResponse, next: () => Promise<void>) => {
    res.headers['Access-Control-Allow-Origin'] = origins.join(', ');
    res.headers['Access-Control-Allow-Methods'] = methods.join(', ');
    res.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.body = '';
      return;
    }

    await next();
  };
}

export function bearerTokenAuth(options: {
  tokens: string[];
  publicPaths?: string[];
  envTokenKey?: string;
}): HttpMiddleware {
  const { tokens: configTokens, publicPaths = [], envTokenKey } = options;

  const resolveTokens = (): string[] => {
    const all = new Set<string>(configTokens);
    if (envTokenKey && process.env[envTokenKey]) {
      for (const t of process.env[envTokenKey]!.split(',')) {
        const trimmed = t.trim();
        if (trimmed) all.add(trimmed);
      }
    }
    return Array.from(all);
  };

  return async (req: HttpRequest, res: HttpResponse, next: () => Promise<void>) => {
    if (publicPaths.some((p) => req.pathname === p || req.pathname.startsWith(p + '/'))) {
      await next();
      return;
    }

    const tokens = resolveTokens();
    if (tokens.length === 0) {
      await next();
      return;
    }

    const authHeader = req.headers['authorization'] ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      res.statusCode = 401;
      res.body = { error: 'Missing or invalid Authorization header' };
      return;
    }

    const token = authHeader.slice(7);
    if (!tokens.includes(token)) {
      res.statusCode = 403;
      res.body = { error: 'Invalid token' };
      return;
    }

    await next();
  };
}

export function jsonBody(): HttpMiddleware {
  return async (req: HttpRequest, _res: HttpResponse, next: () => Promise<void>) => {
    if (req.body === undefined && (req.method === 'POST' || req.method === 'PUT')) {
      req.body = {};
    }
    await next();
  };
}

export function parseJsonBody(raw: string): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function parseQuery(search: string): Record<string, string> {
  const query: Record<string, string> = {};
  if (!search || !search.startsWith('?')) return query;
  const params = new URLSearchParams(search);
  for (const [key, value] of params) {
    query[key] = value;
  }
  return query;
}
