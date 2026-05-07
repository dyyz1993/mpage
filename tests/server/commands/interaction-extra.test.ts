import { describe, it, expect, vi } from 'vitest';
import { interactionCommands } from '../../../src/server/commands/interaction.js';
import type { Page, Locator } from 'playwright-core';

function createMockPage(overrides: Record<string, unknown> = {}): Page {
  const mockFirstLocator: Locator = {
    textContent: vi.fn(() => Promise.resolve('text content')),
    innerHTML: vi.fn(() => Promise.resolve('<span>inner</span>')),
    evaluate: vi.fn((fn: (el: unknown) => unknown) =>
      Promise.resolve(fn({ outerHTML: '<div>outer</div>' }))
    ),
    inputValue: vi.fn(() => Promise.resolve('input-val')),
    isChecked: vi.fn(() => Promise.resolve(true)),
    isDisabled: vi.fn(() => Promise.resolve(false)),
    getAttribute: vi.fn(() => Promise.resolve('attr-val')),
  } as unknown as Locator;

  const mockLocator: Locator = {
    scrollIntoViewIfNeeded: vi.fn(() => Promise.resolve()),
    first: vi.fn(() => mockFirstLocator),
  } as unknown as Locator;

  return {
    click: vi.fn(() => Promise.resolve()),
    dblclick: vi.fn(() => Promise.resolve()),
    fill: vi.fn(() => Promise.resolve()),
    type: vi.fn(() => Promise.resolve()),
    press: vi.fn(() => Promise.resolve()),
    hover: vi.fn(() => Promise.resolve()),
    evaluate: vi.fn((fn: unknown, ...args: unknown[]) => {
      if (typeof fn === 'function') return Promise.resolve(fn(...args));
      return Promise.resolve(undefined);
    }),
    locator: vi.fn(() => mockLocator),
    selectOption: vi.fn(() => Promise.resolve([])),
    check: vi.fn(() => Promise.resolve()),
    uncheck: vi.fn(() => Promise.resolve()),
    waitForSelector: vi.fn(() => Promise.resolve({})),
    waitForTimeout: vi.fn(() => Promise.resolve()),
    waitForLoadState: vi.fn(() => Promise.resolve()),
    viewportSize: vi.fn(() => ({ width: 1280, height: 720 })),
    setViewportSize: vi.fn(() => Promise.resolve()),
    context: vi.fn(() => ({
      cookies: vi.fn(() => Promise.resolve([{ name: 'foo', value: 'bar' }])),
      addCookies: vi.fn(() => Promise.resolve()),
      clearCookies: vi.fn(() => Promise.resolve()),
    })),
    mouse: {
      move: vi.fn(() => Promise.resolve()),
      down: vi.fn(() => Promise.resolve()),
      up: vi.fn(() => Promise.resolve()),
      click: vi.fn(() => Promise.resolve()),
      dblclick: vi.fn(() => Promise.resolve()),
    },
    ...overrides,
  } as unknown as Page;
}

