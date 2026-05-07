import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'path';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { PluginLoader, derivePluginId } from '../../src/plugin-loader.js';
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

describe('PluginLoader - coverage tests', () => {
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

  describe('getSiteCommand', () => {
    it('getSiteCommand: should retrieve command by site:cmd format', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerCommand({
              name: 'siteA:cmd1',
              description: 'Command 1',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));

      const cmd = loader.getSiteCommand('siteA', 'cmd1');
      expect(cmd).toBeDefined();
      expect(cmd!.name).toBe('siteA:cmd1');
      expect(cmd!.description).toBe('Command 1');
    });

    it('getSiteCommand: should return undefined for unknown command', () => {
      const cmd = loader.getSiteCommand('unknown', 'cmd');
      expect(cmd).toBeUndefined();
    });

    it('getSiteCommand: should return undefined for unknown site', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerCommand({
              name: 'siteA:cmd1',
              description: 'Command 1',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));

      const cmd = loader.getSiteCommand('unknownSite', 'cmd1');
      expect(cmd).toBeUndefined();
    });

    it('getSiteCommand: should return undefined for unknown command in known site', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerCommand({
              name: 'siteA:cmd1',
              description: 'Command 1',
              handler: async () => ({ success: true, data: {}, message: '', tips: [] }),
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));

      const cmd = loader.getSiteCommand('siteA', 'unknownCmd');
      expect(cmd).toBeUndefined();
    });
  });

  describe('getAllFlags', () => {
    it('getAllFlags: should return all registered flags', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerFlag({ name: 'verbose', short: 'v', type: 'boolean', description: 'Verbose output' });
            cli.registerFlag({ name: 'quiet', short: 'q', type: 'boolean', description: 'Quiet mode' });
            cli.registerFlag({ name: 'config', short: 'c', type: 'string', description: 'Config file' });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));

      const flags = loader.getAllFlags();
      expect(flags).toHaveLength(3);
      expect(flags.map((f) => f.name)).toContain('verbose');
      expect(flags.map((f) => f.name)).toContain('quiet');
      expect(flags.map((f) => f.name)).toContain('config');
    });

    it('getAllFlags: should return empty array when no flags registered', () => {
      const flags = loader.getAllFlags();
      expect(flags).toEqual([]);
    });

    it('getAllFlags: should return flags from multiple plugins', async () => {
      const dir1 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerFlag({ name: 'flag1', short: 'f1', type: 'boolean', description: 'Flag 1' });
          }
        `)
      );
      const dir2 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerFlag({ name: 'flag2', short: 'f2', type: 'boolean', description: 'Flag 2' });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir1, 'index.ts'));
      await loader.loadPlugin(resolve(dir2, 'index.ts'));

      const flags = loader.getAllFlags();
      expect(flags).toHaveLength(2);
      expect(flags.map((f) => f.name)).toContain('flag1');
      expect(flags.map((f) => f.name)).toContain('flag2');
    });
  });

  describe('getAllTools', () => {
    it('getAllTools: should return all registered tools', async () => {
      const dir = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerTool({
              name: 'tool1',
              description: 'Tool 1',
              execute: async () => 'result1',
            });
            cli.registerTool({
              name: 'tool2',
              description: 'Tool 2',
              execute: async () => 'result2',
            });
            cli.registerTool({
              name: 'tool3',
              description: 'Tool 3',
              execute: async () => 'result3',
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir, 'index.ts'));

      const tools = loader.getAllTools();
      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name)).toContain('tool1');
      expect(tools.map((t) => t.name)).toContain('tool2');
      expect(tools.map((t) => t.name)).toContain('tool3');
    });

    it('getAllTools: should return empty array when no tools registered', () => {
      const tools = loader.getAllTools();
      expect(tools).toEqual([]);
    });

    it('getAllTools: should return tools from multiple plugins', async () => {
      const dir1 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerTool({
              name: 'plugin1-tool',
              description: 'Tool from plugin 1',
              execute: async () => 'result1',
            });
          }
        `)
      );
      const dir2 = trackTmp(
        createTmpPlugin(`
          export default function(cli) {
            cli.registerTool({
              name: 'plugin2-tool',
              description: 'Tool from plugin 2',
              execute: async () => 'result2',
            });
          }
        `)
      );

      await loader.loadPlugin(resolve(dir1, 'index.ts'));
      await loader.loadPlugin(resolve(dir2, 'index.ts'));

      const tools = loader.getAllTools();
      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toContain('plugin1-tool');
      expect(tools.map((t) => t.name)).toContain('plugin2-tool');
    });
  });

  describe('derivePluginId', () => {
    it('derivePluginId: should use parent directory name for index.ts entry', () => {
      // 测试 base/index.ts 路径 → 应该提取 'base' 而非 'index'
      const id = derivePluginId('/path/to/base/index.ts');
      expect(id).toBe('base');
    });

    it('derivePluginId: should extract basename for non-index files', () => {
      const id = derivePluginId('/path/to/my-plugin.ts');
      expect(id).toBe('my-plugin');
    });

    it('derivePluginId: should handle .js extensions', () => {
      const id = derivePluginId('/path/to/plugin.js');
      expect(id).toBe('plugin');
    });

    it('derivePluginId: should handle nested index.ts paths', () => {
      const id = derivePluginId('/very/deep/nested/path/to/base/index.ts');
      expect(id).toBe('base');
    });

    it('derivePluginId: should use basename for index.js as well', () => {
      const id = derivePluginId('/path/to/base/index.js');
      expect(id).toBe('base');
    });
  });
});
