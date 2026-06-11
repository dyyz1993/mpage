import { describe, it, expect } from 'vitest';
import { z } from 'zod/v4';
import {
  validateArgs,
  buildInputSchema,
  SiteInstanceImpl,
  CommandError,
} from '../../src/protocol/plugin-protocol.js';
import type {
  CommandContext,
  StorageContext,
  SiteInstance,
} from '../../src/protocol/plugin-protocol.js';

function mockStorage(): StorageContext {
  const store = new Map<string, unknown>();
  return {
    get: async <T>(key: string) => (store.get(key) as T) ?? null,
    set: async <T>(key: string, value: T) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    clear: async () => {
      store.clear();
    },
    keys: async () => Array.from(store.keys()),
  };
}

function mockCtx(overrides?: Partial<CommandContext>): CommandContext {
  return {
    args: [],
    options: {},
    cwd: '/tmp',
    storage: mockStorage(),
    output: { mode: 'text' as const, showTips: false, color: false, emoji: false },
    error: () => {},
    config: {},
    site: {} as SiteInstance,
    cliName: 'test',
    ...overrides,
  };
}

describe('validateArgs', () => {
  it('should pass when args match zod schema', () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const result = validateArgs({ parameters: schema }, { name: 'alice', age: 30 });
    expect(result).toEqual({ name: 'alice', age: 30 });
  });

  it('should throw when required param is missing', () => {
    const schema = z.object({ name: z.string() });
    expect(() => validateArgs({ parameters: schema }, {})).toThrow(CommandError);
  });

  it('should throw on type mismatch', () => {
    const schema = z.object({ count: z.number() });
    expect(() => validateArgs({ parameters: schema }, { count: 'not-a-number' })).toThrow(
      CommandError
    );
  });

  it('should strip extra fields by default', () => {
    const schema = z.object({ name: z.string() });
    const result = validateArgs({ parameters: schema }, { name: 'a', extra: true });
    expect(result).toEqual({ name: 'a' });
  });

  it('should not throw when optional param is missing', () => {
    const schema = z.object({ name: z.string(), nick: z.string().optional() });
    const result = validateArgs({ parameters: schema }, { name: 'a' });
    expect(result).toEqual({ name: 'a', nick: undefined });
  });

  it('should apply default values', () => {
    const schema = z.object({ page: z.number().default(1) });
    const result = validateArgs({ parameters: schema }, {});
    expect(result).toEqual({ page: 1 });
  });

  it('should throw with path info in error message', () => {
    const schema = z.object({ items: z.array(z.string()) });
    try {
      validateArgs({ parameters: schema }, { items: 'not-array' });
    } catch (e) {
      expect(e).toBeInstanceOf(CommandError);
      expect((e as CommandError).code).toBe('INVALID_ARGS');
      expect((e as CommandError).message).toContain('items');
    }
  });
});

