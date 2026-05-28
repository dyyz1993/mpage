import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DebugPage } from '../../src/client/debug-page.js';
import type { Page, Browser, BrowserContext } from 'playwright-core';

function createMockPage() {
  const handlers: Record<string, (...args: unknown[]) => unknown> = {
    goto: vi.fn().mockResolvedValue(null),
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    type: vi.fn().mockResolvedValue(undefined),
    press: vi.fn().mockResolvedValue(undefined),
    hover: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(null),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('')),
    title: vi.fn().mockResolvedValue('Test Page'),
    content: vi.fn().mockResolvedValue('<html></html>'),
    evaluate: vi.fn().mockImplementation((fn) => {
      if (typeof fn === 'function') return fn();
      return undefined;
    }),
    locator: vi.fn().mockReturnValue({
      ariaSnapshot: vi.fn().mockResolvedValue('- button "Click me"'),
      first: vi.fn().mockReturnThis(),
      screenshot: vi.fn().mockResolvedValue(Buffer.from('')),
    }),
    close: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('https://example.com'),
  };

  const context = {
    pages: vi.fn().mockReturnValue([]),
    close: vi.fn().mockResolvedValue(undefined),
    cookies: vi.fn().mockResolvedValue([]),
    addCookies: vi.fn().mockResolvedValue(undefined),
    clearCookies: vi.fn().mockResolvedValue(undefined),
  } as unknown as BrowserContext;

  const page = {
    ...handlers,
    context: vi.fn().mockReturnValue(context),
    viewportSize: vi.fn().mockReturnValue({ width: 1280, height: 720 }),
  } as unknown as Page;

  const browser = { close: vi.fn().mockResolvedValue(undefined) } as unknown as Browser;

  return { page, browser, context, handlers };
}

describe('DebugPage', () => {
  let mock: ReturnType<typeof createMockPage>;
  let debugPage: DebugPage;

  beforeEach(() => {
    mock = createMockPage();
    debugPage = new DebugPage(mock.page, mock.browser, mock.context, true);
  });

  it('exposes raw Playwright Page via .raw', () => {
    expect(debugPage.raw).toBe(mock.page);
  });

  it('exec() runs xpage command with schema validation', async () => {
    await debugPage.exec('goto', { url: 'https://example.com' });
    expect(mock.handlers.goto).toHaveBeenCalled();
  });

  it('exec() throws on invalid args', async () => {
    await expect(debugPage.exec('goto', {})).rejects.toThrow('xpage.exec("goto")');
  });

  it('exec() works for commands without cliMeta', async () => {
    const result = await debugPage.exec('click', { selector: '#btn' });
    expect(mock.handlers.click).toHaveBeenCalled();
  });

  it('extract() wraps page.evaluate', async () => {
    mock.handlers.evaluate = vi.fn().mockImplementation((fn) => fn());
    const result = await debugPage.extract(() => 42);
    expect(result).toBe(42);
  });

  it('close() closes page, context, browser when owned', async () => {
    await debugPage.close();
    expect(mock.handlers.close).toHaveBeenCalled();
  });

  it('close() does nothing when not owned', async () => {
    const external = new DebugPage(mock.page, mock.browser, mock.context, false);
    await external.close();
    expect(mock.handlers.close).not.toHaveBeenCalled();
  });

  it('delegates goto to raw page', async () => {
    await debugPage.goto('https://example.com');
    expect(mock.handlers.goto).toHaveBeenCalledWith('https://example.com', undefined);
  });

  it('delegates click to raw page', async () => {
    await debugPage.click('#btn');
    expect(mock.handlers.click).toHaveBeenCalledWith('#btn', undefined);
  });

  it('delegates fill to raw page', async () => {
    await debugPage.fill('#input', 'hello');
    expect(mock.handlers.fill).toHaveBeenCalledWith('#input', 'hello', undefined);
  });

  it('delegates waitForTimeout to raw page', async () => {
    await debugPage.waitForTimeout(1000);
    expect(mock.handlers.waitForTimeout).toHaveBeenCalledWith(1000);
  });

  it('delegates screenshot to raw page', async () => {
    await debugPage.screenshot();
    expect(mock.handlers.screenshot).toHaveBeenCalled();
  });

  it('delegates title to raw page', async () => {
    const t = await debugPage.title();
    expect(t).toBe('Test Page');
  });

  it('url() returns page url synchronously', () => {
    expect(debugPage.url()).toBe('https://example.com');
  });

  it('evaluate() with function delegates to page.evaluate', async () => {
    const fn = () => 'hello';
    await debugPage.evaluate(fn);
    expect(mock.handlers.evaluate).toHaveBeenCalledWith(fn);
  });

  it('evaluate() with string delegates to page.evaluate', async () => {
    await debugPage.evaluate('1 + 1');
    expect(mock.handlers.evaluate).toHaveBeenCalledWith('1 + 1');
  });

  it('evaluate() with arg delegates to page.evaluate', async () => {
    const fn = (x: number) => x * 2;
    await debugPage.evaluate(fn, 5);
    expect(mock.handlers.evaluate).toHaveBeenCalledWith(fn, 5);
  });

  it('provides context and pages getters', () => {
    expect(debugPage.context).toBeDefined();
    expect(Array.isArray(debugPage.pages)).toBe(true);
  });
});
