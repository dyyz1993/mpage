import type { RouteHandler } from './types.js';

interface Route {
  method: string;
  pattern: string;
  segments: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];

  add(method: string, pattern: string, handler: RouteHandler): void {
    const segments = pattern.split('/').filter(Boolean);
    this.routes.push({ method: method.toUpperCase(), pattern, segments, handler });
  }

  match(
    method: string,
    pathname: string
  ): { handler: RouteHandler; params: Record<string, string> } | null {
    const segments = pathname.split('/').filter(Boolean);
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;
      const params = this.tryMatch(route.segments, segments);
      if (params !== null) {
        return { handler: route.handler, params };
      }
    }
    return null;
  }

  private tryMatch(
    patternSegments: string[],
    urlSegments: string[]
  ): Record<string, string> | null {
    if (patternSegments.length !== urlSegments.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < patternSegments.length; i++) {
      const pat = patternSegments[i];
      const seg = urlSegments[i];
      if (pat.startsWith(':')) {
        params[pat.slice(1)] = seg;
      } else if (pat !== seg) {
        return null;
      }
    }
    return params;
  }
}
