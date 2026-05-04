import type { Response } from 'playwright-core';

export interface NetRecord {
  url: string;
  method: string;
  status: number;
  statusText: string;
  resourceType: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  body: unknown;
  timestamp: number;
}

export class NetCapture {
  private records: NetRecord[] = [];

  on(response: Response): void {
    const req = response.request();
    this.records.push({
      url: response.url(),
      method: req.method(),
      status: response.status(),
      statusText: response.statusText(),
      resourceType: req.resourceType(),
      requestHeaders: req.headers(),
      responseHeaders: response.headers() as Record<string, string>,
      body: null,
      timestamp: Date.now(),
    });
  }

  async captureJson(response: Response): Promise<void> {
    const last = this.records[this.records.length - 1];
    if (last && last.url === response.url()) {
      try {
        last.body = await response.json();
      } catch {}
    }
  }

  filter(pattern: RegExp | string): NetRecord[] {
    if (typeof pattern === 'string') {
      pattern = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    return this.records.filter((r) => (pattern as RegExp).test(r.url));
  }

  searchUrl(keyword: string): NetRecord[] {
    return this.records.filter((r) => r.url.toLowerCase().includes(keyword.toLowerCase()));
  }

  getJson<T = unknown>(pattern: RegExp | string): T[] {
    return this.filter(pattern)
      .map((r) => r.body)
      .filter((b): b is T => b !== null && typeof b === 'object');
  }

  getLatest(pattern: RegExp | string): NetRecord | null {
    const matched = this.filter(pattern);
    return matched.length > 0 ? matched[matched.length - 1] : null;
  }

  getAll(): NetRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
  }

  get count(): number {
    return this.records.length;
  }
}
