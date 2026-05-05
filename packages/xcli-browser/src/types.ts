export interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  postData?: unknown;
}

export interface CapturedResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
  request: CapturedRequest;
}

export interface NetworkCapture {
  getAll: () => CapturedResponse[];
  filter: (pattern: RegExp) => CapturedResponse[];
  waitFor: (pattern: RegExp, timeoutMs?: number) => Promise<CapturedResponse | null>;
  search: (query: {
    urlPattern?: RegExp;
    bodyField?: string;
    bodyValue?: unknown;
    bodyMatch?: (body: unknown) => boolean;
    status?: number;
    method?: string;
  }) => CapturedResponse[];
  requests: (pattern?: RegExp) => CapturedRequest[];
}