describe('buildInputSchema', () => {
  it('should return parameters schema if provided', () => {
    const schema = z.object({ x: z.number() });
    const result = buildInputSchema({ parameters: schema });
    expect(result).toBe(schema);
  });

  it('should return empty object schema when no parameters or options', () => {
    const result = buildInputSchema({});
    const parsed = result.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it('should build schema from options array', () => {
    const result = buildInputSchema({
      options: [
        { name: 'url', type: 'string' as const, description: 'target url', required: true },
        { name: 'retry', type: 'number' as const, description: 'retry count', default: 3 },
        { name: 'verbose', type: 'boolean' as const, description: 'verbose output' },
      ],
    });
    const parsed = result.safeParse({ url: 'http://x.com', retry: 5, verbose: true });
    expect(parsed.success).toBe(true);
  });

  it('should make non-required options optional', () => {
    const result = buildInputSchema({
      options: [{ name: 'tag', type: 'string' as const, description: 'tag', required: false }],
    });
    const parsed = result.safeParse({});
    expect(parsed.success).toBe(true);
  });
});

describe('SiteInstanceImpl', () => {
  it('should store name, url and config from constructor', () => {
    const site = new SiteInstanceImpl({ name: 'demo', url: 'https://demo.com' }, mockStorage());
    expect(site.name).toBe('demo');
    expect(site.url).toBe('https://demo.com');
    expect(site.config.name).toBe('demo');
  });

  it('should default url to empty string when not provided', () => {
    const site = new SiteInstanceImpl({ name: 'x' }, mockStorage());
    expect(site.url).toBe('');
  });

  describe('command()', () => {
    it('should register a command and return site for chaining', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      const result = site.command('scrape', {
        description: 'scrape data',
        parameters: z.object({ url: z.string() }),
        handler: async () => ({}),
      });
      expect(result).toBe(site);
      const cmd = site.getCommand('scrape');
      expect(cmd).not.toBeNull();
      expect(cmd!.name).toBe('scrape');
      expect(cmd!.description).toBe('scrape data');
      expect(cmd!.scope).toBe('page');
      expect(cmd!.override).toBe(true);
    });

    it('should set requiresLogin from config', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      site.command('login-check', {
        description: 'needs login',
        requiresLogin: true,
        parameters: z.object({}),
        handler: async () => ({}),
      });
      expect(site.getCommand('login-check')!.requiresLogin).toBe(true);
    });

    it('should default requiresLogin to false', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      site.command('x', {
        description: 'desc',
        parameters: z.object({}),
        handler: async () => ({}),
      });
      expect(site.getCommand('x')!.requiresLogin).toBe(false);
    });

    it('should save previousHandler when overriding', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      const handler1 = async () => ({ data: 1 });
      const handler2 = async () => ({ data: 2 });

      site.command('cmd', {
        description: 'v1',
        parameters: z.object({}),
        handler: handler1,
      });
      site.command('cmd', {
        description: 'v2',
        parameters: z.object({}),
        handler: handler2,
      });

      const cmd = site.getCommand('cmd');
      expect(cmd!.handler).toBe(handler2);
      expect(cmd!.previousHandler).toBe(handler1);
    });

    it('should silently ignore when existing command has override:false', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      const handler1 = async () => ({ v: 1 });
      const handler2 = async () => ({ v: 2 });

      site.command('cmd', {
        description: 'original',
        parameters: z.object({}),
        override: false,
        handler: handler1,
      });
      site.command('cmd', {
        description: 'attempt',
        parameters: z.object({}),
        handler: handler2,
      });

      const cmd = site.getCommand('cmd');
      expect(cmd!.description).toBe('original');
      expect(cmd!.handler).toBe(handler1);
    });

    it('should use custom scope when provided', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      site.command('x', {
        description: 'desc',
        scope: 'browser',
        parameters: z.object({}),
        handler: async () => ({}),
      });
      expect(site.getCommand('x')!.scope).toBe('browser');
    });
  });

  describe('getCommand()', () => {
    it('should return null for non-existent command', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      expect(site.getCommand('nope')).toBeNull();
    });
  });

  describe('getOriginalHandler()', () => {
    it('should return undefined when no previous handler', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      site.command('x', {
        description: 'desc',
        parameters: z.object({}),
        handler: async () => ({}),
      });
      expect(site.getOriginalHandler('x')).toBeUndefined();
    });

    it('should return previous handler after override', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      const original = async () => ({ v: 1 });
      site.command('x', {
        description: 'v1',
        parameters: z.object({}),
        handler: original,
      });
      site.command('x', {
        description: 'v2',
        parameters: z.object({}),
        handler: async () => ({ v: 2 }),
      });
      expect(site.getOriginalHandler('x')).toBe(original);
    });

    it('should return undefined for non-existent command', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      expect(site.getOriginalHandler('nope')).toBeUndefined();
    });
  });

  describe('getAllCommands()', () => {
    it('should return all registered commands', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      site.command('a', {
        description: 'cmd a',
        parameters: z.object({}),
        handler: async () => ({}),
      });
      site.command('b', {
        description: 'cmd b',
        scope: 'element',
        parameters: z.object({}),
        handler: async () => ({}),
      });

      const all = site.getAllCommands();
      expect(all).toHaveLength(2);
      expect(all.map((c) => c.name)).toEqual(expect.arrayContaining(['a', 'b']));
      expect(all.find((c) => c.name === 'b')!.scope).toBe('element');
    });

    it('should return empty array when no commands', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      expect(site.getAllCommands()).toEqual([]);
    });
  });

  describe('login/logout', () => {
    it('should register and execute login handler', async () => {
      const site = new SiteInstanceImpl(
        { name: 's', url: 'https://s.com', requiresLogin: true },
        mockStorage()
      );
      let called = false;
      site.login(async () => {
        called = true;
      });
      await site.executeLogin(mockCtx({ site }));
      expect(called).toBe(true);
    });

    it('should throw when executeLogin with no handler', async () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      await expect(site.executeLogin(mockCtx())).rejects.toThrow(CommandError);
    });

    it('should register and execute logout handler', async () => {
      const site = new SiteInstanceImpl({ name: 's', requiresLogin: true }, mockStorage());
      let called = false;
      site.logout(async () => {
        called = true;
      });
      site.login(async () => {});
      await site.executeLogin(mockCtx({ site }));
      await site.executeLogout(mockCtx());
      expect(called).toBe(true);
    });

    it('should throw when executeLogout with no handler', async () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      await expect(site.executeLogout(mockCtx())).rejects.toThrow(CommandError);
    });

    it('isLoggedIn should return true when requiresLogin is false', async () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      expect(await site.isLoggedIn()).toBe(true);
    });

    it('isLoggedIn should use isLogin callback when provided', async () => {
      const site = new SiteInstanceImpl(
        { name: 's', requiresLogin: true, isLogin: async () => true },
        mockStorage()
      );
      expect(await site.isLoggedIn()).toBe(true);
    });

    it('isLoggedIn should check storage for auth_token', async () => {
      const storage = mockStorage();
      const site = new SiteInstanceImpl({ name: 's', requiresLogin: true }, storage);
      expect(await site.isLoggedIn()).toBe(false);
      await storage.set('auth_token', 'tok');
      expect(await site.isLoggedIn()).toBe(true);
    });

    it('requireLogin should throw when not logged in', async () => {
      const site = new SiteInstanceImpl({ name: 's', requiresLogin: true }, mockStorage());
      await expect(site.requireLogin()).rejects.toThrow(CommandError);
      try {
        await site.requireLogin();
      } catch (e) {
        expect((e as CommandError).code).toBe('NOT_LOGGED_IN');
      }
    });

    it('requireLogin should not throw when requiresLogin is false', async () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      await expect(site.requireLogin()).resolves.toBeUndefined();
    });

    it('hasLoginCommand/hasLogoutCommand should reflect handler state', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());
      expect(site.hasLoginCommand()).toBe(false);
      expect(site.hasLogoutCommand()).toBe(false);
      site.login(async () => {});
      site.logout(async () => {});
      expect(site.hasLoginCommand()).toBe(true);
      expect(site.hasLogoutCommand()).toBe(true);
    });
  });

  describe('getStorage()', () => {
    it('should return the storage instance', () => {
      const storage = mockStorage();
      const site = new SiteInstanceImpl({ name: 's' }, storage);
      expect(site.getStorage()).toBe(storage);
    });
  });
});
