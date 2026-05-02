import type { Page } from 'playwright';

const CRAWLER_BASE = process.env.CRAWLER_BASE_URL || 'http://localhost:3000';

export function crawlerUrl(path: string): string {
  return `${CRAWLER_BASE}/tools/crawler-practice/examples/${path}.html`;
}

export interface SafeGotoOptions {
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

export async function safeGoto(page: Page, url: string, opts: SafeGotoOptions = {}) {
  const timeout = opts.timeout ?? 10000;
  const waitUntil = opts.waitUntil ?? 'domcontentloaded';

  try {
    const resp = await page.goto(url, { timeout, waitUntil });
    if (!resp) throw new Error(`导航失败: 无响应 (${url})`);
    if (resp.status() === 404) throw new Error(`页面不存在: 404 (${url})`);
    if (resp.status() >= 400) throw new Error(`HTTP ${resp.status()} (${url})`);
    return resp;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Navigation')) {
      throw new Error(`导航超时: ${url}`);
    }
    throw err;
  }
}

export async function waitForAnySelector(
  page: Page,
  selectors: string[],
  timeout = 10000
): Promise<string | null> {
  try {
    const result = await Promise.race(
      selectors.map(async (sel) => {
        await page.waitForSelector(sel, { timeout });
        return sel;
      })
    );
    return result;
  } catch {
    return null;
  }
}

export async function pageExists(page: Page, url: string): Promise<boolean> {
  try {
    const resp = await page.goto(url, { timeout: 8000, waitUntil: 'domcontentloaded' });
    return !!resp && resp.status() >= 200 && resp.status() < 400;
  } catch {
    return false;
  }
}

export function ok<T>(data: T, tips: string[] = []) {
  return { data, errors: [], tips };
}

export function fail(msg: string, tips: string[] = []) {
  return { data: [], errors: [{ message: msg }], tips };
}
