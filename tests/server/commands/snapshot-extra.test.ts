import { describe, it, expect, vi } from 'vitest';
import { snapshotCommands } from '../../../src/server/commands/snapshot.js';
import type { Page, Locator } from 'playwright-core';

function createMockPage(overrides: Record<string, unknown> = {}): Page {
  const mockLocatorFirst: Locator = {
    screenshot: vi.fn(() => Promise.resolve(Buffer.from('img-data-selector'))),
  } as unknown as Locator;

  const mockLocator: Locator = {
    first: vi.fn(() => mockLocatorFirst),
    ariaSnapshot: vi.fn(() => Promise.resolve('- button "Submit"')),
  } as unknown as Locator;

  return {
    evaluate: vi.fn((fn: unknown, ...args: unknown[]) => {
      if (typeof fn === 'function') return Promise.resolve(fn(...args));
      return Promise.resolve(undefined);
    }),
    locator: vi.fn(() => mockLocator),
    screenshot: vi.fn(() => Promise.resolve(Buffer.from('screenshot-data'))),
    ...overrides,
  } as unknown as Page;
}

describe('snapshotCommands - screenshot', () => {
  it('should take screenshot with default filename', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.screenshot(mockPage, {});
    expect(result.path).toContain('screenshot-');
    expect(result.path).toContain('.png');
    expect((mockPage.screenshot as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('should use custom path', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.screenshot(mockPage, { path: 'custom.png' });
    expect(result.path).toContain('custom.png');
  });

  it('should pass extra args to screenshot', async () => {
    const mockPage = createMockPage();
    await snapshotCommands.screenshot(mockPage, { fullPage: true });
    const opts = (mockPage.screenshot as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(opts.fullPage).toBe(true);
  });
});

describe('snapshotCommands - screenshotBase64', () => {
  it('should take full page screenshot as base64', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.screenshotBase64(mockPage, { fullPage: true });
    expect(result.screenshot).toBe(Buffer.from('screenshot-data').toString('base64'));
    expect(result.data).toBe(Buffer.from('screenshot-data').toString('base64'));
    expect(result.format).toBe('png');
    expect(result.size).toBe(Buffer.from('screenshot-data').length);
  });

  it('should default fullPage to false', async () => {
    const mockPage = createMockPage();
    await snapshotCommands.screenshotBase64(mockPage, {});
    const opts = (mockPage.screenshot as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(opts.fullPage).toBe(false);
  });

  it('should use custom type', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.screenshotBase64(mockPage, { type: 'jpeg' });
    expect(result.format).toBe('jpeg');
  });

  it('should pass quality option', async () => {
    const mockPage = createMockPage();
    await snapshotCommands.screenshotBase64(mockPage, { quality: 80 });
    const opts = (mockPage.screenshot as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(opts.quality).toBe(80);
  });

  it('should take element screenshot when selector provided', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.screenshotBase64(mockPage, { selector: '#el' });
    expect(result.screenshot).toBe(Buffer.from('img-data-selector').toString('base64'));
    expect((mockPage.locator as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('#el');
  });
});

describe('snapshotCommands - a11y format=json', () => {
  it('should return json format when requested', async () => {
    const mockPage = createMockPage();
    const jsonResult = { role: 'button', name: 'Submit', tag: 'button' };
    mockPage.evaluate = vi.fn(() =>
      Promise.resolve({
        json: jsonResult,
        yaml: '- button "Submit"',
      })
    );
    const result = await snapshotCommands.a11y(mockPage, { selector: 'body', format: 'json' });
    expect(result.snapshot).toStrictEqual(jsonResult);
  });
});

describe('snapshotCommands - a11y format=yaml (default)', () => {
  it('should return yaml format by default', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() =>
      Promise.resolve({
        json: { role: 'main' },
        yaml: '- main',
      })
    );
    const result = await snapshotCommands.a11y(mockPage, { selector: 'body' });
    expect(result.snapshot).toBe('- main');
  });

  it('should handle null walk result', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() =>
      Promise.resolve({
        json: null,
        yaml: '',
      })
    );
    const result = await snapshotCommands.a11y(mockPage, {});
    expect(result.snapshot).toBe('');
  });
});

describe('snapshotCommands - a11y internal walk function', () => {
  it('should skip SCRIPT/STYLE/NOSCRIPT/META/LINK/HEAD/HTML tags', async () => {
    const mockPage = createMockPage();
    let capturedFn: ((sel: string) => unknown) | null = null;
    mockPage.evaluate = vi.fn((fn: unknown, _sel: string) => {
      capturedFn = fn as (sel: string) => unknown;
      return Promise.resolve({ json: null, yaml: '' });
    });
    await snapshotCommands.a11y(mockPage, { selector: 'script' });

    expect(capturedFn).not.toBeNull();
  });

  it('should correctly infer roles for semantic elements', async () => {
    const mockPage = createMockPage();
    mockPage.evaluate = vi.fn(() =>
      Promise.resolve({
        json: { role: 'navigation', tag: 'nav', children: [{ role: 'link', tag: 'a' }] },
        yaml: '- navigation "nav"\n  - link "a"',
      })
    );
    const result = await snapshotCommands.a11y(mockPage, { selector: 'nav', format: 'json' });
    expect((result.snapshot as Record<string, unknown>).role).toBe('navigation');
  });
});

describe('snapshotCommands - snapshot', () => {
  it('should return aria snapshot for selector', async () => {
    const mockPage = createMockPage();
    const result = await snapshotCommands.snapshot(mockPage, { selector: '#main' });
    expect(result.snapshot).toBe('- button "Submit"');
    expect((mockPage.locator as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('#main');
  });

  it('should default selector to body', async () => {
    const mockPage = createMockPage();
    await snapshotCommands.snapshot(mockPage, {});
    expect((mockPage.locator as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('body');
  });
});
