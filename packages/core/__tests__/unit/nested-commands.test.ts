import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginLoader } from '../../src/plugin-loader.js';
import { Core } from '../../src/core.js';
import type { CoreConfig } from '../../src/core.js';
import { z } from 'zod/v4';

function makeCoreHost() {
  return {
    config: { name: 'test-cli', pluginPackageName: '@dyyz1993/xpage' },
    storageDir: '/tmp/test-storage',
    configDir: '/tmp/test-storage',
  };
}

describe('PluginLoader - nested commands', () => {
  let loader: PluginLoader;

  beforeEach(() => {
    loader = new PluginLoader(makeCoreHost());
  });

  it('resolves config.get from [config, get]', async () => {
    const api = loader.getAPI();
    const site = api.createSite({ name: 'test', url: 'https://example.com' });
    site.command('config.get', {
      description: 'Get config value',
      handler: async () => ({ data: null }),
    });

    const result = loader.resolveNestedCommand(['config', 'get']);
    expect(result).not.toBeNull();
    expect(result!.entry.name).toBe('config.get');
    expect(result!.consumedArgs).toBe(2);
  });

  it('resolves config.set from [config, set]', async () => {
    const api = loader.getAPI();
    const site = api.createSite({ name: 'test', url: 'https://example.com' });
    site.command('config.set', {
      description: 'Set config value',
      handler: async () => ({ data: null }),
    });

    const result = loader.resolveNestedCommand(['config', 'set']);
    expect(result).not.toBeNull();
    expect(result!.entry.name).toBe('config.set');
    expect(result!.consumedArgs).toBe(2);
  });

  it('resolves longest match when both config and config.get exist', async () => {
    const api = loader.getAPI();
    const site = api.createSite({ name: 'test', url: 'https://example.com' });
    site.command('config', {
      description: 'Config root',
      handler: async () => ({ data: null }),
    });
    site.command('config.get', {
      description: 'Get config value',
      handler: async () => ({ data: null }),
    });

    const result = loader.resolveNestedCommand(['config', 'get']);
    expect(result).not.toBeNull();
    expect(result!.entry.name).toBe('config.get');
    expect(result!.consumedArgs).toBe(2);
  });

  it('resolves flat command still works', async () => {
    const api = loader.getAPI();
    const site = api.createSite({ name: 'test', url: 'https://example.com' });
    site.command('scrape', {
      description: 'Scrape data',
      handler: async () => ({ data: null }),
    });

    const result = loader.resolveNestedCommand(['scrape']);
    expect(result).not.toBeNull();
    expect(result!.entry.name).toBe('scrape');
    expect(result!.consumedArgs).toBe(1);
  });

  it('resolves flat command with trailing args', async () => {
    const api = loader.getAPI();
    const site = api.createSite({ name: 'test', url: 'https://example.com' });
    site.command('scrape', {
      description: 'Scrape data',
      handler: async () => ({ data: null }),
    });

    const result = loader.resolveNestedCommand(['scrape', '--limit', '10']);
    expect(result).not.toBeNull();
    expect(result!.entry.name).toBe('scrape');
    expect(result!.consumedArgs).toBe(1);
  });

  it('returns null for unknown nested path', async () => {
    const api = loader.getAPI();
    const site = api.createSite({ name: 'test', url: 'https://example.com' });
    site.command('config.get', {
      description: 'Get config value',
      handler: async () => ({ data: null }),
    });

    const result = loader.resolveNestedCommand(['config', 'delete']);
    expect(result).toBeNull();
  });

  it('returns null for empty argv', () => {
    const result = loader.resolveNestedCommand([]);
    expect(result).toBeNull();
  });

  it('resolves multi-level app.module.action from [app, module, action]', async () => {
    const api = loader.getAPI();
    const site = api.createSite({ name: 'test', url: 'https://example.com' });
    site.command('app.module.action', {
      description: 'Deep nested command',
      handler: async () => ({ data: null }),
    });

    const result = loader.resolveNestedCommand(['app', 'module', 'action']);
    expect(result).not.toBeNull();
    expect(result!.entry.name).toBe('app.module.action');
    expect(result!.consumedArgs).toBe(3);
  });

  it('consumedArgs is correct for two-level command with extra args', async () => {
    const api = loader.getAPI();
    const site = api.createSite({ name: 'test', url: 'https://example.com' });
    site.command('config.get', {
      description: 'Get config value',
      handler: async () => ({ data: null }),
    });

    const result = loader.resolveNestedCommand(['config', 'get', '--key', 'db.host']);
    expect(result).not.toBeNull();
    expect(result!.entry.name).toBe('config.get');
    expect(result!.consumedArgs).toBe(2);
  });

  it('returns site associated with matched command', async () => {
    const api = loader.getAPI();
    const site = api.createSite({ name: 'mysite', url: 'https://example.com' });
    site.command('config.get', {
      description: 'Get config value',
      handler: async () => ({ data: null }),
    });

    const result = loader.resolveNestedCommand(['config', 'get']);
    expect(result).not.toBeNull();
    expect(result!.site).toBeDefined();
    expect(result!.site.name).toBe('mysite');
  });
});

