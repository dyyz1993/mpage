import { describe, it, expect } from 'vitest';
import { z } from 'zod/v4';
import { SiteInstanceImpl, GroupedSiteInstance } from '../../src/protocol/plugin-protocol.js';
import type { StorageContext } from '../../src/protocol/plugin-protocol.js';

function mockStorage(): StorageContext {
  const data = new Map<string, unknown>();
  return {
    get: async <T>(key: string): Promise<T | null> => (data.get(key) as T) ?? null,
    set: async <T>(key: string, value: T): Promise<void> => {
      data.set(key, value);
    },
    delete: async (key: string): Promise<void> => {
      data.delete(key);
    },
    clear: async (): Promise<void> => {
      data.clear();
    },
    keys: async (): Promise<string[]> => [...data.keys()],
  };
}

describe('site.group()', () => {
  it('should return a SiteInstance', () => {
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, mockStorage());
    const group = site.group('config');
    expect(group).toBeDefined();
    expect(group.name).toBe('test');
  });

  it('should register commands with group prefix', () => {
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, mockStorage());
    const config = site.group('config');

    config.command('get', {
      description: 'Get config',
      parameters: z.object({ key: z.string() }),
      handler: async (params) => ({ success: true as const, data: params }),
    });

    config.command('set', {
      description: 'Set config',
      parameters: z.object({ key: z.string(), value: z.string() }),
      handler: async (params) => ({ success: true as const, data: params }),
    });

    expect(site.getCommand('config.get')).not.toBeNull();
    expect(site.getCommand('config.set')).not.toBeNull();
    expect(site.getCommand('get')).toBeNull();

    const getCmd = site.getCommand('config.get')!;
    expect(getCmd.description).toBe('Get config');
    expect(getCmd.name).toBe('config.get');
  });

  it('should support nested groups', () => {
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, mockStorage());
    const config = site.group('config');
    const advanced = config.group('advanced');

    advanced.command('reset', {
      description: 'Reset advanced config',
      handler: async () => ({ success: true as const, data: null }),
    });

    expect(site.getCommand('config.advanced.reset')).not.toBeNull();
    expect(site.getCommand('advanced.reset')).toBeNull();
    expect(site.getCommand('config.reset')).toBeNull();
  });

  it('should list all commands including grouped ones', () => {
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, mockStorage());

    site.command('list', {
      description: 'List all',
      handler: async () => ({ success: true as const, data: null }),
    });

    const config = site.group('config');
    config.command('get', {
      description: 'Get config',
      handler: async () => ({ success: true as const, data: null }),
    });
    config.command('set', {
      description: 'Set config',
      handler: async () => ({ success: true as const, data: null }),
    });

    const commands = site.getAllCommands();
    expect(commands).toHaveLength(3);
    const names = commands.map((c) => c.name).sort();
    expect(names).toEqual(['config.get', 'config.set', 'list']);
  });

  it('should allow override on grouped commands', () => {
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, mockStorage());
    const config = site.group('config');

    config.command('get', {
      description: 'Get config v1',
      handler: async () => ({ success: true as const, data: 'v1' }),
    });

    config.command('get', {
      description: 'Get config v2',
      override: true,
      handler: async () => ({ success: true as const, data: 'v2' }),
    });

    const cmd = site.getCommand('config.get')!;
    expect(cmd.description).toBe('Get config v2');
    expect(cmd.previousHandler).toBeDefined();
  });

  it('should always override by default (override defaults to true)', () => {
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, mockStorage());
    const config = site.group('config');

    config.command('get', {
      description: 'Original',
      handler: async () => ({ success: true as const, data: 'original' }),
    });

    config.command('get', {
      description: 'Updated',
      handler: async () => ({ success: true as const, data: 'new' }),
    });

    const cmd = site.getCommand('config.get')!;
    expect(cmd.description).toBe('Updated');
    expect(cmd.previousHandler).toBeDefined();
  });

  it('group getCommand resolves relative to group prefix', () => {
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, mockStorage());
    const config = site.group('config');

    config.command('get', {
      description: 'Get config',
      handler: async () => ({ success: true as const, data: null }),
    });

    expect(config.getCommand('get')).not.toBeNull();
    expect(config.getCommand('config.get')).toBeNull();
  });

  it('group getAllCommands returns only group commands', () => {
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, mockStorage());

    site.command('list', {
      description: 'List all',
      handler: async () => ({ success: true as const, data: null }),
    });

    const config = site.group('config');
    config.command('get', {
      description: 'Get config',
      handler: async () => ({ success: true as const, data: null }),
    });
    config.command('set', {
      description: 'Set config',
      handler: async () => ({ success: true as const, data: null }),
    });

    const groupCommands = config.getAllCommands();
    expect(groupCommands).toHaveLength(2);
    const names = groupCommands.map((c) => c.name).sort();
    expect(names).toEqual(['config.get', 'config.set']);
  });

  it('should delegate storage to parent', () => {
    const storage = mockStorage();
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, storage);
    const config = site.group('config');
    expect(config.getStorage()).toBe(storage);
  });

  it('should share login/logout with parent', () => {
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, mockStorage());

    let loginCalled = false;
    let logoutCalled = false;

    site.login(async () => {
      loginCalled = true;
    });
    site.logout(async () => {
      logoutCalled = true;
    });

    const config = site.group('config');

    config.login(async () => {
      loginCalled = true;
    });
    config.logout(async () => {
      logoutCalled = true;
    });

    const ctx = {
      args: [],
      options: {},
      cwd: '',
      storage: mockStorage(),
      output: { mode: 'text' as const, showTips: false, color: false, emoji: false },
      error: () => {},
      config: {},
      site,
      cliName: 'test',
    };

    expect(config.isLoggedIn()).resolves.toBe(true);
  });

  it('should support three-level nesting', () => {
    const site = new SiteInstanceImpl({ name: 'test', url: 'https://example.com' }, mockStorage());
    const l1 = site.group('a');
    const l2 = l1.group('b');
    const l3 = l2.group('c');

    l3.command('run', {
      description: 'Deep command',
      handler: async () => ({ success: true as const, data: null }),
    });

    expect(site.getCommand('a.b.c.run')).not.toBeNull();
    expect(l3.getCommand('run')).not.toBeNull();
    expect(l2.getCommand('c.run')).not.toBeNull();
    expect(l1.getCommand('b.c.run')).not.toBeNull();
  });
});
