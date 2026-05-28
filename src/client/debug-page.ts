import type {
  Page,
  Browser,
  BrowserContext,
  Locator,
  ElementHandle,
  Response,
} from 'playwright-core';
import { executePageCommand } from '../server/commands/index.js';
import { commands } from '../commands/definitions.js';

export interface DebugPageOptions {
  cdp?: string;
  headless?: boolean;
  chromiumPath?: string;
  viewport?: { width: number; height: number };
}

type ExtractFn<T> = () => T | Promise<T>;

export class DebugPage {
  private _page: Page;
  private _browser: Browser | null;
  private _context: BrowserContext | null;
  private _owned: boolean;

  constructor(page: Page, browser: Browser | null, context: BrowserContext | null, owned: boolean) {
    this._page = page;
    this._browser = browser;
    this._context = context;
    this._owned = owned;
  }

  get raw(): Page {
    return this._page;
  }

  async exec<T = unknown>(commandName: string, args: Record<string, unknown> = {}): Promise<T> {
    const def = commands[commandName];
    if (def) {
      const parsed = def.schema.safeParse(args);
      if (!parsed.success) {
        throw new Error(
          `xpage.exec("${commandName}"): ${parsed.error.issues.map((i) => i.message).join(', ')}`
        );
      }
    }
    const result = await executePageCommand(this._page, commandName, args);
    return result as T;
  }

  extract<T>(fn: ExtractFn<T>): Promise<T> {
    return this._page.evaluate(fn);
  }

  async close(): Promise<void> {
    if (this._owned) {
      await this._page.close();
      await this._context?.close();
      await this._browser?.close();
    }
  }

  goto(url: string, options?: Record<string, unknown>): Promise<Response | null> {
    return this._page.goto(url, options as Parameters<Page['goto']>[1]);
  }

  click(selector: string, options?: Record<string, unknown>): Promise<void> {
    return this._page.click(selector, options as Parameters<Page['click']>[1]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fill(selector: string, value: string, options?: any): Promise<void> {
    return this._page.fill(selector, value, options);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type(selector: string, text: string, options?: any): Promise<void> {
    return this._page.type(selector, text, options);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  press(selector: string, key: string, options?: any): Promise<void> {
    return this._page.press(selector, key, options);
  }

  hover(selector: string, options?: Record<string, unknown>): Promise<void> {
    return this._page.hover(selector, options as Parameters<Page['hover']>[1]);
  }

  waitForSelector(
    selector: string,
    options?: Record<string, unknown>
  ): Promise<ElementHandle<HTMLElement | SVGElement> | null> {
    return this._page.waitForSelector(selector, options as Parameters<Page['waitForSelector']>[1]);
  }

  waitForTimeout(timeout: number): Promise<void> {
    return this._page.waitForTimeout(timeout);
  }

  waitForLoadState(
    state?: 'load' | 'domcontentloaded' | 'networkidle',
    options?: Record<string, unknown>
  ): Promise<void> {
    return this._page.waitForLoadState(state, options as Parameters<Page['waitForLoadState']>[1]);
  }

  screenshot(options?: Record<string, unknown>): Promise<Buffer> {
    return this._page.screenshot(options as Parameters<Page['screenshot']>[0]);
  }

  title(): Promise<string> {
    return this._page.title();
  }

  url(): string {
    return this._page.url();
  }

  content(): Promise<string> {
    return this._page.content();
  }

  evaluate<R>(fn: () => R | Promise<R>): Promise<R>;
  evaluate<R, A>(fn: (arg: A) => R | Promise<R>, arg: A): Promise<R>;
  evaluate<R>(fn: ((...args: unknown[]) => R | Promise<R>) | string, arg?: unknown): Promise<R> {
    if (typeof fn === 'string') {
      return this._page.evaluate(fn) as Promise<R>;
    }
    return (
      arg !== undefined ? this._page.evaluate(fn, arg) : this._page.evaluate(fn)
    ) as Promise<R>;
  }

  locator(selector: string): Locator {
    return this._page.locator(selector);
  }

  get context(): BrowserContext {
    return this._page.context();
  }

  get pages(): Page[] {
    return this._page.context().pages();
  }
}