describe('PluginLoader - getSubCommands', () => {
  let loader: PluginLoader;

  beforeEach(() => {
    loader = new PluginLoader(makeCoreHost());
  });

  it('returns all sub-commands under a prefix', async () => {
    const api = loader.getAPI();
    const site = api.createSite({ name: 'test', url: 'https://example.com' });
    site.command('config.get', {
      description: 'Get config',
      handler: async () => ({ data: null }),
    });
    site.command('config.set', {
      description: 'Set config',
      handler: async () => ({ data: null }),
    });
    site.command('config.list', {
      description: 'List config',
      handler: async () => ({ data: null }),
    });
    site.command('scrape', {
      description: 'Scrape data',
      handler: async () => ({ data: null }),
    });

    const subs = loader.getSubCommands('config');
    expect(subs).toHaveLength(3);
    const names = subs.map((s) => s.name).sort();
    expect(names).toEqual(['config.get', 'config.list', 'config.set']);
  });

  it('includes parent command if it exists', async () => {
    const api = loader.getAPI();
    const site = api.createSite({ name: 'test', url: 'https://example.com' });
    site.command('config', {
      description: 'Config root',
      handler: async () => ({ data: null }),
    });
    site.command('config.get', {
      description: 'Get config',
      handler: async () => ({ data: null }),
    });

    const subs = loader.getSubCommands('config');
    expect(subs).toHaveLength(2);
    const names = subs.map((s) => s.name).sort();
    expect(names).toEqual(['config', 'config.get']);
  });

  it('returns empty array for unknown prefix', async () => {
    const api = loader.getAPI();
    const site = api.createSite({ name: 'test', url: 'https://example.com' });
    site.command('config.get', {
      description: 'Get config',
      handler: async () => ({ data: null }),
    });

    const subs = loader.getSubCommands('unknown');
    expect(subs).toHaveLength(0);
  });
});

