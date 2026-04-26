/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable require-await */
import { describe, it, expect } from 'vitest';
import {
  SiteInstanceImpl,
  DEFAULT_SCOPE,
  COMMAND_SCOPE_ORDER,
} from '../../src/protocol/plugin-protocol';
import type { CommandContext, StorageContext } from '../../src/protocol/plugin-protocol';
import { z } from 'zod';

function createMockStorage(): StorageContext {
  const store: Record<string, unknown> = {};
  return {
    async get<T>(key: string): Promise<T | null> {
      return (store[key] as T) ?? null;
    },
    async set<T>(key: string, value: T): Promise<void> {
      store[key] = value;
    },
    async delete(key: string): Promise<void> {
      delete store[key];
    },
    async clear(): Promise<void> {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    async keys(): Promise<string[]> {
      return Object.keys(store);
    },
  };
}

function createMockContext(overrides?: Partial<CommandContext>): CommandContext {
  return {
    args: [],
    options: {},
    cwd: '/tmp',
    page: null,
    storage: createMockStorage(),
    output: { mode: 'text', showTips: false, color: false, emoji: false },
    error: () => {},
    config: {},
    site: null as unknown as CommandContext['site'],
    browser: { executablePath: '' },
    ...overrides,
  };
}

describe('Scope Validation', () => {
  it('project scope always passes registration', () => {
    const storage = createMockStorage();
    const site = new SiteInstanceImpl({ name: 'test-site', url: 'https://example.com' }, storage);

    site.command('my-cmd', {
      description: 'A project-scoped command',
      scope: 'project',
      parameters: z.object({}),
      handler: async () => ({ ok: true }),
    });

    const cmd = site.getCommand('my-cmd');
    expect(cmd).not.toBeNull();
    expect(cmd!.scope).toBe('project');
  });

  it('page scope is the default when not specified', () => {
    const storage = createMockStorage();
    const site = new SiteInstanceImpl(
      { name: 'default-scope-site', url: 'https://example.com' },
      storage
    );

    site.command('no-scope-cmd', {
      description: 'Command without explicit scope',
      parameters: z.object({}),
      handler: async () => ({ ok: true }),
    });

    const cmd = site.getCommand('no-scope-cmd');
    expect(cmd).not.toBeNull();
    expect(cmd!.scope).toBe(DEFAULT_SCOPE);
    expect(cmd!.scope).toBe('page');
  });

  it('element scope can be registered', () => {
    const storage = createMockStorage();
    const site = new SiteInstanceImpl({ name: 'elem-site', url: 'https://example.com' }, storage);

    site.command('click-elem', {
      description: 'Click an element',
      scope: 'element',
      parameters: z.object({ selector: z.string() }),
      handler: async () => ({ ok: true }),
    });

    const cmd = site.getCommand('click-elem');
    expect(cmd).not.toBeNull();
    expect(cmd!.scope).toBe('element');
  });

  it('browser scope can be registered', () => {
    const storage = createMockStorage();
    const site = new SiteInstanceImpl(
      { name: 'browser-site', url: 'https://example.com' },
      storage
    );

    site.command('new-tab', {
      description: 'Open a new tab',
      scope: 'browser',
      parameters: z.object({}),
      handler: async () => ({ ok: true }),
    });

    const cmd = site.getCommand('new-tab');
    expect(cmd).not.toBeNull();
    expect(cmd!.scope).toBe('browser');
  });

  it('page scope command handler receives null page in context', async () => {
    const storage = createMockStorage();
    const site = new SiteInstanceImpl(
      { name: 'page-check-site', url: 'https://example.com' },
      storage
    );

    let capturedPage: unknown = 'not-set';

    site.command('check-page', {
      description: 'Check page availability',
      scope: 'page',
      parameters: z.object({}),
      handler: async (_params, ctx) => {
        capturedPage = ctx.page;
        return { hasPage: ctx.page !== null };
      },
    });

    const cmd = site.getCommand('check-page');
    const ctx = createMockContext({ page: null, site });
    const result = (await cmd!.handler({}, ctx)) as Record<string, unknown>;

    expect(capturedPage).toBeNull();
    expect(result.hasPage).toBe(false);
  });

  it('project scope command works without page', async () => {
    const storage = createMockStorage();
    const site = new SiteInstanceImpl(
      { name: 'project-site', url: 'https://example.com' },
      storage
    );

    site.command('list-plugins', {
      description: 'List plugins',
      scope: 'project',
      parameters: z.object({}),
      handler: async () => ({ plugins: [] }),
    });

    const cmd = site.getCommand('list-plugins');
    const ctx = createMockContext({ page: null, site });
    const result = (await cmd!.handler({}, ctx)) as Record<string, unknown>;

    expect(result.plugins).toEqual([]);
  });

  it('scope order is correct: project < browser < page < element', () => {
    expect(COMMAND_SCOPE_ORDER.project).toBeLessThan(COMMAND_SCOPE_ORDER.browser);
    expect(COMMAND_SCOPE_ORDER.browser).toBeLessThan(COMMAND_SCOPE_ORDER.page);
    expect(COMMAND_SCOPE_ORDER.page).toBeLessThan(COMMAND_SCOPE_ORDER.element);
  });

  it('getAllCommands returns all scopes correctly', () => {
    const storage = createMockStorage();
    const site = new SiteInstanceImpl(
      { name: 'multi-scope-site', url: 'https://example.com' },
      storage
    );

    site.command('proj-cmd', {
      description: 'project',
      scope: 'project',
      parameters: z.object({}),
      handler: async () => ({}),
    });
    site.command('browse-cmd', {
      description: 'browser',
      scope: 'browser',
      parameters: z.object({}),
      handler: async () => ({}),
    });
    site.command('page-cmd', {
      description: 'page',
      scope: 'page',
      parameters: z.object({}),
      handler: async () => ({}),
    });
    site.command('elem-cmd', {
      description: 'element',
      scope: 'element',
      parameters: z.object({}),
      handler: async () => ({}),
    });

    const cmds = site.getAllCommands();
    expect(cmds).toHaveLength(4);

    const scopes = cmds.map((c) => c.scope);
    expect(scopes).toContain('project');
    expect(scopes).toContain('browser');
    expect(scopes).toContain('page');
    expect(scopes).toContain('element');
  });
});
