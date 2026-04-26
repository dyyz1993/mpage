import { describe, it, expect } from 'vitest';
import { checkScope } from '../../src/commands/execute-site';
import type { CommandContext } from '../../src/protocol/plugin-protocol';
import { vi } from 'vitest';

function makeCtx(page: unknown = null): CommandContext {
  return {
    args: [],
    options: {},
    cwd: '/tmp/test',
    page: page as CommandContext['page'],
    storage: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      keys: vi.fn().mockReturnValue([]),
    },
    output: { mode: 'text', showTips: true, color: false, emoji: false },
    error: vi.fn(),
    config: {},
    site: {} as CommandContext['site'],
    browser: { executablePath: '/usr/bin/chromium' },
  };
}

describe('checkScope', () => {
  describe('project scope', () => {
    it('should return null (always available)', () => {
      const ctx = makeCtx(null);
      expect(checkScope('project', ctx)).toBeNull();
    });

    it('should return null even with no page', () => {
      const ctx = makeCtx(null);
      expect(checkScope('project', ctx)).toBeNull();
    });
  });

  describe('browser scope', () => {
    it('should return error when page is null', () => {
      const ctx = makeCtx(null);
      const error = checkScope('browser', ctx);
      expect(error).not.toBeNull();
      expect(error).toContain('浏览器');
    });

    it('should return null when page exists', () => {
      const ctx = makeCtx({ goto: vi.fn(), url: 'https://example.com' });
      expect(checkScope('browser', ctx)).toBeNull();
    });
  });

  describe('page scope', () => {
    it('should return error when page is null', () => {
      const ctx = makeCtx(null);
      const error = checkScope('page', ctx);
      expect(error).not.toBeNull();
      expect(error).toContain('页面');
      expect(error).toContain('xcli open');
    });

    it('should return null when page exists', () => {
      const ctx = makeCtx({ goto: vi.fn(), url: 'https://example.com' });
      expect(checkScope('page', ctx)).toBeNull();
    });
  });

  describe('element scope', () => {
    it('should return error when page is null', () => {
      const ctx = makeCtx(null);
      const error = checkScope('element', ctx);
      expect(error).not.toBeNull();
      expect(error).toContain('xcli open');
    });

    it('should return null when page exists', () => {
      const ctx = makeCtx({ goto: vi.fn(), url: 'https://example.com' });
      expect(checkScope('element', ctx)).toBeNull();
    });
  });

  describe('error messages', () => {
    it('should include actionable hint in all scope errors', () => {
      const ctx = makeCtx(null);
      const scopes: Array<'browser' | 'page' | 'element'> = ['browser', 'page', 'element'];
      for (const scope of scopes) {
        const error = checkScope(scope, ctx);
        expect(error).toContain('xcli open');
      }
    });
  });
});
