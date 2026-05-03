import { readFileSync, existsSync } from 'fs';
import type { Page } from 'playwright';

const CRAWLER_BASE = process.env.CRAWLER_BASE_URL || 'http://localhost:3000';
const CASE_DATA_DIR =
  '/Users/xuyingzhou/Project/temporary/multi-service-container/apps/tool-box/public/tools/crawler-practice/data/cases';

export interface ScrapeResult {
  data: Record<string, unknown> | null;
  source: 'page' | 'fs';
  error?: string;
}

export function loadCaseDataFromFs(caseId: string): Record<string, unknown> | null {
  const filePath = `${CASE_DATA_DIR}/${caseId}.json`;
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed.mockData || parsed;
  } catch {
    return null;
  }
}

export async function scrapeDynamicCase(page: Page, caseId: string): Promise<ScrapeResult> {
  const url = dynamicCaseUrl(caseId);

  try {
    const resp = await page.goto(url, { timeout: 10000, waitUntil: 'domcontentloaded' });
    if (!resp || resp.status() >= 500) {
      const fsData = loadCaseDataFromFs(caseId);
      if (fsData) return { data: fsData, source: 'fs' };
      return {
        data: null,
        source: 'fs',
        error: `页面返回 ${resp?.status() ?? '无响应'}，且文件系统中无 ${caseId}.json`,
      };
    }
    if (resp.status() >= 400) {
      const fsData = loadCaseDataFromFs(caseId);
      if (fsData) return { data: fsData, source: 'fs' };
      return { data: null, source: 'page', error: `HTTP ${resp.status()}` };
    }

    await page.waitForFunction(
      () => !!(document.getElementById('case-data') as HTMLScriptElement)?.textContent,
      { timeout: 10000 }
    );

    const result = await page.evaluate(() => {
      const scriptEl = document.getElementById('case-data') as HTMLScriptElement;
      if (!scriptEl?.textContent) return null;
      try {
        return JSON.parse(scriptEl.textContent);
      } catch {
        return null;
      }
    });

    if (!result) {
      const fsData = loadCaseDataFromFs(caseId);
      if (fsData) return { data: fsData, source: 'fs' };
      return { data: null, source: 'page', error: '未找到 case-data' };
    }

    const mockData = result.mockData || result;
    return { data: mockData, source: 'page' };
  } catch {
    const fsData = loadCaseDataFromFs(caseId);
    if (fsData) return { data: fsData, source: 'fs' };
    return { data: null, source: 'page', error: `导航失败: ${url}` };
  }
}

export function buildTips(mockData: Record<string, unknown> | null): string[] {
  const tips: string[] = [];
  if (typeof mockData === 'object' && mockData !== null) {
    const keys = Object.keys(mockData);
    tips.push(
      `mockData 字段: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? ` (+${keys.length - 5})` : ''}`
    );
    for (const key of keys.slice(0, 3)) {
      const val = (mockData as Record<string, unknown>)[key];
      if (Array.isArray(val)) {
        tips.push(`${key}: ${val.length} 项`);
      } else if (typeof val === 'string') {
        tips.push(`${key}: ${val.substring(0, 50)}`);
      }
    }
  }
  return tips;
}

export function crawlerUrl(path: string): string {
  return `${CRAWLER_BASE}/tools/crawler-practice/examples/${path}.html`;
}

export function dynamicCaseUrl(caseId: string): string {
  return `${CRAWLER_BASE}/crawler-practice/dynamic/${caseId}`;
}

export const TEMPLATE_TYPES = [
  'list',
  'detail',
  'form',
  'captcha',
  'anti-bot',
  'social',
  'mobile',
  'dynamic',
  'api-doc',
  'error',
  'editor',
  'dashboard',
] as const;

export type TemplateType = (typeof TEMPLATE_TYPES)[number];

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
