import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'path';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { PluginLoader } from '../../src/plugin-loader.js';
import { PluginInstance } from '../../src/plugin-instance.js';
import type { Core, CoreConfig } from '../../src/core.js';

const FIXTURES = resolve(__dirname, '..', 'fixtures');

function createMockCore(overrides?: Partial<CoreConfig>): Core {
  const tmpStorage = mkdtempSync(resolve(tmpdir(), 'xcli-test-storage-'));
  const config: CoreConfig = {
    name: 'test-cli',
    version: '0.0.1',
    description: 'test',
    configDirName: '.test-cli',
    envPrefix: 'TEST_CLI',
    pluginDirs: [],
    pluginPackageName: '@dyyz1993/xcli-core',
    ...overrides,
  };
  return {
    config,
    configDir: tmpStorage,
    sessionDir: resolve(tmpStorage, 'sessions'),
    storageDir: resolve(tmpStorage, 'storage'),
  } as Core;
}

function createTmpPlugin(code: string, ext: 'ts' | 'js' = 'ts'): string {
  const dir = mkdtempSync(resolve(tmpdir(), 'xcli-plugin-'));
  writeFileSync(
    resolve(dir, 'package.json'),
    JSON.stringify({ name: 'tmp-plugin', version: '1.0.0', type: 'module' })
  );
  writeFileSync(resolve(dir, `index.${ext}`), code);
  return dir;
}

