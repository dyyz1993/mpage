import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'os';
import { PluginLoader } from '../../src/plugin-loader.js';
import { LocalInstaller } from '../../src/plugin/installers/local-installer.js';
import { PluginInstallerRegistry } from '../../src/plugin/plugin-installer-registry.js';
import type { Core, CoreConfig } from '../../src/core.js';

let tempDir: string;
let pluginsDir: string;
let storageDir: string;
let loader: PluginLoader;
let registry: PluginInstallerRegistry;
let tmpDirs: string[] = [];

function createMockCore(): Core {
  const cfg: CoreConfig = {
    name: 'test-cli',
    version: '0.0.1',
    description: 'test',
    configDirName: '.test-cli',
    envPrefix: 'TEST_CLI',
    pluginDirs: [],
    pluginPackageName: '@dyyz1993/xcli-core',
  };
  return {
    config: cfg,
    configDir: storageDir,
    sessionDir: resolve(storageDir, 'sessions'),
    storageDir,
  } as Core;
}

function createPluginDir(
  base: string,
  name: string,
  indexContent: string,
  pkgJson?: Record<string, string>
): string {
  const dir = resolve(base, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.ts'), indexContent, 'utf-8');
  writeFileSync(
    resolve(dir, 'package.json'),
    JSON.stringify(pkgJson ?? { name, version: '1.0.0' }),
    'utf-8'
  );
  return dir;
}

function trackTmp(dir: string): string {
  tmpDirs.push(dir);
  return dir;
}

beforeEach(() => {
  tempDir = mkdtempSync(resolve(tmpdir(), 'mpage-e2e-test-'));
  pluginsDir = resolve(tempDir, 'plugins');
  storageDir = resolve(tempDir, 'storage');
  mkdirSync(pluginsDir, { recursive: true });
  mkdirSync(storageDir, { recursive: true });
});

afterEach(async () => {
  if (loader) {
    await loader.unloadAll().catch(() => {});
  }
  for (const dir of tmpDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
  tmpDirs = [];
  rmSync(tempDir, { recursive: true, force: true });
});

describe('Plugin E2E: single plugin full lifecycle', () => {
  it('install → listAll → loadPlugin → getCommand → execute handler → unmount → uninstall', async () => {
    const pluginPath = createPluginDir(
      pluginsDir,
      'lifecycle-plugin',
      `
      export default function(cli) {
        const site = cli.createSite({ name: 'lifecycle-plugin', url: 'https://example.com' });
        site.command('echo', {
          description: 'Echo back the input',
          handler: async (params) => ({
            success: true,
            data: { echoed: params.text ?? 'default' },
            message: '',
            tips: ['echo executed'],
          }),
        });
      }
    `
    );

    const installer = new LocalInstaller(pluginsDir);
    const installed = await installer.install(pluginPath);
    expect(installed.id).toBe('local:lifecycle-plugin');
    expect(installed.type).toBe('local');
    expect(installed.path).toBe(pluginPath);

    registry = new PluginInstallerRegistry({ pluginsDir });
    const allListed = await registry.listAll();
    const found = allListed.find((p) => p.name === 'lifecycle-plugin');
    expect(found).toBeDefined();
    expect(found!.id).toBe('local:lifecycle-plugin');

    const core = createMockCore();
    loader = new PluginLoader(core);
    const instance = await loader.loadPlugin(resolve(pluginPath, 'index.ts'));
    expect(instance.status).toBe('loaded');
    expect(instance.loaded).toBe(true);

    const site = loader.getSite('lifecycle-plugin');
    expect(site).toBeDefined();
    const cmd = site!.getCommand('echo');
    expect(cmd).not.toBeNull();
    expect(cmd!.name).toBe('echo');
    expect(cmd!.description).toBe('Echo back the input');

    const result = await cmd!.handler(
      { text: 'hello' },
      {
        args: [],
        options: {},
        cwd: '/tmp',
        storage: site!.getStorage(),
        output: { mode: 'text', showTips: false, color: false, emoji: false },
        error: () => {},
        config: {},
        site: site!,
        cliName: 'test-cli',
      }
    );
    expect(result).toEqual({
      success: true,
      data: { echoed: 'hello' },
      message: '',
      tips: ['echo executed'],
    });

    await instance.unmount();
    expect(instance.loaded).toBe(false);
    expect(instance.status).toBe('unloaded');
    expect(loader.getSite('lifecycle-plugin')).toBeUndefined();

    await registry.uninstall('local:lifecycle-plugin');
    expect(registry.getInstaller('local')).toBeDefined();
  });
});

describe('Plugin E2E: multiple plugins', () => {
  it('install 2 plugins → load both → execute both → uninstall one → other unaffected', async () => {
    const pluginAPath = createPluginDir(
      pluginsDir,
      'plugin-alpha',
      `
      export default function(cli) {
        const site = cli.createSite({ name: 'alpha', url: 'https://alpha.com' });
        site.command('alpha-cmd', {
          description: 'Alpha command',
          handler: async () => ({
            success: true,
            data: { source: 'alpha' },
            message: '',
            tips: ['alpha executed'],
          }),
        });
      }
    `
    );

    const pluginBPath = createPluginDir(
      pluginsDir,
      'plugin-beta',
      `
      export default function(cli) {
        const site = cli.createSite({ name: 'beta', url: 'https://beta.com' });
        site.command('beta-cmd', {
          description: 'Beta command',
          handler: async () => ({
            success: true,
            data: { source: 'beta' },
            message: '',
            tips: ['beta executed'],
          }),
        });
      }
    `
    );

    const installer = new LocalInstaller(pluginsDir);
    const instA = await installer.install(pluginAPath);
    const instB = await installer.install(pluginBPath);
    expect(instA.id).toBe('local:plugin-alpha');
    expect(instB.id).toBe('local:plugin-beta');

    registry = new PluginInstallerRegistry({ pluginsDir });
    const listed = await registry.listAll();
    expect(listed).toHaveLength(2);
    const names = listed.map((p) => p.name).sort();
    expect(names).toEqual(['plugin-alpha', 'plugin-beta']);

    const core = createMockCore();
    loader = new PluginLoader(core);

    const loadedA = await loader.loadPlugin(resolve(pluginAPath, 'index.ts'), 'alpha');
    const loadedB = await loader.loadPlugin(resolve(pluginBPath, 'index.ts'), 'beta');
    expect(loadedA.status).toBe('loaded');
    expect(loadedB.status).toBe('loaded');

    const siteA = loader.getSite('alpha');
    const siteB = loader.getSite('beta');
    expect(siteA).toBeDefined();
    expect(siteB).toBeDefined();

    const cmdA = siteA!.getCommand('alpha-cmd');
    const cmdB = siteB!.getCommand('beta-cmd');
    expect(cmdA).not.toBeNull();
    expect(cmdB).not.toBeNull();

    const resultA = await cmdA!.handler(
      {},
      {
        args: [],
        options: {},
        cwd: '/tmp',
        storage: siteA!.getStorage(),
        output: { mode: 'text', showTips: false, color: false, emoji: false },
        error: () => {},
        config: {},
        site: siteA!,
        cliName: 'test-cli',
      }
    );
    expect(resultA).toHaveProperty('data.source', 'alpha');

    const resultB = await cmdB!.handler(
      {},
      {
        args: [],
        options: {},
        cwd: '/tmp',
        storage: siteB!.getStorage(),
        output: { mode: 'text', showTips: false, color: false, emoji: false },
        error: () => {},
        config: {},
        site: siteB!,
        cliName: 'test-cli',
      }
    );
    expect(resultB).toHaveProperty('data.source', 'beta');

    await loader.unloadPlugin('alpha');
    expect(loader.getSite('alpha')).toBeUndefined();
    expect(loader.getSite('beta')).toBeDefined();
    expect(loader.getPlugin('beta')!.loaded).toBe(true);

    const cmdBAfter = loader.getSite('beta')!.getCommand('beta-cmd');
    expect(cmdBAfter).not.toBeNull();

    const resultB2 = await cmdBAfter!.handler(
      {},
      {
        args: [],
        options: {},
        cwd: '/tmp',
        storage: loader.getSite('beta')!.getStorage(),
        output: { mode: 'text', showTips: false, color: false, emoji: false },
        error: () => {},
        config: {},
        site: loader.getSite('beta')!,
        cliName: 'test-cli',
      }
    );
    expect(resultB2).toHaveProperty('data.source', 'beta');
  });
});

describe('Plugin E2E: error recovery', () => {
  it('broken plugin does not affect normal plugin', async () => {
    const goodPath = createPluginDir(
      pluginsDir,
      'good-plugin',
      `
      export default function(cli) {
        const site = cli.createSite({ name: 'good', url: 'https://good.com' });
        site.command('good-cmd', {
          description: 'Good command',
          handler: async () => ({
            success: true,
            data: { status: 'ok' },
            message: '',
            tips: ['good executed'],
          }),
        });
      }
    `
    );

    const badPath = createPluginDir(
      pluginsDir,
      'bad-plugin',
      `
      export default function(cli) {
        throw new Error('intentional plugin error');
      }
    `
    );

    const core = createMockCore();
    loader = new PluginLoader(core);

    const goodInstance = await loader.loadPlugin(resolve(goodPath, 'index.ts'), 'good');
    expect(goodInstance.status).toBe('loaded');

    await expect(loader.loadPlugin(resolve(badPath, 'index.ts'), 'bad')).rejects.toThrow(
      'intentional plugin error'
    );

    const badPlugin = loader.getPlugin('bad');
    expect(badPlugin).toBeDefined();
    expect(badPlugin!.status).toBe('error');
    expect(badPlugin!.error).toBeInstanceOf(Error);

    const goodSite = loader.getSite('good');
    expect(goodSite).toBeDefined();
    const cmd = goodSite!.getCommand('good-cmd');
    expect(cmd).not.toBeNull();

    const result = await cmd!.handler(
      {},
      {
        args: [],
        options: {},
        cwd: '/tmp',
        storage: goodSite!.getStorage(),
        output: { mode: 'text', showTips: false, color: false, emoji: false },
        error: () => {},
        config: {},
        site: goodSite!,
        cliName: 'test-cli',
      }
    );
    expect(result).toHaveProperty('data.status', 'ok');

    expect(loader.getLoadedPlugins().length).toBeGreaterThanOrEqual(1);
    const loadedIds = loader.getLoadedPlugins().map((p) => p.id);
    expect(loadedIds).toContain('good');
  });

  it('syntax-error plugin gets error status without crashing loader', async () => {
    const brokenPath = resolve(__dirname, '..', 'fixtures', 'broken-plugin', 'index.ts');

    const core = createMockCore();
    loader = new PluginLoader(core);

    await expect(loader.loadPlugin(brokenPath)).rejects.toThrow();
    const broken = loader.getPlugin('broken-plugin');
    expect(broken).toBeDefined();
    expect(broken!.status).toBe('error');

    const goodPath = createPluginDir(
      pluginsDir,
      'after-broken',
      `
      export default function(cli) {
        cli.createSite({ name: 'after-broken', url: 'https://after.com' });
      }
    `
    );
    const afterInstance = await loader.loadPlugin(resolve(goodPath, 'index.ts'), 'after-broken');
    expect(afterInstance.status).toBe('loaded');
    expect(loader.getSite('after-broken')).toBeDefined();
  });
});

describe('Plugin E2E: loadFromFunction integration', () => {
  it('loadFromFunction + .ts plugin coexist', async () => {
    const pluginPath = createPluginDir(
      pluginsDir,
      'ts-coexist',
      `
      export default function(cli) {
        const site = cli.createSite({ name: 'ts-coexist', url: 'https://ts.com' });
        site.command('ts-cmd', {
          description: 'TS command',
          handler: async () => ({ success: true, data: { from: 'ts' }, message: '', tips: [] }),
        });
      }
    `
    );

    const core = createMockCore();
    loader = new PluginLoader(core);

    await loader.loadFromFunction((cli) => {
      const site = cli.createSite({ name: 'fn-coexist', url: 'https://fn.com' });
      site.command('fn-cmd', {
        description: 'FN command',
        handler: async () => ({ success: true, data: { from: 'fn' }, message: '', tips: [] }),
      });
    });

    await loader.loadPlugin(resolve(pluginPath, 'index.ts'), 'ts-coexist');

    expect(loader.getSite('fn-coexist')).toBeDefined();
    expect(loader.getSite('ts-coexist')).toBeDefined();

    const fnCmd = loader.getSite('fn-coexist')!.getCommand('fn-cmd');
    const tsCmd = loader.getSite('ts-coexist')!.getCommand('ts-cmd');
    expect(fnCmd).not.toBeNull();
    expect(tsCmd).not.toBeNull();

    const fnResult = await fnCmd!.handler(
      {},
      {
        args: [],
        options: {},
        cwd: '/tmp',
        storage: loader.getSite('fn-coexist')!.getStorage(),
        output: { mode: 'text', showTips: false, color: false, emoji: false },
        error: () => {},
        config: {},
        site: loader.getSite('fn-coexist')!,
        cliName: 'test-cli',
      }
    );
    expect(fnResult).toHaveProperty('data.from', 'fn');
  });
});

describe('Plugin E2E: storage per plugin', () => {
  it('each plugin gets isolated storage that persists across handler calls', async () => {
    const pluginPath = createPluginDir(
      pluginsDir,
      'storage-plugin',
      `
      export default function(cli) {
        const site = cli.createSite({ name: 'storage-plugin', url: 'https://storage.com' });
        site.command('save', {
          description: 'Save data',
          handler: async (params, ctx) => {
            await ctx.storage.set('saved-data', params.value);
            return { success: true, data: { saved: true }, message: '', tips: ['saved'] };
          },
        });
        site.command('load', {
          description: 'Load data',
          handler: async (params, ctx) => {
            const val = await ctx.storage.get('saved-data');
            return { success: true, data: { loaded: val }, message: '', tips: ['loaded'] };
          },
        });
      }
    `
    );

    const core = createMockCore();
    loader = new PluginLoader(core);
    await loader.loadPlugin(resolve(pluginPath, 'index.ts'), 'storage-plugin');

    const site = loader.getSite('storage-plugin')!;
    const storage = site.getStorage();
    const ctx = {
      args: [],
      options: {},
      cwd: '/tmp',
      storage,
      output: { mode: 'text', showTips: false, color: false, emoji: false },
      error: () => {},
      config: {},
      site,
      cliName: 'test-cli',
    };

    const saveCmd = site.getCommand('save')!;
    const loadCmd = site.getCommand('load')!;

    await saveCmd.handler({ value: 'test-data-42' }, ctx);
    const result = await loadCmd.handler({}, ctx);
    expect(result).toHaveProperty('data.loaded', 'test-data-42');
  });
});
