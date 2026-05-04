import { chromium, type Browser, type Page } from 'playwright-core';
import type { CommandContext, SiteInstance, CommandHandler, CommandScope, Core } from '@xcli/core';
import { CommandError, coerceCliArgs, getChromiumPath } from '@xcli/core';
import type { CommandResult } from '@xcli/core';
import type { CommandArgs, CommandValues } from '@xcli/core';
import { analyzePage, formatTips } from './page-hook.js';
import { fail, wrapResult, withMeta } from '@xcli/core';
import { generateTips, formatResult } from '@xcli/tips';

interface SiteCommandEntry {
  name: string;
  description: string;
  requiresLogin?: boolean;
  scope: CommandScope;
  parameters?: unknown;
  result?: unknown;
  examples?: Array<{ cmd: string; description: string }>;
  tips?: string[];
  handler: CommandHandler;
}

const cdpCache = new Map<string, { browser: Browser; lastUsed: number }>();
const CDP_CACHE_TTL = 60_000;

async function getOrCreateBrowser(
  cdpEndpoint: string
): Promise<{ browser: Browser; reused: boolean }> {
  const cached = cdpCache.get(cdpEndpoint);
  if (cached && cached.browser.isConnected() && Date.now() - cached.lastUsed < CDP_CACHE_TTL) {
    cached.lastUsed = Date.now();
    return { browser: cached.browser, reused: true };
  }
  if (cached) cdpCache.delete(cdpEndpoint);
  const browser = await chromium.connectOverCDP(cdpEndpoint);
  cdpCache.set(cdpEndpoint, { browser, lastUsed: Date.now() });
  return { browser, reused: false };
}

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

function parseQuery(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const u = new URL(url);
    u.searchParams.forEach((v, k) => {
      params[k] = v;
    });
  } catch {}
  return params;
}

function getByPath(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let cur: unknown = obj;
  for (const k of keys) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function createNetworkCapture(page: Page): NetworkCapture {
  const items: CapturedResponse[] = [];
  const pendingWaiters: Array<{
    pattern: RegExp;
    resolve: (res: CapturedResponse | null) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];

  function notifyWaiters(captured: CapturedResponse) {
    for (let i = pendingWaiters.length - 1; i >= 0; i--) {
      if (pendingWaiters[i].pattern.test(captured.url)) {
        clearTimeout(pendingWaiters[i].timer);
        pendingWaiters[i].resolve(captured);
        pendingWaiters.splice(i, 1);
      }
    }
  }

  page.on('response', async (res) => {
    try {
      const text = await res.text();
      if (!text) return;
      const body = JSON.parse(text);
      const req = res.request();
      const resHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.headers())) {
        resHeaders[k] = v;
      }
      let postData: unknown;
      try {
        const pd = req.postData();
        if (pd) postData = JSON.parse(pd);
      } catch {}
      const reqHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers())) {
        reqHeaders[k] = v;
      }
      const captured: CapturedResponse = {
        url: res.url(),
        status: res.status(),
        headers: resHeaders,
        body,
        request: {
          url: req.url(),
          method: req.method(),
          headers: reqHeaders,
          queryParams: parseQuery(req.url()),
          postData,
        },
      };
      items.push(captured);
      notifyWaiters(captured);
    } catch {}
  });

  return {
    getAll: () => items,
    filter: (pattern: RegExp) => items.filter((c) => pattern.test(c.url)),
    waitFor: (pattern: RegExp, timeoutMs = 10000) => {
      const match = items.find((c) => pattern.test(c.url));
      if (match) return Promise.resolve(match);
      return new Promise<CapturedResponse | null>((resolve) => {
        const timer = setTimeout(() => {
          const idx = pendingWaiters.findIndex((w) => w.resolve === resolve);
          if (idx !== -1) pendingWaiters.splice(idx, 1);
          const late = items.find((c) => pattern.test(c.url));
          resolve(late ?? null);
        }, timeoutMs);
        pendingWaiters.push({ pattern, resolve, timer });
      });
    },
    search: (query) => {
      return items.filter((c) => {
        if (query.urlPattern && !query.urlPattern.test(c.url)) return false;
        if (query.status && c.status !== query.status) return false;
        if (query.method && c.request.method !== query.method) return false;
        if (query.bodyField) {
          const val = getByPath(c.body, query.bodyField);
          if (query.bodyValue !== undefined && val !== query.bodyValue) return false;
          if (query.bodyMatch && !query.bodyMatch(val)) return false;
        }
        return true;
      });
    },
    requests: (pattern) => {
      const all = items.map((c) => c.request);
      if (!pattern) return all;
      return all.filter((r) => pattern.test(r.url));
    },
  };
}

export function checkScope(scope: CommandScope, ctx: CommandContext): string | null {
  switch (scope) {
    case 'project':
      return null;
    case 'browser':
      return ctx.page ? null : '需要浏览器实例，请先执行 xcli open <url>';
    case 'page':
      return ctx.page ? null : '需要活跃的页面，请先执行 xcli open <url>';
    case 'element':
      return ctx.page ? null : '需要活跃的页面，请先执行 xcli open <url>';
  }
}