describe('Core - nested command routing', () => {
  const baseConfig: CoreConfig = {
    name: 'test-cli',
    version: '1.0.0',
    description: 'Test CLI',
    configDirName: '.test-cli',
    envPrefix: 'TEST_CLI',
    pluginDirs: [],
  };

  it('routes config get as nested command', async () => {
    const core = new Core({ ...baseConfig });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await core.loader.loadFromFunction((api) => {
      const site = api.createSite({ name: 'test', url: 'https://example.com' });
      site.command('config.get', {
        description: 'Get config value',
        parameters: z.object({ key: z.string().optional() }),
        result: z.object({ value: z.string() }),
        handler: async () => ({ value: 'test-val' }),
      });
    });

    const code = await core.run(['config', 'get']);
    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test-val'));

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('routes config get --key host with remaining args', async () => {
    const core = new Core({ ...baseConfig });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let receivedParams: Record<string, unknown> = {};
    await core.loader.loadFromFunction((api) => {
      const site = api.createSite({ name: 'test', url: 'https://example.com' });
      site.command('config.get', {
        description: 'Get config value',
        parameters: z.object({ key: z.string().optional() }),
        result: z.object({ value: z.string() }),
        handler: async (params) => {
          receivedParams = params as Record<string, unknown>;
          return { value: 'db.example.com' };
        },
      });
    });

    const code = await core.run(['config', 'get', '--key', 'host']);
    expect(code).toBe(0);
    expect(receivedParams.key).toBe('host');

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('shows help for nested command with --help', async () => {
    const core = new Core({ ...baseConfig });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await core.loader.loadFromFunction((api) => {
      const site = api.createSite({ name: 'test', url: 'https://example.com' });
      site.command('config.get', {
        description: 'Get config value',
        parameters: z.object({ key: z.string().optional() }),
        result: z.object({ value: z.string() }),
        handler: async () => ({ value: 'test' }),
      });
    });

    const code = await core.run(['config', 'get', '--help']);
    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('config.get'));

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('shows sub-commands list for parent --help', async () => {
    const core = new Core({ ...baseConfig });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await core.loader.loadFromFunction((api) => {
      const site = api.createSite({ name: 'test', url: 'https://example.com' });
      site.command('config.get', {
        description: 'Get config value',
        result: z.object({ value: z.string() }),
        handler: async () => ({ value: '' }),
      });
      site.command('config.set', {
        description: 'Set config value',
        result: z.object({ ok: z.boolean() }),
        handler: async () => ({ ok: true }),
      });
    });

    const code = await core.run(['config', '--help']);
    expect(code).toBe(0);
    const allOutput = logSpy.mock.calls.map((c) => c.join('')).join('\n');
    expect(allOutput).toContain('Sub-commands');
    expect(allOutput).toContain('get');
    expect(allOutput).toContain('set');

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('flat commands still work', async () => {
    const core = new Core({ ...baseConfig });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await core.loader.loadFromFunction((api) => {
      const site = api.createSite({ name: 'test', url: 'https://example.com' });
      site.command('scrape', {
        description: 'Scrape data',
        result: z.object({ count: z.number() }),
        handler: async () => ({ count: 42 }),
      });
    });

    const code = await core.run(['scrape']);
    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('42'));

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('routes three-level nested command', async () => {
    const core = new Core({ ...baseConfig });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await core.loader.loadFromFunction((api) => {
      const site = api.createSite({ name: 'test', url: 'https://example.com' });
      site.command('app.module.action', {
        description: 'Deep command',
        result: z.object({ ok: z.boolean() }),
        handler: async () => ({ ok: true }),
      });
    });

    const code = await core.run(['app', 'module', 'action']);
    expect(code).toBe(0);

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('picks longest match when parent and nested both exist', async () => {
    const core = new Core({ ...baseConfig });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let handlerCalled = '';
    await core.loader.loadFromFunction((api) => {
      const site = api.createSite({ name: 'test', url: 'https://example.com' });
      site.command('config', {
        description: 'Config root',
        result: z.object({ msg: z.string() }),
        handler: async () => {
          handlerCalled = 'config';
          return { msg: 'root' };
        },
      });
      site.command('config.get', {
        description: 'Get config value',
        result: z.object({ value: z.string() }),
        handler: async () => {
          handlerCalled = 'config.get';
          return { value: 'nested' };
        },
      });
    });

    const code = await core.run(['config', 'get']);
    expect(code).toBe(0);
    expect(handlerCalled).toBe('config.get');

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('falls back to parent when only parent exists', async () => {
    const core = new Core({ ...baseConfig });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let handlerCalled = '';
    await core.loader.loadFromFunction((api) => {
      const site = api.createSite({ name: 'test', url: 'https://example.com' });
      site.command('config', {
        description: 'Config root',
        result: z.object({ msg: z.string() }),
        handler: async () => {
          handlerCalled = 'config';
          return { msg: 'root' };
        },
      });
    });

    const code = await core.run(['config']);
    expect(code).toBe(0);
    expect(handlerCalled).toBe('config');

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
