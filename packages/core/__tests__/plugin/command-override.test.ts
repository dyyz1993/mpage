import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod/v4';
import { resolve } from 'path';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { PluginLoader } from '../../src/plugin-loader.js';
import { SiteInstanceImpl } from '../../src/protocol/plugin-protocol.js';
import type {
  CommandContext,
  StorageContext,
  CommandHandler,
} from '../../src/protocol/plugin-protocol.js';
import type { Core, CoreConfig } from '../../src/core.js';

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
    site: {} as CommandContext['site'],
    cliName: 'test',
    ...overrides,
  };
}

function createMockCore(overrides?: Partial<CoreConfig>): Core {
  const tmpStorage = mkdtempSync(resolve(tmpdir(), 'xcli-test-override-'));
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

function createTmpPlugin(code: string): string {
  const dir = mkdtempSync(resolve(tmpdir(), 'xcli-override-plugin-'));
  writeFileSync(
    resolve(dir, 'package.json'),
    JSON.stringify({ name: 'tmp-plugin', version: '1.0.0', type: 'module' })
  );
  writeFileSync(resolve(dir, 'index.ts'), code);
  return dir;
}

describe('Command Override', () => {
  let loader: PluginLoader;
  let tmpDirs: string[] = [];

  beforeEach(() => {
    loader = new PluginLoader(createMockCore());
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

  describe('1. single-layer override + call original handler', () => {
    it('should call original handler via getOriginalHandler and return enhanced result', async () => {
      const site = new SiteInstanceImpl(
        { name: 'override-site', url: 'https://example.com' },
        mockStorage()
      );

      const originalHandler = async () => ({
        success: true,
        data: { value: 1 },
        message: '',
        tips: [],
      });
      site.command('fetch', {
        description: 'original fetch',
        parameters: z.object({}),
        handler: originalHandler,
      });

      const overrideHandler: CommandHandler = async (params, ctx) => {
        const orig = site.getOriginalHandler('fetch');
        const origResult = orig ? await orig(params, ctx) : null;
        return {
          success: true,
          data: { ...((origResult as any)?.data ?? {}), enhanced: true },
          message: '',
          tips: ['enhanced'],
        };
      };

      site.command('fetch', {
        description: 'enhanced fetch',
        parameters: z.object({}),
        handler: overrideHandler,
      });

      const cmd = site.getCommand('fetch')!;
      expect(cmd.description).toBe('enhanced fetch');
      expect(cmd.previousHandler).toBe(originalHandler);

      const result = await cmd.handler({}, mockCtx({ site }));
      expect((result as any).data.value).toBe(1);
      expect((result as any).data.enhanced).toBe(true);
    });
  });

  describe('2. override:false rejection', () => {
    it('should reject override when existing command has override:false', () => {
      const site = new SiteInstanceImpl({ name: 'locked-site' }, mockStorage());

      const lockedHandler = async () => ({ success: true, data: 'locked', message: '', tips: [] });
      site.command('secure-cmd', {
        description: 'locked command',
        parameters: z.object({}),
        override: false,
        handler: lockedHandler,
      });

      const attackerHandler = async () => ({
        success: true,
        data: 'hacked',
        message: '',
        tips: [],
      });
      site.command('secure-cmd', {
        description: 'attempted override',
        parameters: z.object({}),
        handler: attackerHandler,
      });

      const cmd = site.getCommand('secure-cmd')!;
      expect(cmd.description).toBe('locked command');
      expect(cmd.handler).toBe(lockedHandler);
    });

    it('should not set previousHandler when override is rejected', () => {
      const site = new SiteInstanceImpl({ name: 's' }, mockStorage());

      const handler1 = async () => ({ data: 1 });
      site.command('cmd', {
        description: 'v1',
        parameters: z.object({}),
        override: false,
        handler: handler1,
      });

      site.command('cmd', {
        description: 'v2',
        parameters: z.object({}),
        handler: async () => ({ data: 2 }),
      });

      const cmd = site.getCommand('cmd')!;
      expect(cmd.handler).toBe(handler1);
      expect(cmd.previousHandler).toBeUndefined();
    });
  });

  describe('3. unload override plugin → restore original command', () => {
    it('should restore original command after plugin unload via PluginLoader', async () => {
      const originalDir = trackTmp(
        createTmpPlugin(`
        export default function(cli) {
          cli.registerCommand({
            name: 'data-cmd',
            description: 'original data command',
            handler: async () => ({ success: true, data: 'original', message: '', tips: [] }),
          });
        }
      `)
      );

      await loader.loadPlugin(resolve(originalDir, 'index.ts'), 'original-plugin');
      const originalCmd = loader.getCommand('data-cmd')!;
      expect(originalCmd.description).toBe('original data command');

      const overrideDir = trackTmp(
        createTmpPlugin(`
        export default function(cli) {
          cli.registerCommand({
            name: 'data-cmd',
            description: 'overridden data command',
            handler: async () => ({ success: true, data: 'overridden', message: '', tips: [] }),
          });
        }
      `)
      );

      await loader.loadPlugin(resolve(overrideDir, 'index.ts'), 'override-plugin');
      const overriddenCmd = loader.getCommand('data-cmd')!;
      expect(overriddenCmd.description).toBe('overridden data command');

      await loader.unloadPlugin('override-plugin');
      const restoredCmd = loader.getCommand('data-cmd')!;
      expect(restoredCmd.description).toBe('original data command');
    });

    it('should remove command entirely when no original exists', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
        export default function(cli) {
          cli.registerCommand({
            name: 'only-override-cmd',
            description: 'only version',
            handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
          });
        }
      `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'), 'only-plugin');
      expect(loader.getCommand('only-override-cmd')).toBeDefined();

      await loader.unloadPlugin('only-plugin');
      expect(loader.getCommand('only-override-cmd')).toBeUndefined();
    });
  });

  describe('4. multi-layer override chain', () => {
    it('should chain overrides and restore layer by layer', async () => {
      const site = new SiteInstanceImpl({ name: 'chain-site' }, mockStorage());

      const h0 = async () => ({ success: true, data: { layer: 0 }, message: '', tips: [] });
      site.command('chain', {
        description: 'layer-0',
        parameters: z.object({}),
        handler: h0,
      });

      const h1 = async () => ({ success: true, data: { layer: 1 }, message: '', tips: [] });
      site.command('chain', {
        description: 'layer-1',
        parameters: z.object({}),
        handler: h1,
      });

      expect(site.getOriginalHandler('chain')).toBe(h0);

      const cmd1 = site.getCommand('chain')!;
      expect(cmd1.handler).toBe(h1);
      expect(cmd1.previousHandler).toBe(h0);

      const h2 = async () => ({ success: true, data: { layer: 2 }, message: '', tips: [] });
      site.command('chain', {
        description: 'layer-2',
        parameters: z.object({}),
        handler: h2,
      });

      const cmd2 = site.getCommand('chain')!;
      expect(cmd2.handler).toBe(h2);
      expect(cmd2.previousHandler).toBe(h1);
      expect(site.getOriginalHandler('chain')).toBe(h1);
    });

    it('should handle 3-layer override with getOriginalHandler returning only the most recent previous', async () => {
      const site = new SiteInstanceImpl({ name: 'deep-site' }, mockStorage());
      const callOrder: number[] = [];

      const h0: CommandHandler = async () => {
        callOrder.push(0);
        return { data: 0 };
      };
      const h1: CommandHandler = async () => {
        callOrder.push(1);
        return { data: 1 };
      };
      const h2: CommandHandler = async () => {
        callOrder.push(2);
        return { data: 2 };
      };

      site.command('deep', { description: 'd0', parameters: z.object({}), handler: h0 });
      site.command('deep', { description: 'd1', parameters: z.object({}), handler: h1 });
      site.command('deep', { description: 'd2', parameters: z.object({}), handler: h2 });

      const cmd = site.getCommand('deep')!;
      expect(cmd.handler).toBe(h2);
      expect(cmd.previousHandler).toBe(h1);
    });
  });

  describe('5. parameter passing through override', () => {
    it('should pass modified params to original handler', async () => {
      const site = new SiteInstanceImpl({ name: 'param-site' }, mockStorage());
      let receivedParams: Record<string, unknown> = {};

      const originalHandler: CommandHandler = async (params) => {
        receivedParams = params;
        return { success: true, data: params, message: '', tips: [] };
      };

      site.command('transform', {
        description: 'original',
        parameters: z.object({ count: z.number() }),
        handler: originalHandler,
      });

      const overrideHandler: CommandHandler = async (params, ctx) => {
        const modified = { ...params, count: (params.count as number) * 2, added: true };
        const orig = site.getOriginalHandler('transform');
        return orig
          ? await orig(modified, ctx)
          : { success: false, data: null, message: '', tips: [] };
      };

      site.command('transform', {
        description: 'override',
        parameters: z.object({ count: z.number() }),
        handler: overrideHandler,
      });

      const cmd = site.getCommand('transform')!;
      const result = await cmd.handler({ count: 5 }, mockCtx({ site }));

      expect(receivedParams.count).toBe(10);
      expect(receivedParams.added).toBe(true);
      expect((result as any).data.count).toBe(10);
    });
  });

  describe('6. return value wrapping', () => {
    it('should wrap original result with additional fields', async () => {
      const site = new SiteInstanceImpl({ name: 'wrap-site' }, mockStorage());

      site.command('query', {
        description: 'original query',
        parameters: z.object({}),
        handler: async () => ({ success: true, data: { items: [1, 2, 3] }, message: '', tips: [] }),
      });

      const wrapperHandler: CommandHandler = async (params, ctx) => {
        const orig = site.getOriginalHandler('query');
        const origResult = orig ? await orig(params, ctx) : null;
        const origData = (origResult as any)?.data ?? {};
        return {
          success: true,
          data: {
            ...origData,
            count: origData.items?.length ?? 0,
            timestamp: '2025-01-01',
          },
          message: '',
          tips: ['wrapped with metadata'],
        };
      };

      site.command('query', {
        description: 'wrapped query',
        parameters: z.object({}),
        handler: wrapperHandler,
      });

      const cmd = site.getCommand('query')!;
      const result = await cmd.handler({}, mockCtx({ site }));

      expect((result as any).data.items).toEqual([1, 2, 3]);
      expect((result as any).data.count).toBe(3);
      expect((result as any).data.timestamp).toBe('2025-01-01');
      expect((result as any).tips).toEqual(['wrapped with metadata']);
    });
  });

  describe('PluginLoader-level command override restore', () => {
    it('should restore previous command when overriding plugin unloads', async () => {
      const baseDir = trackTmp(
        createTmpPlugin(`
        export default function(cli) {
          cli.registerCommand({
            name: 'shared-cmd',
            description: 'base version',
            handler: async () => ({ success: true, data: 'base', message: '', tips: [] }),
          });
        }
      `)
      );

      await loader.loadPlugin(resolve(baseDir, 'index.ts'), 'base-plugin');
      expect(loader.getCommand('shared-cmd')!.description).toBe('base version');

      const enhancerDir = trackTmp(
        createTmpPlugin(`
        export default function(cli) {
          cli.registerCommand({
            name: 'shared-cmd',
            description: 'enhanced version',
            handler: async () => ({ success: true, data: 'enhanced', message: '', tips: [] }),
          });
        }
      `)
      );

      await loader.loadPlugin(resolve(enhancerDir, 'index.ts'), 'enhancer-plugin');
      expect(loader.getCommand('shared-cmd')!.description).toBe('enhanced version');

      await loader.unloadPlugin('enhancer-plugin');
      expect(loader.getCommand('shared-cmd')!.description).toBe('base version');
    });

    it('should handle sequential override by two plugins and restore in order', async () => {
      const baseDir = trackTmp(
        createTmpPlugin(`
        export default function(cli) {
          cli.registerCommand({
            name: 'seq-cmd',
            description: 'base',
            handler: async () => ({ success: true, data: 'base', message: '', tips: [] }),
          });
        }
      `)
      );
      const pluginADir = trackTmp(
        createTmpPlugin(`
        export default function(cli) {
          cli.registerCommand({
            name: 'seq-cmd',
            description: 'plugin-a',
            handler: async () => ({ success: true, data: 'a', message: '', tips: [] }),
          });
        }
      `)
      );
      const pluginBDir = trackTmp(
        createTmpPlugin(`
        export default function(cli) {
          cli.registerCommand({
            name: 'seq-cmd',
            description: 'plugin-b',
            handler: async () => ({ success: true, data: 'b', message: '', tips: [] }),
          });
        }
      `)
      );

      await loader.loadPlugin(resolve(baseDir, 'index.ts'), 'base');
      await loader.loadPlugin(resolve(pluginADir, 'index.ts'), 'plugin-a');
      await loader.loadPlugin(resolve(pluginBDir, 'index.ts'), 'plugin-b');
      expect(loader.getCommand('seq-cmd')!.description).toBe('plugin-b');

      await loader.unloadPlugin('plugin-b');
      expect(loader.getCommand('seq-cmd')!.description).toBe('plugin-a');

      await loader.unloadPlugin('plugin-a');
      expect(loader.getCommand('seq-cmd')!.description).toBe('base');
    });
  });
});