export async function executeSiteCommand(
  site: SiteInstance,
  cmdName: string,
  cmd: SiteCommandEntry,
  args: CommandArgs,
  values: CommandValues,
  cdpEndpoint?: string,
  core?: Core
) {
  const executablePath = core
    ? getChromiumPath(core)
    : '/Applications/Chromium.app/Contents/MacOS/Chromium';

  let browser: Browser;
  let page: Page;
  let usingCdp = false;
  let browserReused = false;

  if (cdpEndpoint) {
    try {
      const result = await getOrCreateBrowser(cdpEndpoint);
      browser = result.browser;
      browserReused = result.reused;
      usingCdp = true;
      const contexts = browser.contexts();
      const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
      page = await context.newPage();
    } catch (err) {
      throw new Error(
        `CDP 连接失败 (${cdpEndpoint}): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  } else {
    browser = await chromium.launch({ executablePath, headless: false });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    });
    page = await context.newPage();
  }

  const storage = site.getStorage();

  const outputMode: 'json' | 'yaml' | 'text' = values.yaml ? 'yaml' : values.json ? 'json' : 'text';

  const ctx: CommandContext = {
    args,
    options: values,
    cwd: process.cwd(),
    page,
    storage,
    output: {
      mode: outputMode,
      showTips: !values['no-tips'],
      color: !values['no-color'],
      emoji: !values['no-emoji'],
    },
    error: (msg: string) => console.error(msg),
    config: {
      network: createNetworkCapture(page),
    },
    site: null as unknown as SiteInstance,
    cliName: 'xcli',
  };

  try {
    const coercedValues = coerceCliArgs(
      cmd.parameters as Parameters<typeof coerceCliArgs>[0],
      values
    );
    const params = parseParams(cmd.parameters, args, coercedValues);

    const scopeError = checkScope(cmd.scope ?? 'page', ctx);
    if (scopeError) {
      const result = fail(scopeError, ['检查命令所需的 scope 是否满足']);
      result.meta = { duration: 0, command: cmdName, site: site.name };
      if (outputMode === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatResult(result, 'text'));
      }
      if (!usingCdp) await browser.close();
      return;
    }

    const start = Date.now();

    let result: CommandResult;
    try {
      const raw = await cmd.handler(params, ctx);
      result = wrapResult(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const tips = generateTips(err instanceof Error ? err : message);
      result = fail(message, tips);
    }

    const duration = Date.now() - start;
    result = withMeta(result, { duration, command: cmdName, site: site.name });

    const url = page.url();
    const title = await page.title().catch(() => '');
    const html = await page.content().catch(() => '');

    const detection = analyzePage({ html, url, title });

    if (detection.type !== null) {
      const pageTips = formatTips(detection);
      result.tips.push(...pageTips);
    }

    if (outputMode === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatResult(result, 'text'));
    }
  } catch (err) {
    if (err instanceof CommandError && err.code === 'INVALID_ARGS') {
      const tips = generateTips(err.message);
      const result = fail(err.message, [...tips, '检查命令参数: xcli <site> <command> --help']);
      console.log(formatResult(result, outputMode));
      return;
    }
    throw err;
  } finally {
    if (usingCdp) {
      await page.close().catch(() => {});
      if (!browserReused) {
        await browser.close().catch(() => {});
      }
    } else {
      await browser.close().catch(() => {});
    }
  }
}

interface ZodFieldDef {
  typeName?: string;
  shape?: () => Record<string, unknown>;
  innerType?: unknown;
  defaultValue?: () => unknown;
}

function parseParams(
  schema: unknown,
  args: CommandArgs,
  options: CommandValues
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!schema || !(schema as unknown as { _def?: ZodFieldDef })._def) return result;

  const schemaDef = (schema as unknown as { _def: ZodFieldDef })._def;
  if (schemaDef.typeName === 'ZodObject') {
    const shape =
      typeof schemaDef.shape === 'function'
        ? schemaDef.shape()
        : schemaDef.shape
          ? (schemaDef.shape as Record<string, unknown>)
          : undefined;
    if (!shape) return result;
    let remainingArgs = [...args];
    for (const [key, field] of Object.entries(shape)) {
      const f = field as unknown as { _def?: ZodFieldDef };

      if (options[key] !== undefined) {
        result[key] = options[key];
      } else if (remainingArgs.length > 0) {
        if (f._def?.typeName === 'ZodNumber') {
          result[key] = isNaN(Number(remainingArgs[0]))
            ? remainingArgs[0]
            : Number(remainingArgs[0]);
        } else if (f._def?.typeName === 'ZodDefault') {
          const inner = f._def.innerType as unknown as { _def?: ZodFieldDef };
          if (inner?._def?.typeName === 'ZodNumber') {
            result[key] = isNaN(Number(remainingArgs[0]))
              ? remainingArgs[0]
              : Number(remainingArgs[0]);
          } else {
            result[key] = remainingArgs[0];
          }
        } else {
          result[key] = remainingArgs[0];
        }
        remainingArgs = remainingArgs.slice(1);
      } else if (f._def?.typeName === 'ZodDefault') {
        result[key] = f._def.defaultValue?.();
      }
    }
  }
  return result;
}