describe('PluginLoader', () => {
  let loader: PluginLoader;
  let tmpDirs: string[] = [];

  beforeEach(() => {
    const core = createMockCore();
    loader = new PluginLoader(core);
  });

  afterEach(async () => {
    await loader.unloadAll();
    for (const dir of tmpDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    tmpDirs = [];
  });

  function trackTmp(dir: string): string {
    tmpDirs.push(dir);
    return dir;
  }

  // ─── 1. jiti + TS 编译加载 ────────────────────────────

  describe('jiti + TS plugin loading', () => {
    it('should load a .ts plugin via jiti and set status to loaded', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'ts-test', url: 'https://example.com' });
            site.command('ping', {
              description: 'Ping',
              handler: async () => ({ success: true, data: { pong: true }, message: '', tips: ['pong'] }),
            });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'));
      expect(instance.status).toBe('loaded');
      expect(instance.loaded).toBe(true);
    });

    it('should register commands from loaded .ts plugin', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'cmd-test', url: 'https://example.com' });
            site.command('scrape', {
              description: 'Scrape data',
              handler: async () => ({ success: true, data: [], message: '', tips: ['scraped'] }),
            });
            site.command('verify', {
              description: 'Verify data',
              handler: async () => ({ success: true, data: {}, message: '', tips: ['verified'] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));

      const site = loader.getSite('cmd-test');
      expect(site).toBeDefined();
      expect(site!.getCommand('scrape')).not.toBeNull();
      expect(site!.getCommand('verify')).not.toBeNull();
    });

    it('should load a .js plugin via dynamic import', async () => {
      const dir = trackTmp(
        createTmpPlugin(
          `
          export default function(cli) {
            const site = cli.createSite({ name: 'js-test', url: 'https://example.com' });
            site.command('hello', {
              description: 'Hello',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          };
        `,
          'js'
        )
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.js'));
      expect(instance.status).toBe('loaded');
    });

    it('should set status to error when loading a plugin with syntax errors', async () => {
      const brokenPath = resolve(FIXTURES, 'broken-plugin', 'index.ts');
      await expect(loader.loadPlugin(brokenPath)).rejects.toThrow();

      const plugin = loader.getPlugin('broken-plugin');
      expect(plugin).toBeDefined();
      expect(plugin!.status).toBe('error');
      expect(plugin!.error).toBeInstanceOf(Error);
    });

    it('should throw when loading a non-existent plugin file', async () => {
      await expect(loader.loadPlugin('/non/existent/path/index.ts')).rejects.toThrow();
    });

    it('should handle plugin with non-function default export gracefully', async () => {
      const dir = trackTmp(createTmpPlugin(`export default { not: 'a function' };`));

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'));
      expect(instance.status).toBe('loaded');
      expect(loader.getSites()).toHaveLength(0);
    });

    it('should handle plugin that uses module-level named export instead of default', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          function setup(cli) {
            const site = cli.createSite({ name: 'named-export', url: 'https://example.com' });
            site.command('ping', {
              description: 'Ping',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
          export { setup };
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'));
      expect(instance.status).toBe('loaded');
    });
  });

  // ─── 2. 插件生命周期 ──────────────────────────────────

  describe('plugin lifecycle', () => {
    it('should execute onLoad handlers during mount', async () => {
      const loaded = false;
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.onLoad(async () => { globalThis.__test_loaded = true; });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      expect(globalThis.__test_loaded).toBe(true);
      delete globalThis.__test_loaded;
    });

    it('should execute onUnload handlers during unmount', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.onLoad(async () => { globalThis.__test_unload_marker = 'loaded'; });
            cli.onUnload(async () => { globalThis.__test_unload_marker = 'unloaded'; });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'));
      expect(globalThis.__test_unload_marker).toBe('loaded');

      await loader.unloadPlugin(instance.id);
      expect(globalThis.__test_unload_marker).toBe('unloaded');
      delete globalThis.__test_unload_marker;
    });

    it('should reload a plugin (unmount + remount)', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'reload-test', url: 'https://example.com' });
            site.command('ping', {
              description: 'Ping',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      const original = await loader.loadPlugin(resolve(dir, 'index.ts'));
      expect(original.status).toBe('loaded');
      expect(loader.getSite('reload-test')).toBeDefined();

      const reloaded = await loader.reloadPlugin(original.id);
      expect(reloaded.status).toBe('loaded');
      expect(reloaded.loaded).toBe(true);
    });

    it('should unload all plugins via unloadAll', async () => {
      const dir1 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'site-a', url: 'https://a.com' });
          }
        `)
      );
      const dir2 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'site-b', url: 'https://b.com' });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir1, 'index.ts'));
      await loader.loadPlugin(resolve(dir2, 'index.ts'));
      expect(loader.getSites()).toHaveLength(2);

      await loader.unloadAll();
      expect(loader.getLoadedPlugins()).toHaveLength(0);
    });
  });

  // ─── 3. createSite API ────────────────────────────────

  describe('createSite API', () => {
    it('should register a site via cli.createSite', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'my-site', url: 'https://example.com' });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      const site = loader.getSite('my-site');
      expect(site).toBeDefined();
      expect(site!.name).toBe('my-site');
      expect(site!.url).toBe('https://example.com');
    });

    it('should register commands on site', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'cmd-site', url: 'https://example.com' });
            site.command('scrape', {
              description: 'Scrape',
              handler: async () => ({ success: true, data: [], message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      const site = loader.getSite('cmd-site');
      expect(site!.getCommand('scrape')).not.toBeNull();
      expect(site!.getCommand('scrape')!.description).toBe('Scrape');
    });

    it('should register flags via cli.registerFlag', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerFlag({ name: 'verbose', short: 'v', type: 'boolean', description: 'Verbose output' });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      const flag = loader.getFlag('verbose');
      expect(flag).toBeDefined();
      expect(flag!.description).toBe('Verbose output');
    });

    it('should register tools via cli.registerTool', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerTool({
              name: 'fetch-url',
              description: 'Fetch a URL',
              execute: async (params) => ({ html: '<html></html>' }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      const tool = loader.getTool('fetch-url');
      expect(tool).toBeDefined();
      expect(tool!.description).toBe('Fetch a URL');
    });

    it('should override tools via cli.overrideTool', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerTool({
              name: 'my-tool',
              description: 'Original',
              execute: async () => 'original',
            });
            cli.overrideTool('my-tool', {
              name: 'my-tool',
              description: 'Overridden',
              execute: async () => 'overridden',
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      const tool = loader.getTool('my-tool');
      expect(tool!.description).toBe('Overridden');
    });
  });

  // ─── 4. 插件状态管理 ──────────────────────────────────

  describe('plugin status management', () => {
    it('should track loaded/unloaded/error status', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'status-test', url: 'https://example.com' });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'));
      expect(loader.getPluginStatus(instance.id)).toBe('loaded');

      await loader.unloadPlugin(instance.id);
      expect(loader.getPluginStatus(instance.id)).toBe('unloaded');
    });

    it('should return unloaded for unknown plugin', () => {
      expect(loader.getPluginStatus('nonexistent')).toBe('unloaded');
    });

    it('should get plugin by id', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'get-test', url: 'https://example.com' });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'), 'my-plugin-id');
      expect(loader.getPlugin('my-plugin-id')).toBe(instance);
    });

    it('should list loaded plugins', async () => {
      const dir1 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'list-a', url: 'https://a.com' });
          }
        `)
      );
      const dir2 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'list-b', url: 'https://b.com' });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir1, 'index.ts'), 'p1');
      await loader.loadPlugin(resolve(dir2, 'index.ts'), 'p2');

      const plugins = loader.getLoadedPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
    });

    it('should derive plugin id from directory name when index.ts', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'derived', url: 'https://example.com' });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'));
      expect(instance.id).toMatch(/^xcli-plugin-/);
      expect(instance.path).toContain('index.ts');
    });

    it('should throw when unloading unknown plugin', async () => {
      await expect(loader.unloadPlugin('nonexistent')).rejects.toThrow(
        'Plugin "nonexistent" not found'
      );
    });

    it('should throw when reloading unknown plugin', async () => {
      await expect(loader.reloadPlugin('nonexistent')).rejects.toThrow(
        'Plugin "nonexistent" not found'
      );
    });
  });

  // ─── 5. 命令清理 ──────────────────────────────────────

  describe('command cleanup on unmount', () => {
    it('should remove all commands when plugin unmounts', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerCommand({
              name: 'cmd-a',
              description: 'A',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
            cli.registerCommand({
              name: 'cmd-b',
              description: 'B',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'), 'cleanup-test');
      expect(loader.getCommand('cmd-a')).toBeDefined();
      expect(loader.getCommand('cmd-b')).toBeDefined();

      await loader.unloadPlugin('cleanup-test');
      expect(loader.getCommand('cmd-a')).toBeUndefined();
      expect(loader.getCommand('cmd-b')).toBeUndefined();
    });

    it('should remove all event handlers when plugin unmounts', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.onEvent('test-event', () => { globalThis.__event_fired = true; });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'), 'event-cleanup');
      await loader.emitEvent('test-event', { type: 'test-event', cwd: '', args: {} });

      await loader.unloadPlugin('event-cleanup');

      globalThis.__event_fired = false;
      await loader.emitEvent('test-event', { type: 'test-event', cwd: '', args: {} });
      expect(globalThis.__event_fired).toBe(false);
      delete globalThis.__event_fired;
    });

    it('should remove flags and tools when plugin unmounts', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerFlag({ name: 'flag-x', description: 'X flag' });
            cli.registerTool({ name: 'tool-y', description: 'Y tool', execute: async () => null });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'), 'ft-cleanup');
      expect(loader.getFlag('flag-x')).toBeDefined();
      expect(loader.getTool('tool-y')).toBeDefined();

      await loader.unloadPlugin('ft-cleanup');
      expect(loader.getFlag('flag-x')).toBeUndefined();
      expect(loader.getTool('tool-y')).toBeUndefined();
    });

    it('should re-register commands after reload', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerCommand({
              name: 'reload-cmd',
              description: 'Reload test',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'), 'reload-cleanup');
      expect(loader.getCommand('reload-cmd')).toBeDefined();

      await loader.reloadPlugin('reload-cleanup');
      expect(loader.getCommand('reload-cmd')).toBeDefined();
    });
  });

  // ─── 6. 事件系统 ──────────────────────────────────────

  describe('event system', () => {
    it('should emit events to registered handlers', async () => {
      const received: unknown[] = [];
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.onEvent('data-ready', (evt) => { globalThis.__test_events = globalThis.__test_events || []; globalThis.__test_events.push(evt); });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'), 'evt-test');
      await loader.emitEvent('data-ready', {
        type: 'data-ready',
        cwd: '/tmp',
        args: { key: 'val' },
      });

      expect((globalThis as any).__test_events).toHaveLength(1);
      expect((globalThis as any).__test_events[0].args).toEqual({ key: 'val' });
      delete (globalThis as any).__test_events;
    });
  });

  // ─── 7. 插件替换（同 id 重新加载） ────────────────────

  describe('plugin replacement', () => {
    it('should replace existing plugin when loading same id', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'replace-test', url: 'https://v1.com' });
          }
        `)
      );

      const v1 = await loader.loadPlugin(resolve(dir, 'index.ts'), 'replace-id');
      expect(loader.getSite('replace-test')!.url).toBe('https://v1.com');

      const dir2 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'replace-test', url: 'https://v2.com' });
          }
        `)
      );

      const v2 = await loader.loadPlugin(resolve(dir2, 'index.ts'), 'replace-id');
      expect(loader.getSite('replace-test')!.url).toBe('https://v2.com');
    });
  });

  // ─── 8. loadFromFunction ──────────────────────────────

  describe('loadFromFunction', () => {
    it('should execute setup function directly', async () => {
      await loader.loadFromFunction((cli) => {
        cli.createSite({ name: 'fn-site', url: 'https://fn.com' });
      });

      expect(loader.getSite('fn-site')).toBeDefined();
    });
  });

  // ─── 9. 命令查找 ──────────────────────────────────────

  describe('command resolution', () => {
    it('should find command across sites', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'resolve-test', url: 'https://example.com' });
            site.command('search', {
              description: 'Search',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      const found = loader.findCommand('search');
      expect(found).not.toBeNull();
      expect(found!.entry.name).toBe('search');
      expect(found!.site.name).toBe('resolve-test');
    });

    it('should return null for unknown command', () => {
      expect(loader.findCommand('nonexistent')).toBeNull();
    });

    it('should resolve command by site name', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'site-resolve', url: 'https://example.com' });
            site.command('cmd1', {
              description: 'Cmd1',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      const cmd = loader.resolveCommand('cmd1', 'site-resolve');
      expect(cmd).not.toBeNull();
      expect(cmd!.name).toBe('cmd1');
    });

    it('should list all commands', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerCommand({ name: 'all-cmd-1', description: '1', handler: async () => ({ success: true, data: {}, message: '', tips: [] }) });
            cli.registerCommand({ name: 'all-cmd-2', description: '2', handler: async () => ({ success: true, data: {}, message: '', tips: [] }) });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      const cmds = loader.getAllCommands();
      expect(cmds.length).toBeGreaterThanOrEqual(2);
      expect(cmds.map((c) => c.name)).toContain('all-cmd-1');
      expect(cmds.map((c) => c.name)).toContain('all-cmd-2');
    });
  });

  // ─── 10. builtin scope ────────────────────────────────

  describe('builtin scope', () => {
    it('should register and retrieve builtin scope', () => {
      loader.registerBuiltinScope('browse', 'browser');
      expect(loader.getBuiltinScope('browse')).toBe('browser');
    });

    it('should return default scope for unknown name', () => {
      expect(loader.getBuiltinScope('unknown')).toBe('page');
    });
  });

  // ─── 11. unload ───────────────────────────────────────

  describe('unload', () => {
    it('should unload loader and all plugins', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'unload-test', url: 'https://example.com' });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      expect(loader.getLoadedPlugins()).toHaveLength(1);

      await loader.unload();
      expect(loader.getLoadedPlugins()).toHaveLength(0);
    });
  });
});
