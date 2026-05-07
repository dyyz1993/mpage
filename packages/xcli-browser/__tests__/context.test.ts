import { describe, it, expect, vi } from 'vitest';
import { checkBrowserScope, executeCommand } from '../src/context.js';
import type { BrowserCommandContext } from '../src/context.js';

vi.mock('@dyyz1993/xpage', () => ({
  executePageCommand: vi.fn().mockResolvedValue({ ok: true }),
}));

function makeCtx(overrides: Partial<BrowserCommandContext> = {}): BrowserCommandContext {
  return {
    page: overrides.page ?? ({} as BrowserCommandContext['page']),
    browser: overrides.browser ?? ({} as BrowserCommandContext['browser']),
    browserContext: overrides.browserContext ?? ({} as BrowserCommandContext['browserContext']),
    command: 'test',
    args: {},
    ...overrides,
  } as BrowserCommandContext;
}

describe('checkBrowserScope', () => {
  it('should return null for project scope', () => {
    expect(checkBrowserScope('project', makeCtx())).toBeNull();
  });

  it('should return null for project scope even without page', () => {
    expect(
      checkBrowserScope(
        'project',
        makeCtx({ page: undefined as unknown as BrowserCommandContext['page'] })
      )
    ).toBeNull();
  });

  it('should return null for browser scope when page exists', () => {
    expect(checkBrowserScope('browser', makeCtx())).toBeNull();
  });

  it('should return error for browser scope when page is missing', () => {
    const result = checkBrowserScope(
      'browser',
      makeCtx({ page: undefined as unknown as BrowserCommandContext['page'] })
    );
    expect(result).toContain('浏览器');
  });

  it('should return null for page scope when page exists', () => {
    expect(checkBrowserScope('page', makeCtx())).toBeNull();
  });

  it('should return error for page scope when page is missing', () => {
    const result = checkBrowserScope(
      'page',
      makeCtx({ page: undefined as unknown as BrowserCommandContext['page'] })
    );
    expect(result).toContain('页面');
  });

  it('should return null for element scope when page exists', () => {
    expect(checkBrowserScope('element', makeCtx())).toBeNull();
  });

  it('should return error for element scope when page is missing', () => {
    const result = checkBrowserScope(
      'element',
      makeCtx({ page: undefined as unknown as BrowserCommandContext['page'] })
    );
    expect(result).toBeTruthy();
  });

  it('should return null for unknown scope', () => {
    expect(checkBrowserScope('unknown' as 'project', makeCtx())).toBeNull();
  });
});

describe('executeCommand', () => {
  it('should delegate to executePageCommand', async () => {
    const mockPage = {} as BrowserCommandContext['page'];
    const result = await executeCommand(mockPage, 'goto', { url: 'https://example.com' });
    expect(result).toEqual({ ok: true });
  });
});
