import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'path';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { PluginLoader, readPluginMeta } from '../../src/plugin-loader.js';
import type { Core, CoreConfig } from '../../src/core.js';

function createMockCore(overrides?: Partial<CoreConfig>): Core {
  const tmpStorage = mkdtempSync(resolve(tmpdir(), 'xcli-scan-test-'));
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

function makePlugin(
  dir: string,
  opts?: {
    name?: string;
    version?: string;
    description?: string;
    xcli?: Record<string, unknown>;
    code?: string;
  }
) {
  mkdirSync(dir, { recursive: true });
  const pkg: Record<string, unknown> = {
    name: opts?.name ?? 'test-plugin',
    version: opts?.version ?? '1.0.0',
    type: 'module',
  };
  if (opts?.description) pkg.description = opts.description;
  if (opts?.xcli) pkg.xcli = opts.xcli;
  writeFileSync(resolve(dir, 'package.json'), JSON.stringify(pkg));
  writeFileSync(
    resolve(dir, 'index.ts'),
    opts?.code ??
      `export default function(xcli: any) { const s = xcli.createSite({ name: '${opts?.name ?? 'test-plugin'}' }); }`
  );
}

describe('scanAndLoad', () => {
  let loader: PluginLoader;
  let tmpDirs: string[] = [];

  beforeEach(() => {
    const core = createMockCore();
    loader = new PluginLoader(core);
  });

  afterEach(async () => {
    await loader.unloadAll();
    for (const d of tmpDirs) {
      try {
        rmSync(d, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    tmpDirs = [];
  });

  function tmpDir(): string {
    const d = mkdtempSync(resolve(tmpdir(), 'xcli-scan-'));
    tmpDirs.push(d);
    return d;
  }

  it('returns empty result with empty dirs array', async () => {
    const result = await loader.scanAndLoad([]);
    expect(result.loaded).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it('skips dot-prefixed directories', async () => {
    const dir = tmpDir();
    mkdirSync(resolve(dir, '.hidden'));
    writeFileSync(resolve(dir, '.hidden', 'index.ts'), 'export default () => {}');
    writeFileSync(resolve(dir, '.hidden', 'package.json'), '{"name":"hidden"}');

    const normalDir = resolve(dir, 'normal');
    makePlugin(normalDir, { name: 'normal' });

    const result = await loader.scanAndLoad([dir]);
    expect(result.loaded).toHaveLength(1);
    expect(result.loaded[0]).toContain('normal');
  });

  it('reports failed plugins without blocking others', async () => {
    const dir = tmpDir();

    const goodDir = resolve(dir, 'good');
    makePlugin(goodDir, { name: 'good' });

    const badDir = resolve(dir, 'bad');
    mkdirSync(badDir, { recursive: true });
    writeFileSync(resolve(badDir, 'package.json'), '{"name":"bad"}');
    writeFileSync(resolve(badDir, 'index.ts'), 'throw new Error("boom")');

    const result = await loader.scanAndLoad([dir]);
    expect(result.loaded).toHaveLength(1);
    expect(result.loaded[0]).toContain('good');
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].path).toContain('bad');
  });

  it('respects first-wins priority (skips duplicate names)', async () => {
    const dir1 = tmpDir();
    const dir2 = tmpDir();

    makePlugin(resolve(dir1, 'plug-a'), {
      name: 'duplicate-name',
      code: `export default function(xcli: any) { xcli.createSite({ name: 'first' }); }`,
    });
    makePlugin(resolve(dir2, 'plug-b'), {
      name: 'duplicate-name',
      code: `export default function(xcli: any) { xcli.createSite({ name: 'second' }); }`,
    });

    const result = await loader.scanAndLoad([dir1, dir2], { priority: 'first-wins' });
    expect(result.loaded).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.loaded[0]).toContain('plug-a');
  });
});

describe('readPluginMeta', () => {
  let tmpDirs: string[] = [];

  afterEach(() => {
    for (const d of tmpDirs) {
      try {
        rmSync(d, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    tmpDirs = [];
  });

  function tmpDir(): string {
    const d = mkdtempSync(resolve(tmpdir(), 'xcli-meta-'));
    tmpDirs.push(d);
    return d;
  }

  it('reads from package.json xcli.name', () => {
    const dir = resolve(tmpDir(), 'my-plugin');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, 'package.json'),
      JSON.stringify({
        name: 'pkg-name',
        version: '2.0.0',
        xcli: { name: 'xcli-name' },
      })
    );
    const meta = readPluginMeta(dir);
    expect(meta).not.toBeNull();
    expect(meta!.name).toBe('xcli-name');
  });

  it('falls back to package.json name', () => {
    const dir = resolve(tmpDir(), 'my-plugin');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, 'package.json'),
      JSON.stringify({ name: 'pkg-name', version: '1.0.0' })
    );
    const meta = readPluginMeta(dir);
    expect(meta).not.toBeNull();
    expect(meta!.name).toBe('pkg-name');
  });

  it('returns null for missing package.json', () => {
    const dir = tmpDir();
    const meta = readPluginMeta(resolve(dir, 'nonexistent'));
    expect(meta).toBeNull();
  });

  it('reads commands from xcli.commands', () => {
    const dir = resolve(tmpDir(), 'my-plugin');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, 'package.json'),
      JSON.stringify({
        name: 'cmd-plugin',
        version: '1.0.0',
        xcli: { commands: ['scrape', 'verify'] },
      })
    );
    const meta = readPluginMeta(dir);
    expect(meta).not.toBeNull();
    expect(meta!.commands).toEqual(['scrape', 'verify']);
  });
});
