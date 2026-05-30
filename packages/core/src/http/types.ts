export interface HttpRequest {
  method: string;
  url: string;
  pathname: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  headers: Record<string, string>;
}

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

export type HttpMiddleware = (
  req: HttpRequest,
  res: HttpResponse,
  next: () => Promise<void>
) => Promise<void>;

export type RouteHandler = (req: HttpRequest) => Promise<unknown>;

export interface HttpServerConfig {
  port: number;
  host?: string;
}
