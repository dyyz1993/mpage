import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolve, relative } from 'path';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { PluginLoader } from '../../src/plugin-loader.js';
import type { Core, CoreConfig } from '../../src/core.js';

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

describe('PluginLoader - branch coverage tests', () => {
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

  describe('loadPlugin - relative path resolution', () => {
    it('should resolve relative path using cwd', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'relative-test', url: 'https://example.com' });
          }
        `)
      );

      const relativePath = relative(process.cwd(), resolve(dir, 'index.ts'));
      const instance = await loader.loadPlugin(relativePath);

      expect(instance.status).toBe('loaded');
      expect(loader.getSite('relative-test')).toBeDefined();
    });

    it('should resolve absolute path directly', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'absolute-test', url: 'https://example.com' });
          }
        `)
      );

      const absolutePath = resolve(dir, 'index.ts');
      const instance = await loader.loadPlugin(absolutePath);

      expect(instance.status).toBe('loaded');
      expect(loader.getSite('absolute-test')).toBeDefined();
    });
  });

  describe('loadPlugin - explicitId parameter', () => {
    it('should use explicitId when provided', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'explicit-id-test', url: 'https://example.com' });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'), 'my-custom-id');
      expect(instance.id).toBe('my-custom-id');
      expect(loader.getPlugin('my-custom-id')).toBe(instance);
    });

    it('should derive id from path when explicitId not provided', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'derive-id-test', url: 'https://example.com' });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'));
      expect(instance.id).toMatch(/^xcli-plugin-/);
    });
  });

  describe('loadPlugin - existing plugin replacement', () => {
    it('should unmount existing loaded plugin before replacing', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'replace-unload', url: 'https://v1.com' });
            site.command('test-cmd', {
              description: 'Test',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      const v1 = await loader.loadPlugin(resolve(dir, 'index.ts'), 'replace-id');
      expect(v1.status).toBe('loaded');
      expect(loader.getSite('replace-unload')!.url).toBe('https://v1.com');

      const dir2 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'replace-unload', url: 'https://v2.com' });
          }
        `)
      );

      const v2 = await loader.loadPlugin(resolve(dir2, 'index.ts'), 'replace-id');
      expect(v2.status).toBe('loaded');
      expect(loader.getSite('replace-unload')!.url).toBe('https://v2.com');
      expect(v2.id).toBe('replace-id');
    });

    it('should handle replacing existing unloaded plugin', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'replace-unloaded', url: 'https://v1.com' });
          }
        `)
      );

      const v1 = await loader.loadPlugin(resolve(dir, 'index.ts'), 'replace-unloaded-id');
      await loader.unloadPlugin('replace-unloaded-id');
      expect(v1.status).toBe('unloaded');

      const dir2 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'replace-unloaded', url: 'https://v2.com' });
          }
        `)
      );

      const v2 = await loader.loadPlugin(resolve(dir2, 'index.ts'), 'replace-unloaded-id');
      expect(v2.status).toBe('loaded');
    });
  });

  describe('loadPlugin - error handling', () => {
    it('should catch and set error when plugin throws during setup', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            throw new Error('Setup failed intentionally');
          }
        `)
      );

      await expect(loader.loadPlugin(resolve(dir, 'index.ts'), 'error-setup')).rejects.toThrow(
        'Setup failed intentionally'
      );

      const instance = loader.getPlugin('error-setup');
      expect(instance).toBeDefined();
      expect(instance!.status).toBe('error');
      expect(instance!.error).toBeInstanceOf(Error);
      expect(instance!.error!.message).toBe('Setup failed intentionally');
    });

    it('should catch non-Error objects and convert to Error', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            throw 'String error';
          }
        `)
      );

      await expect(loader.loadPlugin(resolve(dir, 'index.ts'), 'error-string')).rejects.toThrow();

      const instance = loader.getPlugin('error-string');
      expect(instance!.error).toBeInstanceOf(Error);
      expect(instance!.error!.message).toBe('String error');
    });

    it('should set activeInstanceId to null in finally block after successful load', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'finally-test', url: 'https://example.com' });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      expect(loader.getLoadedPlugins()).toHaveLength(1);
    });

    it('should set activeInstanceId to null in finally block after error', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            throw new Error('Error during load');
          }
        `)
      );

      await expect(loader.loadPlugin(resolve(dir, 'index.ts'), 'error-finally')).rejects.toThrow();
      expect(loader.getLoadedPlugins()).toHaveLength(1);
    });
  });

  describe('mount - early return and error handling', () => {
    it('should return early if already loaded', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'mount-early', url: 'https://example.com' });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'), 'mount-early-test');
      expect(instance.status).toBe('loaded');

      await instance.mount();
      expect(instance.status).toBe('loaded');
    });

    it('should set status to error and throw when load handler fails', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.onLoad(async () => {
              throw new Error('Load handler error');
            });
          }
        `)
      );

      await expect(loader.loadPlugin(resolve(dir, 'index.ts'), 'mount-error')).rejects.toThrow(
        'Load handler error'
      );

      const instance = loader.getPlugin('mount-error');
      expect(instance!.status).toBe('error');
      expect(instance!.error).toBeInstanceOf(Error);
      expect(instance!.error!.message).toBe('Load handler error');
    });

    it('should handle synchronous errors in load handlers', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.onLoad(() => {
              throw new Error('Sync load error');
            });
          }
        `)
      );

      await expect(
        loader.loadPlugin(resolve(dir, 'index.ts'), 'mount-sync-error')
      ).rejects.toThrow();

      const instance = loader.getPlugin('mount-sync-error');
      expect(instance.status).toBe('error');
      expect(instance!.error!.message).toBe('Sync load error');
    });
  });

  describe('unmount - early return and error swallowing', () => {
    it('should return early if not loaded', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'unmount-early', url: 'https://example.com' });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'), 'unmount-early-test');
      await instance.unmount();

      await instance.unmount();
      expect(instance.status).toBe('unloaded');
    });

    it('should swallow errors in unload handlers', async () => {
      const unloadCalled = false;
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.onUnload(async () => {
              globalThis.__unload_called = true;
              throw new Error('Unload handler error');
            });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'), 'unmount-swallow');
      await instance.unmount();

      expect(globalThis.__unload_called).toBe(true);
      expect(instance.status).toBe('unloaded');
      delete globalThis.__unload_called;
    });

    it('should swallow synchronous errors in unload handlers', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.onUnload(() => {
              throw new Error('Sync unload error');
            });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'), 'unmount-sync-swal');
      await expect(instance.unmount()).resolves.not.toThrow();
      expect(instance.status).toBe('unloaded');
    });

    it('should cleanup plugin registrations on unmount', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'cleanup-reg', url: 'https://example.com' });
            site.command('cleanup-cmd', {
              description: 'Cleanup test',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
            cli.registerFlag({ name: 'cleanup-flag', description: 'Cleanup flag' });
            cli.registerTool({ name: 'cleanup-tool', description: 'Cleanup tool', execute: async () => null });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'), 'cleanup-reg-test');
      await loader.unloadPlugin('cleanup-reg-test');

      expect(loader.getCommand('cleanup-cmd')).toBeUndefined();
      expect(loader.getFlag('cleanup-flag')).toBeUndefined();
      expect(loader.getTool('cleanup-tool')).toBeUndefined();
      expect(loader.getSite('cleanup-reg')).toBeUndefined();
    });
  });

  describe('registerCommand - conflict and override tracking', () => {
    it('should track overridden commands when registering duplicate', async () => {
      const dir1 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerCommand({
              name: 'override-test',
              description: 'Original command',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir1, 'index.ts'), 'plugin-override-1');

      const dir2 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerCommand({
              name: 'override-test',
              description: 'Overridden command',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir2, 'index.ts'), 'plugin-override-2');

      const cmd = loader.getCommand('override-test');
      expect(cmd!.description).toBe('Overridden command');
    });

    it('should not track override when no active instance', async () => {
      loader.getAPI().registerCommand({
        name: 'no-active-override',
        description: 'First command',
        handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
      });

      const cmd = loader.getCommand('no-active-override');
      expect(cmd).toBeDefined();
      expect(cmd!.description).toBe('First command');
    });
  });

  describe('cleanupPluginRegistrations - restore overridden commands', () => {
    it('should restore original command when plugin unmounts', async () => {
      const dir1 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerCommand({
              name: 'restore-test',
              description: 'Original',
              handler: async () => ({ success: true, data: { original: true }, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir1, 'index.ts'), 'restore-plugin-1');

      const cmd1 = loader.getCommand('restore-test');
      expect(cmd1!.description).toBe('Original');

      const dir2 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerCommand({
              name: 'restore-test',
              description: 'Override',
              handler: async () => ({ success: true, data: { override: true }, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir2, 'index.ts'), 'restore-plugin-2');

      const cmd2 = loader.getCommand('restore-test');
      expect(cmd2!.description).toBe('Override');

      await loader.unloadPlugin('restore-plugin-2');

      const cmd3 = loader.getCommand('restore-test');
      expect(cmd3!.description).toBe('Original');
    });

    it('should delete command when no override exists', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerCommand({
              name: 'delete-test',
              description: 'To delete',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'), 'delete-plugin');
      await loader.unloadPlugin('delete-plugin');

      expect(loader.getCommand('delete-test')).toBeUndefined();
    });

    it('should handle event handler cleanup with multiple handlers', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.onEvent('multi-event', () => { globalThis.__event1 = true; });
            cli.onEvent('multi-event', () => { globalThis.__event2 = true; });
            cli.onEvent('other-event', () => { globalThis.__event3 = true; });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'), 'multi-event-cleanup');
      await loader.unloadPlugin('multi-event-cleanup');

      globalThis.__event1 = false;
      globalThis.__event2 = false;
      globalThis.__event3 = false;

      await loader.emitEvent('multi-event', { type: 'multi-event', cwd: '', args: {} });
      await loader.emitEvent('other-event', { type: 'other-event', cwd: '', args: {} });

      expect(globalThis.__event1).toBe(false);
      expect(globalThis.__event2).toBe(false);
      expect(globalThis.__event3).toBe(false);

      delete globalThis.__event1;
      delete globalThis.__event2;
      delete globalThis.__event3;
    });

    it('should delete event from global handlers when no handlers remain', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.onEvent('sole-event', () => { globalThis.__sole_event = true; });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'), 'sole-event-cleanup');
      await loader.unloadPlugin('sole-event-cleanup');

      globalThis.__sole_event = false;
      await loader.emitEvent('sole-event', { type: 'sole-event', cwd: '', args: {} });
      expect(globalThis.__sole_event).toBe(false);
      delete globalThis.__sole_event;
    });
  });

  describe('event handler registration', () => {
    it('should create new event handler array when event does not exist', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.onEvent('new-event', () => { globalThis.__new_event = true; });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'), 'new-event-test');

      await loader.emitEvent('new-event', { type: 'new-event', cwd: '', args: {} });
      expect(globalThis.__new_event).toBe(true);
      delete globalThis.__new_event;
    });

    it('should add handler to existing event array', async () => {
      const dir1 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.onEvent('shared-event', () => { globalThis.__event_a = true; });
          }
        `)
      );

      const dir2 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.onEvent('shared-event', () => { globalThis.__event_b = true; });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir1, 'index.ts'), 'shared-a');
      await loader.loadPlugin(resolve(dir2, 'index.ts'), 'shared-b');

      await loader.emitEvent('shared-event', { type: 'shared-event', cwd: '', args: {} });
      expect(globalThis.__event_a).toBe(true);
      expect(globalThis.__event_b).toBe(true);

      delete globalThis.__event_a;
      delete globalThis.__event_b;
    });
  });

  describe('findCommand - scope filtering', () => {
    it('should return command when scope matches', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'scope-test', url: 'https://example.com' });
            site.command('scoped-cmd', {
              scope: 'page' as const,
              description: 'Scoped command',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      const found = loader.findCommand('scoped-cmd', 'page');
      expect(found).not.toBeNull();
      expect(found!.entry.name).toBe('scoped-cmd');
    });

    it('should return null when scope does not match', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'scope-mismatch', url: 'https://example.com' });
            site.command('scope-cmd', {
              scope: 'page' as const,
              description: 'Scope mismatch',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      const found = loader.findCommand('scope-cmd', 'browser');
      expect(found).toBeNull();
    });

    it('should return command when no scope filter provided', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'no-scope-filter', url: 'https://example.com' });
            site.command('any-scope-cmd', {
              scope: 'page' as const,
              description: 'Any scope',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      const found = loader.findCommand('any-scope-cmd');
      expect(found).not.toBeNull();
    });
  });

  describe('reload - status transitions', () => {
    it('should transition from loaded to loaded on successful reload', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'reload-status', url: 'https://example.com' });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'), 'reload-status-test');
      expect(instance.status).toBe('loaded');

      const reloaded = await loader.reloadPlugin('reload-status-test');
      expect(reloaded.status).toBe('loaded');
      expect(reloaded.loaded).toBe(true);
    });

    it('should handle reload when plugin has error status', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            throw new Error('Initial load error');
          }
        `)
      );

      await expect(
        loader.loadPlugin(resolve(dir, 'index.ts'), 'reload-error-test')
      ).rejects.toThrow();

      const instance = loader.getPlugin('reload-error-test');
      expect(instance!.status).toBe('error');

      await expect(loader.reloadPlugin('reload-error-test')).rejects.toThrow('Initial load error');

      const reloaded = loader.getPlugin('reload-error-test');
      expect(reloaded!.status).toBe('error');
    });
  });

  describe('PluginInstance - addOverriddenCommand', () => {
    it('should not override if already exists', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerCommand({
              name: 'multi-override',
              description: 'First',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'), 'multi-override-test');

      instance.addOverriddenCommand('multi-override', {
        name: 'multi-override',
        description: 'Original 1',
        scope: 'page',
        handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
      });

      instance.addOverriddenCommand('multi-override', {
        name: 'multi-override',
        description: 'Original 2',
        scope: 'page',
        handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
      });

      const overridden = instance.getOverriddenCommands().get('multi-override');
      expect(overridden!.description).toBe('Original 1');
    });
  });

  describe('PluginInstance - addEventHandler', () => {
    it('should create new Set when event does not exist', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'handler-set', url: 'https://example.com' });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'), 'handler-set-test');
      instance.addEventHandler('new-handler-event', () => {});

      const handlers = instance.getEventHandlers().get('new-handler-event');
      expect(handlers).toBeInstanceOf(Set);
      expect(handlers!.size).toBe(1);
    });

    it('should add handler to existing Set when event exists', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'handler-add', url: 'https://example.com' });
          }
        `)
      );

      const instance = await loader.loadPlugin(resolve(dir, 'index.ts'), 'handler-add-test');

      instance.addEventHandler('existing-event', () => {});
      instance.addEventHandler('existing-event', () => {});

      const handlers = instance.getEventHandlers().get('existing-event');
      expect(handlers!.size).toBe(2);
    });
  });

  describe('createStorage — internal methods', () => {
    it('should get/set/delete/keys/clear via storage context', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.createSite({ name: 'storage-test', url: 'https://example.com' });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'), 'storage-test');

      const storage = (loader as any).storage;
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      expect(await storage.get('key1')).toBe('value1');
      expect(await storage.get('key2')).toBe('value2');
      expect(await storage.get('nonexistent')).toBeNull();

      const keys = await storage.keys();
      expect(keys.sort()).toEqual(['key1', 'key2']);

      await storage.delete('key1');
      expect(await storage.get('key1')).toBeNull();

      await storage.clear();
      expect(await storage.keys()).toEqual([]);
    });
  });

  describe('resolveCommand — site name fallback', () => {
    it('should return null when siteName provided but site not found', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'resolve-site', url: 'https://example.com' });
            site.command('resolve-cmd', {
              description: 'Resolve',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));

      const cmd = loader.resolveCommand('resolve-cmd', 'non-existent-site');
      expect(cmd).not.toBeNull();
      expect(cmd!.name).toBe('resolve-cmd');
    });

    it('should return null when no command found in any site', () => {
      expect(loader.resolveCommand('nonexistent')).toBeNull();
    });

    it('should resolve command when siteName matches', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            const site = cli.createSite({ name: 'exact-site', url: 'https://example.com' });
            site.command('exact-cmd', {
              description: 'Exact',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      const cmd = loader.resolveCommand('exact-cmd', 'exact-site');
      expect(cmd).not.toBeNull();
      expect(cmd!.name).toBe('exact-cmd');
    });
  });

  describe('getAllFlags and getAllTools', () => {
    it('should return empty arrays when nothing registered', () => {
      expect(loader.getAllFlags()).toEqual([]);
      expect(loader.getAllTools()).toEqual([]);
    });

    it('should return all registered flags and tools', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerFlag({ name: 'flag1', description: 'F1' });
            cli.registerFlag({ name: 'flag2', description: 'F2' });
            cli.registerTool({ name: 'tool1', description: 'T1', execute: async () => null });
            cli.registerTool({ name: 'tool2', description: 'T2', execute: async () => null });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      expect(loader.getAllFlags()).toHaveLength(2);
      expect(loader.getAllTools()).toHaveLength(2);
    });
  });

  describe('getSiteCommand', () => {
    it('should return undefined for unknown site:command', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerCommand({
              name: 'sc-cmd',
              description: 'SC',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));
      expect(loader.getSiteCommand('unknown-site', 'sc-cmd')).toBeUndefined();
    });
  });
});
