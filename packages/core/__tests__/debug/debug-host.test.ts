import { describe, it, expect, vi } from 'vitest';
import { createDebugHost } from '../../src/debug/debug-host.js';
import type { XCLIAPI } from '../../src/protocol/plugin-protocol.js';

function createTestPlugin() {
  return (xcli: XCLIAPI): void => {
    const site = xcli.createSite({
      name: 'test-site',
      url: 'https://example.com',
    });

    site.command('greet', {
      description: 'Say hello',
      handler: async (params) => {
        return { success: true, data: `Hello, ${params.name}!`, tips: [] };
      },
    });

    site.command('add', {
      description: 'Add numbers',
      handler: async (params) => {
        const a = Number(params.a);
        const b = Number(params.b);
        return { success: true, data: a + b, tips: [`result: ${a + b}`] };
      },
    });

    site.command('uses-page', {
      description: 'Uses page from context',
      handler: async (_params, ctx) => {
        const page = (ctx as Record<string, unknown>).page as {
          title(): Promise<string>;
        };
        const title = await page.title();
        return { success: true, data: title, tips: [] };
      },
    });
  };
}

describe('DebugHost', () => {
  it('loads plugin via function and lists commands', async () => {
    const host = createDebugHost();
    await host.loadFunction(createTestPlugin());

    const names = host.getCommandNames();
    expect(names).toContain('greet');
    expect(names).toContain('add');
    expect(names).toContain('uses-page');
  });

  it('executes command and returns result', async () => {
    const host = createDebugHost();
    await host.loadFunction(createTestPlugin());

    const result = await host.exec<string>('greet', { name: 'World' });
    expect(result.success).toBe(true);
    expect(result.data).toBe('Hello, World!');
  });

  it('executes command with numeric result', async () => {
    const host = createDebugHost();
    await host.loadFunction(createTestPlugin());

    const result = await host.exec<number>('add', { a: 3, b: 4 });
    expect(result.success).toBe(true);
    expect(result.data).toBe(7);
    expect(result.tips).toContain('result: 7');
  });

  it('throws on unknown command', async () => {
    const host = createDebugHost();
    await host.loadFunction(createTestPlugin());

    await expect(host.exec('nonexistent')).rejects.toThrow('Command "nonexistent" not found');
  });

  it('passes extra context to handler', async () => {
    const host = createDebugHost();
    await host.loadFunction(createTestPlugin());

    const mockPage = {
      title: vi.fn().mockResolvedValue('Test Page'),
    };

    const result = await host.exec<string>('uses-page', {}, { page: mockPage });
    expect(result.success).toBe(true);
    expect(result.data).toBe('Test Page');
    expect(mockPage.title).toHaveBeenCalled();
  });

  it('getSite returns registered site', async () => {
    const host = createDebugHost();
    await host.loadFunction(createTestPlugin());

    const site = host.getSite('test-site');
    expect(site).toBeDefined();
    expect(site!.name).toBe('test-site');
  });

  it('provides storage context to handlers', async () => {
    const host = createDebugHost();

    const plugin = (xcli: XCLIAPI): void => {
      const site = xcli.createSite({ name: 'storage-test', url: '' });
      site.command('store', {
        description: 'Store value',
        handler: async (_params, ctx) => {
          await ctx.storage.set('key', 'value');
          const val = await ctx.storage.get<string>('key');
          return { success: true, data: val, tips: [] };
        },
      });
    };

    await host.loadFunction(plugin);
    const result = await host.exec<string>('store');
    expect(result.data).toBe('value');
  });

  it('loads multiple plugins', async () => {
    const host = createDebugHost();

    const plugin1 = (xcli: XCLIAPI): void => {
      const site = xcli.createSite({ name: 'p1', url: '' });
      site.command('cmd1', {
        description: 'cmd1',
        handler: async () => ({ success: true, data: 1, tips: [] }),
      });
    };

    const plugin2 = (xcli: XCLIAPI): void => {
      const site = xcli.createSite({ name: 'p2', url: '' });
      site.command('cmd2', {
        description: 'cmd2',
        handler: async () => ({ success: true, data: 2, tips: [] }),
      });
    };

    await host.loadFunction(plugin1);
    await host.loadFunction(plugin2);

    const r1 = await host.exec<number>('cmd1');
    const r2 = await host.exec<number>('cmd2');
    expect(r1.data).toBe(1);
    expect(r2.data).toBe(2);
  });

  it('wrapResult handles non-CommandResult returns', async () => {
    const host = createDebugHost();

    const plugin = (xcli: XCLIAPI): void => {
      const site = xcli.createSite({ name: 'raw', url: '' });
      site.command('raw-return', {
        description: 'raw',
        handler: async () => ({ items: [1, 2, 3] }) as Record<string, unknown>,
      });
    };

    await host.loadFunction(plugin);
    const result = await host.exec('raw-return');
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ items: [1, 2, 3] });
  });

  it('load() by name resolves plugin from pluginDirs', async () => {
    const host = createDebugHost({ pluginDirs: ['.xcli/plugins'] });
    const handle = await host.load('baidu');

    expect(handle.commandNames).toContain('search');
    expect(handle.commandNames).toContain('hotsearch');
    expect(handle.commandNames).toContain('suggest');
    expect(handle.commandNames).toContain('news');
  });

  it('load() returns TypedPluginHandle with exec', async () => {
    const host = createDebugHost({ pluginDirs: ['.xcli/plugins'] });
    const handle = await host.load('baidu');

    const mockPage = {
      goto: vi.fn().mockResolvedValue(null),
      evaluate: vi.fn().mockResolvedValue('window.baidu = { su: function(){} }; s:["编程入门"]'),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
    };

    const result = await handle.exec('suggest', { query: '编程' }, { page: mockPage });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(mockPage.goto).toHaveBeenCalled();
  });

  it('load() throws on unknown plugin name', async () => {
    const host = createDebugHost({ pluginDirs: ['.xcli/plugins'] });
    await expect(host.load('nonexistent-plugin')).rejects.toThrow(
      'Plugin "nonexistent-plugin" not found'
    );
  });

  it('listAvailablePlugins returns plugin names', async () => {
    const host = createDebugHost({ pluginDirs: ['.xcli/plugins'] });
    const plugins = host.listAvailablePlugins();
    expect(plugins.length).toBeGreaterThan(0);
    expect(plugins).toContain('baidu');
  });

  it('resolvePluginPath returns null for unknown plugin', () => {
    const host = createDebugHost({ pluginDirs: ['.xcli/plugins'] });
    expect(host.resolvePluginPath('zzz-nonexistent')).toBeNull();
  });

  it('resolvePluginPath resolves baidu to index.ts', () => {
    const host = createDebugHost({ pluginDirs: ['.xcli/plugins'] });
    const path = host.resolvePluginPath('baidu');
    expect(path).toContain('baidu/index.ts');
  });
});