describe('interactionCommands - dblclick', () => {
  it('should dblclick element by selector', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.dblclick(mockPage, { selector: '#btn' });
    expect(result).toStrictEqual({ selector: '#btn' });
    expect((mockPage.dblclick as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should pass timeout option', async () => {
    const mockPage = createMockPage();
    await interactionCommands.dblclick(mockPage, { selector: '#btn', timeout: 5000 });
    const calls = (mockPage.dblclick as ReturnType<typeof vi.fn>).mock.calls;
    expect((calls[0][1] as Record<string, unknown>).timeout).toBe(5000);
  });

  it('should pass button and force options', async () => {
    const mockPage = createMockPage();
    await interactionCommands.dblclick(mockPage, {
      selector: '#btn',
      button: 'right',
      force: true,
    });
    const opts = (mockPage.dblclick as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(opts.button).toBe('right');
    expect(opts.force).toBe(true);
  });

  it('should wait for selector before dblclick', async () => {
    const mockPage = createMockPage();
    await interactionCommands.dblclick(mockPage, { selector: '#el' });
    expect((mockPage.waitForSelector as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('#el');
  });
});

describe('interactionCommands - fill', () => {
  function createFillMockPage(overrides: Record<string, unknown> = {}): Page {
    const ctx = {
      addCookies: vi.fn(() => Promise.resolve()),
      clearCookies: vi.fn(() => Promise.resolve()),
      cookies: vi.fn(() => Promise.resolve([])),
    };
    return {
      click: vi.fn(() => Promise.resolve()),
      dblclick: vi.fn(() => Promise.resolve()),
      fill: vi.fn(() => Promise.resolve()),
      type: vi.fn(() => Promise.resolve()),
      press: vi.fn(() => Promise.resolve()),
      hover: vi.fn(() => Promise.resolve()),
      evaluate: vi.fn(() => Promise.resolve(undefined)),
      locator: vi.fn(() => ({
        scrollIntoViewIfNeeded: vi.fn(() => Promise.resolve()),
        first: vi.fn(() => ({
          textContent: vi.fn(() => Promise.resolve('')),
          innerHTML: vi.fn(() => Promise.resolve('')),
          evaluate: vi.fn(() => Promise.resolve('')),
          inputValue: vi.fn(() => Promise.resolve('')),
          isChecked: vi.fn(() => Promise.resolve(false)),
          isDisabled: vi.fn(() => Promise.resolve(false)),
          getAttribute: vi.fn(() => Promise.resolve(null)),
        })),
      })),
      waitForSelector: vi.fn(() => Promise.resolve({})),
      viewportSize: vi.fn(() => ({ width: 1280, height: 720 })),
      context: vi.fn(() => ctx),
      ...overrides,
    } as unknown as Page;
  }

  it('should fill and dispatch events', async () => {
    const mockPage = createFillMockPage();
    const result = await interactionCommands.fill(mockPage, { selector: '#input', value: 'hello' });
    expect(result).toStrictEqual({ selector: '#input', value: 'hello' });
    expect((mockPage.evaluate as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should clear before fill by default', async () => {
    const mockPage = createFillMockPage();
    await interactionCommands.fill(mockPage, { selector: '#input', value: 'test' });
    const fillCalls = (mockPage.fill as ReturnType<typeof vi.fn>).mock.calls;
    expect(fillCalls[0][1]).toBe('');
    expect(fillCalls[1][1]).toBe('test');
  });

  it('should skip clear when clear is false', async () => {
    const mockPage = createFillMockPage();
    await interactionCommands.fill(mockPage, { selector: '#input', value: 'test', clear: false });
    const fillCalls = (mockPage.fill as ReturnType<typeof vi.fn>).mock.calls;
    expect(fillCalls.length).toBe(1);
    expect(fillCalls[0][1]).toBe('test');
  });

  it('should pass force option', async () => {
    const mockPage = createFillMockPage();
    await interactionCommands.fill(mockPage, {
      selector: '#input',
      value: 'x',
      clear: false,
      force: true,
    });
    const opts = (mockPage.fill as ReturnType<typeof vi.fn>).mock.calls[0][2] as Record<
      string,
      unknown
    >;
    expect(opts.force).toBe(true);
  });
});

describe('interactionCommands - type', () => {
  it('should type text into element', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.type(mockPage, { selector: '#input', text: 'abc' });
    expect(result).toStrictEqual({ selector: '#input', text: 'abc' });
    expect((mockPage.type as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should clear before type when clear is true', async () => {
    const mockPage = createMockPage();
    await interactionCommands.type(mockPage, { selector: '#input', text: 'hi', clear: true });
    expect((mockPage.fill as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should pass delay option', async () => {
    const mockPage = createMockPage();
    await interactionCommands.type(mockPage, { selector: '#input', text: 'a', delay: 50 });
    const opts = (mockPage.type as ReturnType<typeof vi.fn>).mock.calls[0][2] as Record<
      string,
      unknown
    >;
    expect(opts.delay).toBe(50);
  });
});

describe('interactionCommands - press', () => {
  it('should press key on default body selector', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.press(mockPage, { key: 'Enter' });
    expect(result).toStrictEqual({ key: 'Enter', selector: 'body' });
    const calls = (mockPage.press as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe('body');
    expect(calls[0][1]).toBe('Enter');
  });

  it('should press key on specified selector', async () => {
    const mockPage = createMockPage();
    await interactionCommands.press(mockPage, { key: 'Tab', selector: '#input' });
    const calls = (mockPage.press as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe('#input');
  });

  it('should pass delay option', async () => {
    const mockPage = createMockPage();
    await interactionCommands.press(mockPage, { key: 'a', delay: 100 });
    const opts = (mockPage.press as ReturnType<typeof vi.fn>).mock.calls[0][2] as Record<
      string,
      unknown
    >;
    expect(opts.delay).toBe(100);
  });
});

describe('interactionCommands - hover', () => {
  it('should hover over element', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.hover(mockPage, { selector: '#menu' });
    expect(result).toStrictEqual({ selector: '#menu' });
  });

  it('should pass modifiers option', async () => {
    const mockPage = createMockPage();
    await interactionCommands.hover(mockPage, { selector: '#el', modifiers: ['Shift'] });
    const opts = (mockPage.hover as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(opts.modifiers).toStrictEqual(['Shift']);
  });
});

describe('interactionCommands - scroll', () => {
  it('should scroll to coordinates', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.scroll(mockPage, { x: 100, y: 200 });
    expect(result).toStrictEqual({ x: 100, y: 200 });
  });

  it('should default to 0,0 when no coordinates', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.scroll(mockPage, {});
    expect(result).toStrictEqual({ x: 0, y: 0 });
  });

  it('should scroll element into view when selector provided', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.scroll(mockPage, { selector: '#footer' });
    expect(result).toStrictEqual({ scrolledTo: '#footer' });
    const loc = mockPage.locator('#footer') as Locator;
    expect(loc.scrollIntoViewIfNeeded).toHaveBeenCalled();
  });
});

describe('interactionCommands - mouse', () => {
  it('should move mouse', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.mouse(mockPage, { action: 'move', x: 10, y: 20 });
    expect(result).toStrictEqual({ action: 'move', x: 10, y: 20 });
    expect((mockPage.mouse.move as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should mouse down', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.mouse(mockPage, { action: 'down', button: 'right' });
    expect(result.action).toBe('down');
    expect((mockPage.mouse.down as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should mouse up', async () => {
    const mockPage = createMockPage();
    await interactionCommands.mouse(mockPage, { action: 'up' });
    expect((mockPage.mouse.up as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should mouse click', async () => {
    const mockPage = createMockPage();
    await interactionCommands.mouse(mockPage, { action: 'click', x: 50, y: 60 });
    expect((mockPage.mouse.click as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should mouse dblclick', async () => {
    const mockPage = createMockPage();
    await interactionCommands.mouse(mockPage, { action: 'dblclick', x: 0, y: 0 });
    expect((mockPage.mouse.dblclick as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should default x/y to 0 and button to left', async () => {
    const mockPage = createMockPage();
    await interactionCommands.mouse(mockPage, { action: 'click' });
    const calls = (mockPage.mouse.click as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe(0);
    expect(calls[0][1]).toBe(0);
  });
});

describe('interactionCommands - getProperty', () => {
  it('should get text property', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.getProperty(mockPage, {
      selector: '#el',
      property: 'text',
    });
    expect(result.property).toBe('text');
    expect(result.value).toBe('text content');
  });

  it('should get innerHTML property', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.getProperty(mockPage, { property: 'innerHTML' });
    expect(result.value).toBe('<span>inner</span>');
  });

  it('should get value property', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.getProperty(mockPage, { property: 'value' });
    expect(result.value).toBe('input-val');
  });

  it('should get checked property', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.getProperty(mockPage, { property: 'checked' });
    expect(result.value).toBe(true);
  });

  it('should get disabled property', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.getProperty(mockPage, { property: 'disabled' });
    expect(result.value).toBe(false);
  });

  it('should get arbitrary attribute as default', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.getProperty(mockPage, { property: 'data-id' });
    expect(result.value).toBe('attr-val');
  });

  it('should default selector to body', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.getProperty(mockPage, { property: 'text' });
    expect(result.selector).toBe('body');
  });
});

describe('interactionCommands - setViewport', () => {
  it('should set viewport size', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.setViewport(mockPage, { width: 1920, height: 1080 });
    expect(result).toStrictEqual({ width: 1920, height: 1080 });
    expect((mockPage.setViewportSize as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should use current viewport as fallback', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.setViewport(mockPage, {});
    expect(result).toStrictEqual({ width: 1280, height: 720 });
  });

  it('should override only width', async () => {
    const mockPage = createMockPage();
    const result = await interactionCommands.setViewport(mockPage, { width: 800 });
    expect(result).toStrictEqual({ width: 800, height: 720 });
  });
});

describe('interactionCommands - cookies', () => {
  function createCookieMockPage() {
    const mockBrowserCtx = {
      cookies: vi.fn(() => Promise.resolve([{ name: 'foo', value: 'bar' }])),
      addCookies: vi.fn(() => Promise.resolve()),
      clearCookies: vi.fn(() => Promise.resolve()),
    };
    const mockPage = {
      evaluate: vi.fn(() => Promise.resolve(undefined)),
      context: vi.fn(() => mockBrowserCtx),
    } as unknown as Page;
    return { mockPage, mockBrowserCtx };
  }

  it('should get cookies', async () => {
    const { mockPage } = createCookieMockPage();
    const result = await interactionCommands.getCookies(mockPage, {});
    expect(result.cookies).toStrictEqual([{ name: 'foo', value: 'bar' }]);
  });

  it('should set cookie with required fields', async () => {
    const { mockPage, mockBrowserCtx } = createCookieMockPage();
    const result = await interactionCommands.setCookie(mockPage, { name: 'token', value: 'abc' });
    expect(result).toStrictEqual({ name: 'token' });
    expect(mockBrowserCtx.addCookies.mock.calls[0][0][0].name).toBe('token');
    expect(mockBrowserCtx.addCookies.mock.calls[0][0][0].path).toBe('/');
  });

  it('should set cookie with all optional fields', async () => {
    const { mockPage, mockBrowserCtx } = createCookieMockPage();
    await interactionCommands.setCookie(mockPage, {
      name: 's',
      value: 'v',
      path: '/app',
      domain: '.example.com',
      expires: 9999,
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
    });
    const cookie = mockBrowserCtx.addCookies.mock.calls[0][0][0];
    expect(cookie.domain).toBe('.example.com');
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.secure).toBe(true);
    expect(cookie.sameSite).toBe('Strict');
  });

  it('should clear cookies', async () => {
    const { mockPage } = createCookieMockPage();
    const result = await interactionCommands.clearCookies(mockPage, {});
    expect(result).toStrictEqual({ cleared: true });
  });
});

describe('interactionCommands - localStorage', () => {
  it('should get localStorage', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() => Promise.resolve({ key1: 'val1' }));
    const result = await interactionCommands.getLocalStorage(mockPage, {});
    expect(result.data).toStrictEqual({ key1: 'val1' });
  });

  it('should set localStorage item', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() => Promise.resolve());
    const result = await interactionCommands.setLocalStorage(mockPage, {
      key: 'token',
      value: '123',
    });
    expect(result).toStrictEqual({ key: 'token' });
    const evalCalls = (mockPage.evaluate as ReturnType<typeof vi.fn>).mock.calls;
    expect(evalCalls[0][1]).toStrictEqual({ key: 'token', value: '123' });
  });

  it('should clear localStorage', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() => Promise.resolve());
    const result = await interactionCommands.clearLocalStorage(mockPage, {});
    expect(result).toStrictEqual({ cleared: true });
  });
});
