import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

import { LocalInstaller } from '../../src/plugin/installers/local-installer.js';
// NpmInstaller is exercised in `npm-installer.test.ts` (uses fetch + tarball).
import { GitInstaller } from '../../src/plugin/installers/git-installer.js';
import { UrlInstaller } from '../../src/plugin/installers/url-installer.js';
import { BuiltinInstaller } from '../../src/plugin/installers/builtin-installer.js';
import { PluginInstallerRegistry } from '../../src/plugin/plugin-installer-registry.js';
import type { PluginInstance, PluginInstaller } from '../../src/plugin/plugin-installer.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

let tempDir: string;

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'mpage-test-'));
}

function createPluginDir(
  base: string,
  name: string,
  opts?: { entry?: string; pkgJson?: Record<string, string> }
): string {
  const pluginDir = join(base, name);
  mkdirSync(pluginDir, { recursive: true });
  const entry = opts?.entry ?? 'index.ts';
  writeFileSync(join(pluginDir, entry), '// plugin entry', 'utf-8');
  if (opts?.pkgJson) {
    writeFileSync(join(pluginDir, 'package.json'), JSON.stringify(opts.pkgJson), 'utf-8');
  }
  return pluginDir;
}

beforeEach(() => {
  tempDir = createTempDir();
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ─── LocalInstaller ────────────────────────────────────────────────

describe('LocalInstaller', () => {
  it('install: installs from a valid local directory with index.ts', async () => {
    const pluginPath = createPluginDir(tempDir, 'my-plugin', {
      pkgJson: { name: 'my-plugin', version: '1.2.0' },
    });
    const installer = new LocalInstaller(tempDir);

    const result = await installer.install(pluginPath);

    expect(result.type).toBe('local');
    expect(result.id).toBe('local:my-plugin');
    expect(result.name).toBe('my-plugin');
    expect(result.version).toBe('1.2.0');
    expect(result.path).toBe(pluginPath);
    expect(result.source).toBe(pluginPath);
    expect(typeof result.installedAt).toBe('number');
  });

  it('install: throws when directory does not exist', async () => {
    const installer = new LocalInstaller(tempDir);
    await expect(installer.install(join(tempDir, 'no-such-dir'))).rejects.toThrow(
      'Plugin directory not found'
    );
  });

  it('install: throws when entry file is missing', async () => {
    const pluginDir = join(tempDir, 'empty-plugin');
    mkdirSync(pluginDir, { recursive: true });
    const installer = new LocalInstaller(tempDir);

    await expect(installer.install(pluginDir)).rejects.toThrow('Plugin entry not found');
  });

  it('install: uses directory name as name when no package.json', async () => {
    const pluginPath = createPluginDir(tempDir, 'no-pkg-plugin');
    const installer = new LocalInstaller(tempDir);

    const result = await installer.install(pluginPath);

    expect(result.name).toBe('no-pkg-plugin');
    expect(result.version).toBe('0.0.0');
  });

  it('install: installs from directory with index.js instead of index.ts', async () => {
    const pluginPath = createPluginDir(tempDir, 'js-plugin', { entry: 'index.js' });
    const installer = new LocalInstaller(tempDir);

    const result = await installer.install(pluginPath);

    expect(result.id).toBe('local:js-plugin');
    expect(result.name).toBe('js-plugin');
  });

  it('install: resolves relative path against pluginsDir', async () => {
    const pluginPath = createPluginDir(tempDir, 'rel-plugin');
    const installer = new LocalInstaller(tempDir);

    const result = await installer.install('rel-plugin');

    expect(result.path).toBe(pluginPath);
    expect(result.id).toBe('local:rel-plugin');
  });

  it('uninstall: does not delete files for local plugins', async () => {
    const pluginPath = createPluginDir(tempDir, 'stay-plugin');
    const installer = new LocalInstaller(tempDir);

    await installer.uninstall('local:stay-plugin');

    expect(existsSync(pluginPath)).toBe(true);
  });

  it('uninstall: ignores non-local plugin ids', async () => {
    const pluginPath = createPluginDir(tempDir, 'some-plugin');
    const installer = new LocalInstaller(tempDir);

    await expect(installer.uninstall('npm:some-plugin')).resolves.toBeUndefined();
    expect(existsSync(pluginPath)).toBe(true);
  });

  it('list: returns all valid plugins from pluginsDir', async () => {
    createPluginDir(tempDir, 'plugin-a', {
      pkgJson: { name: 'plugin-a', version: '1.0.0' },
    });
    createPluginDir(tempDir, 'plugin-b', {
      pkgJson: { name: 'plugin-b', version: '2.0.0' },
    });
    const installer = new LocalInstaller(tempDir);

    const list = await installer.list();

    expect(list).toHaveLength(2);
    const names = list.map((p) => p.name).sort();
    expect(names).toStrictEqual(['plugin-a', 'plugin-b']);
  });

  it('list: skips directories starting with _ or .', async () => {
    createPluginDir(tempDir, 'valid-plugin');
    createPluginDir(tempDir, '_hidden');
    createPluginDir(tempDir, '.dot-dir');
    const installer = new LocalInstaller(tempDir);

    const list = await installer.list();

    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('valid-plugin');
  });

  it('list: returns empty array when pluginsDir does not exist', async () => {
    const installer = new LocalInstaller(join(tempDir, 'nonexistent'));

    const list = await installer.list();

    expect(list).toStrictEqual([]);
  });

  it('list: skips directories without entry files', async () => {
    createPluginDir(tempDir, 'good-plugin');
    const badDir = join(tempDir, 'bad-plugin');
    mkdirSync(badDir, { recursive: true });
    const installer = new LocalInstaller(tempDir);

    const list = await installer.list();

    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('good-plugin');
  });

  it('update: re-validates and returns updated instance', async () => {
    createPluginDir(tempDir, 'up-plugin', {
      pkgJson: { name: 'up-plugin', version: '3.0.0' },
    });
    const installer = new LocalInstaller(tempDir);

    const result = await installer.update('local:up-plugin');

    expect(result.id).toBe('local:up-plugin');
    expect(result.version).toBe('3.0.0');
  });
});

// ─── NpmInstaller tests moved to `npm-installer.test.ts` ────────────

describe('GitInstaller', () => {
  let mockExec: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExec = vi.mocked(execSync);
  });

  it('install: constructs correct git clone command', async () => {
    mockExec.mockReturnValue('');

    const installer = new GitInstaller(tempDir);
    await installer.install('https://github.com/user/my-plugin');

    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('git clone https://github.com/user/my-plugin.git'),
      expect.any(Object)
    );
  });

  it('install: converts github: short format to full URL', async () => {
    mockExec.mockReturnValue('');

    const installer = new GitInstaller(tempDir);
    await installer.install('github:user/short-plugin');

    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('https://github.com/user/short-plugin.git'),
      expect.any(Object)
    );
  });

  it('install: appends .git suffix if missing', async () => {
    mockExec.mockReturnValue('');

    const installer = new GitInstaller(tempDir);
    await installer.install('https://github.com/user/no-dot-git');

    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('no-dot-git.git'),
      expect.any(Object)
    );
  });

  it('install: throws when target dir already exists without force', async () => {
    const existingDir = join(tempDir, 'existing-plugin');
    mkdirSync(existingDir, { recursive: true });

    const installer = new GitInstaller(tempDir);
    await expect(installer.install('https://github.com/user/existing-plugin')).rejects.toThrow(
      'Plugin already exists'
    );
  });

  it('install: force removes existing dir before clone', async () => {
    mockExec.mockReturnValue('');
    const existingDir = join(tempDir, 'force-plugin');
    mkdirSync(existingDir, { recursive: true });
    writeFileSync(join(existingDir, 'old-file.txt'), 'old', 'utf-8');

    const installer = new GitInstaller(tempDir);
    await installer.install('https://github.com/user/force-plugin', { force: true });

    expect(existsSync(join(existingDir, 'old-file.txt'))).toBe(false);
  });

  it('install: reads package.json from cloned repo', async () => {
    mockExec.mockImplementation((_cmd: string) => {
      const pluginDir = join(tempDir, 'pkg-plugin');
      if (!existsSync(pluginDir)) mkdirSync(pluginDir, { recursive: true });
      writeFileSync(
        join(pluginDir, 'package.json'),
        JSON.stringify({ name: 'pkg-plugin', version: '4.0.0' })
      );
      return '';
    });

    const installer = new GitInstaller(tempDir);
    const result = await installer.install('https://github.com/user/pkg-plugin');

    expect(result.name).toBe('pkg-plugin');
    expect(result.version).toBe('4.0.0');
  });

  it('install: throws on clone failure', async () => {
    mockExec.mockImplementation(() => {
      throw new Error('clone failed');
    });

    const installer = new GitInstaller(tempDir);
    await expect(installer.install('https://github.com/user/fail-repo')).rejects.toThrow(
      'Failed to clone'
    );
  });

  it('uninstall: removes the plugin directory', async () => {
    const pluginDir = join(tempDir, 'rm-plugin');
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(join(pluginDir, 'index.ts'), '// entry', 'utf-8');

    const installer = new GitInstaller(tempDir);
    await installer.uninstall('git:rm-plugin');

    expect(existsSync(pluginDir)).toBe(false);
  });

  it('uninstall: does nothing when directory does not exist', async () => {
    const installer = new GitInstaller(tempDir);
    await expect(installer.uninstall('git:nonexistent')).resolves.toBeUndefined();
  });

  it('update: executes git pull in target directory', async () => {
    mockExec.mockImplementation((cmd: string) => {
      if (cmd.includes('remote get-url')) return 'https://github.com/user/up-plugin.git\n';
      return '';
    });

    const pluginDir = join(tempDir, 'up-plugin');
    mkdirSync(pluginDir, { recursive: true });
    mkdirSync(join(pluginDir, '.git'), { recursive: true });
    writeFileSync(
      join(pluginDir, 'package.json'),
      JSON.stringify({ name: 'up-plugin', version: '2.0.0' })
    );

    const installer = new GitInstaller(tempDir);
    const result = await installer.update('git:up-plugin');

    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('git -C'), expect.any(Object));
    expect(result.id).toBe('git:up-plugin');
    expect(result.source).toBe('https://github.com/user/up-plugin.git');
  });

  it('list: returns plugins from directories containing .git', async () => {
    const pluginDir = join(tempDir, 'list-plugin');
    mkdirSync(pluginDir, { recursive: true });
    mkdirSync(join(pluginDir, '.git'), { recursive: true });
    writeFileSync(
      join(pluginDir, 'package.json'),
      JSON.stringify({ name: 'list-plugin', version: '1.0.0' })
    );

    const installer = new GitInstaller(tempDir);
    const list = await installer.list();

    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('git:list-plugin');
    expect(list[0].type).toBe('git');
  });

  it('list: skips directories without .git', async () => {
    const pluginDir = join(tempDir, 'no-git-plugin');
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(join(pluginDir, 'package.json'), '{}');

    const installer = new GitInstaller(tempDir);
    const list = await installer.list();

    expect(list).toStrictEqual([]);
  });

  it('list: returns empty when pluginsDir does not exist', async () => {
    const installer = new GitInstaller(join(tempDir, 'no-dir'));
    const list = await installer.list();
    expect(list).toStrictEqual([]);
  });
});

// ─── UrlInstaller ──────────────────────────────────────────────────

describe('UrlInstaller', () => {
  it('install: downloads URL content and saves to file', async () => {
    const content = 'export default function() {}';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(content),
      })
    );

    const installer = new UrlInstaller(tempDir);
    const result = await installer.install('https://example.com/plugins/my-plugin.js');

    expect(result.id).toBe('url:my-plugin');
    expect(result.type).toBe('url');
    expect(result.source).toBe('https://example.com/plugins/my-plugin.js');
    expect(existsSync(join(tempDir, 'url-plugins', 'my-plugin.js'))).toBe(true);
  });

  it('install: saves .meta.json alongside the plugin file', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('// plugin'),
      })
    );

    const installer = new UrlInstaller(tempDir);
    await installer.install('https://example.com/plugins/meta-plugin.ts');

    const metaPath = join(tempDir, 'url-plugins', 'meta-plugin.meta.json');
    expect(existsSync(metaPath)).toBe(true);
    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    expect(meta.source).toBe('https://example.com/plugins/meta-plugin.ts');
  });

  it('install: throws on non-200 HTTP response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
    );

    const installer = new UrlInstaller(tempDir);
    await expect(installer.install('https://example.com/not-found.js')).rejects.toThrow(
      'Failed to download plugin from'
    );
  });

  it('install: throws on invalid URL', async () => {
    const installer = new UrlInstaller(tempDir);
    await expect(installer.install('not-a-valid-url')).rejects.toThrow();
  });

  it('install: uses date as version', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('// plugin'),
      })
    );

    const installer = new UrlInstaller(tempDir);
    const result = await installer.install('https://example.com/plugins/ver-plugin.mjs');

    expect(result.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uninstall: removes plugin file and meta', async () => {
    const urlDir = join(tempDir, 'url-plugins');
    mkdirSync(urlDir, { recursive: true });
    writeFileSync(join(urlDir, 'del-plugin.js'), '// code', 'utf-8');
    writeFileSync(
      join(urlDir, 'del-plugin.meta.json'),
      JSON.stringify({ source: 'https://example.com/del.js' }),
      'utf-8'
    );

    const installer = new UrlInstaller(tempDir);
    await installer.uninstall('url:del-plugin');

    expect(existsSync(join(urlDir, 'del-plugin.js'))).toBe(false);
    expect(existsSync(join(urlDir, 'del-plugin.meta.json'))).toBe(false);
  });

  it('update: re-downloads from stored meta source', async () => {
    const urlDir = join(tempDir, 'url-plugins');
    mkdirSync(urlDir, { recursive: true });
    writeFileSync(
      join(urlDir, 'upd-plugin.meta.json'),
      JSON.stringify({ source: 'https://example.com/plugins/upd-plugin.js' }),
      'utf-8'
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('// updated code'),
      })
    );

    const installer = new UrlInstaller(tempDir);
    const result = await installer.update('url:upd-plugin');

    expect(result.id).toBe('url:upd-plugin');
    expect(result.source).toBe('https://example.com/plugins/upd-plugin.js');
  });

  it('update: throws when meta file is missing', async () => {
    const installer = new UrlInstaller(tempDir);
    await expect(installer.update('url:no-meta')).rejects.toThrow(
      'URL plugin update requires stored source URL'
    );
  });

  it('list: scans url-plugins directory for .js/.ts/.mjs files', async () => {
    const urlDir = join(tempDir, 'url-plugins');
    mkdirSync(urlDir, { recursive: true });
    writeFileSync(join(urlDir, 'a.js'), '// a', 'utf-8');
    writeFileSync(join(urlDir, 'b.ts'), '// b', 'utf-8');
    writeFileSync(
      join(urlDir, 'a.meta.json'),
      JSON.stringify({ source: 'https://example.com/a.js' }),
      'utf-8'
    );

    const installer = new UrlInstaller(tempDir);
    const list = await installer.list();

    expect(list).toHaveLength(2);
    const ids = list.map((p) => p.id).sort();
    expect(ids).toStrictEqual(['url:a', 'url:b']);
  });

  it('list: returns empty when url-plugins directory does not exist', async () => {
    const installer = new UrlInstaller(tempDir);
    const list = await installer.list();
    expect(list).toStrictEqual([]);
  });
});

// ─── BuiltinInstaller ──────────────────────────────────────────────

describe('BuiltinInstaller', () => {
  it('install: installs from builtinDir', async () => {
    const builtinDir = join(tempDir, 'builtins');
    createPluginDir(builtinDir, 'core-plugin', {
      pkgJson: { name: 'core-plugin', version: '1.0.0' },
    });

    const installer = new BuiltinInstaller(builtinDir);
    const result = await installer.install('core-plugin');

    expect(result.id).toBe('builtin:core-plugin');
    expect(result.type).toBe('builtin');
    expect(result.name).toBe('core-plugin');
    expect(result.version).toBe('1.0.0');
  });

  it('install: uses source as name when no package.json', async () => {
    const builtinDir = join(tempDir, 'builtins');
    createPluginDir(builtinDir, 'no-pkg-builtin');

    const installer = new BuiltinInstaller(builtinDir);
    const result = await installer.install('no-pkg-builtin');

    expect(result.name).toBe('no-pkg-builtin');
    expect(result.version).toBe('1.0.0');
  });

  it('install: throws when plugin not found in builtinDir', async () => {
    const installer = new BuiltinInstaller(tempDir);
    await expect(installer.install('missing')).rejects.toThrow('Built-in plugin not found');
  });

  it('uninstall: throws Cannot uninstall built-in plugins', async () => {
    const installer = new BuiltinInstaller(tempDir);
    await expect(installer.uninstall('builtin:core')).rejects.toThrow(
      'Cannot uninstall built-in plugins'
    );
  });

  it('update: throws Built-in plugins are updated with the CLI', async () => {
    const installer = new BuiltinInstaller(tempDir);
    await expect(installer.update('builtin:core')).rejects.toThrow(
      'Built-in plugins are updated with the CLI'
    );
  });

  it('list: scans builtinDir for valid plugins', async () => {
    const builtinDir = join(tempDir, 'builtins');
    createPluginDir(builtinDir, 'plugin-x', {
      pkgJson: { name: 'plugin-x', version: '2.0.0' },
    });
    createPluginDir(builtinDir, 'plugin-y');

    const installer = new BuiltinInstaller(builtinDir);
    const list = await installer.list();

    expect(list).toHaveLength(2);
    const names = list.map((p) => p.name).sort();
    expect(names).toStrictEqual(['plugin-x', 'plugin-y']);
  });

  it('list: skips _ and . prefixed directories', async () => {
    const builtinDir = join(tempDir, 'builtins');
    createPluginDir(builtinDir, 'visible');
    createPluginDir(builtinDir, '_internal');
    createPluginDir(builtinDir, '.hidden');

    const installer = new BuiltinInstaller(builtinDir);
    const list = await installer.list();

    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('visible');
  });

  it('list: returns empty when builtinDir does not exist', async () => {
    const installer = new BuiltinInstaller(join(tempDir, 'no-builtin'));
    const list = await installer.list();
    expect(list).toStrictEqual([]);
  });
});

// ─── PluginInstallerRegistry ───────────────────────────────────────

describe('PluginInstallerRegistry', () => {
  it('constructor registers 4 core installers (+ optional builtin)', () => {
    const registry = new PluginInstallerRegistry({ pluginsDir: tempDir });

    expect(registry.getInstaller('local')).toBeDefined();
    expect(registry.getInstaller('npm')).toBeDefined();
    expect(registry.getInstaller('git')).toBeDefined();
    expect(registry.getInstaller('url')).toBeDefined();
    expect(registry.getInstaller('builtin')).toBeUndefined();
  });

  it('constructor registers builtin installer when builtinDir provided', () => {
    const builtinDir = join(tempDir, 'builtins');
    mkdirSync(builtinDir, { recursive: true });
    const registry = new PluginInstallerRegistry({ pluginsDir: tempDir, builtinDir });

    expect(registry.getInstaller('builtin')).toBeDefined();
  });

  it('install: routes to correct installer by type', async () => {
    const registry = new PluginInstallerRegistry({ pluginsDir: tempDir });
    const mockInstaller: PluginInstaller = {
      type: 'local',
      install: vi.fn().mockResolvedValue({
        id: 'local:mock',
        name: 'mock',
        version: '0.0.0',
        type: 'local',
        source: 'mock',
        path: '/mock',
        installedAt: 0,
      }),
      uninstall: vi.fn(),
      update: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    };
    registry.registerInstaller('local', mockInstaller);

    await registry.install('local', 'mock');

    expect(mockInstaller.install).toHaveBeenCalledWith('mock', undefined);
  });

  it('install: passes options to installer', async () => {
    const registry = new PluginInstallerRegistry({ pluginsDir: tempDir });
    const mockInstaller: PluginInstaller = {
      type: 'npm',
      install: vi.fn().mockResolvedValue({
        id: 'npm:pkg',
        name: 'pkg',
        version: '1.0.0',
        type: 'npm',
        source: 'pkg',
        path: '/pkg',
        installedAt: 0,
      }),
      uninstall: vi.fn(),
      update: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    };
    registry.registerInstaller('npm', mockInstaller);
    const opts = { version: '1.0.0' };

    await registry.install('npm', 'pkg', opts);

    expect(mockInstaller.install).toHaveBeenCalledWith('pkg', opts);
  });

  it('install: throws for unregistered type', async () => {
    const registry = new PluginInstallerRegistry({ pluginsDir: tempDir });

    await expect(registry.install('builtin', 'some')).rejects.toThrow(
      'No installer registered for type: builtin'
    );
  });

  it('uninstall: extracts type prefix from pluginId and routes', async () => {
    const registry = new PluginInstallerRegistry({ pluginsDir: tempDir });
    const mockInstaller: PluginInstaller = {
      type: 'local',
      install: vi.fn(),
      uninstall: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    };
    registry.registerInstaller('local', mockInstaller);

    await registry.uninstall('local:my-plugin');

    expect(mockInstaller.uninstall).toHaveBeenCalledWith('local:my-plugin');
  });

  it('uninstall: throws for unregistered type prefix', async () => {
    const registry = new PluginInstallerRegistry({ pluginsDir: tempDir });

    await expect(registry.uninstall('builtin:x')).rejects.toThrow('No installer for type: builtin');
  });

  it('update: routes to correct installer by pluginId prefix', async () => {
    const registry = new PluginInstallerRegistry({ pluginsDir: tempDir });
    const mockResult: PluginInstance = {
      id: 'git:repo',
      name: 'repo',
      version: '1.0.0',
      type: 'git',
      source: 'repo',
      path: '/repo',
      installedAt: 0,
    };
    const mockInstaller: PluginInstaller = {
      type: 'git',
      install: vi.fn(),
      uninstall: vi.fn(),
      update: vi.fn().mockResolvedValue(mockResult),
      list: vi.fn().mockResolvedValue([]),
    };
    registry.registerInstaller('git', mockInstaller);

    const result = await registry.update('git:repo');

    expect(mockInstaller.update).toHaveBeenCalledWith('git:repo');
    expect(result).toBe(mockResult);
  });

  it('update: throws for unregistered type prefix', async () => {
    const registry = new PluginInstallerRegistry({ pluginsDir: tempDir });

    await expect(registry.update('builtin:y')).rejects.toThrow('No installer for type: builtin');
  });

  it('listAll: aggregates lists from all registered installers', async () => {
    const registry = new PluginInstallerRegistry({ pluginsDir: tempDir });

    const localInstaller: PluginInstaller = {
      type: 'local',
      install: vi.fn(),
      uninstall: vi.fn(),
      update: vi.fn(),
      list: vi.fn().mockResolvedValue([
        {
          id: 'local:a',
          name: 'a',
          version: '1.0.0',
          type: 'local',
          source: '',
          path: '',
          installedAt: 0,
        },
      ]),
    };
    const npmInstaller: PluginInstaller = {
      type: 'npm',
      install: vi.fn(),
      uninstall: vi.fn(),
      update: vi.fn(),
      list: vi.fn().mockResolvedValue([
        {
          id: 'npm:b',
          name: 'b',
          version: '2.0.0',
          type: 'npm',
          source: '',
          path: '',
          installedAt: 0,
        },
      ]),
    };

    registry.registerInstaller('local', localInstaller);
    registry.registerInstaller('npm', npmInstaller);

    const all = await registry.listAll();

    expect(all).toHaveLength(2);
    expect(all.map((p) => p.id).sort()).toStrictEqual(['local:a', 'npm:b']);
  });

  it('listAll: skips installers that throw', async () => {
    const registry = new PluginInstallerRegistry({ pluginsDir: tempDir });

    const okInstaller: PluginInstaller = {
      type: 'local',
      install: vi.fn(),
      uninstall: vi.fn(),
      update: vi.fn(),
      list: vi.fn().mockResolvedValue([
        {
          id: 'local:a',
          name: 'a',
          version: '1.0.0',
          type: 'local',
          source: '',
          path: '',
          installedAt: 0,
        },
      ]),
    };
    const badInstaller: PluginInstaller = {
      type: 'git',
      install: vi.fn(),
      uninstall: vi.fn(),
      update: vi.fn(),
      list: vi.fn().mockRejectedValue(new Error('broken')),
    };

    registry.registerInstaller('local', okInstaller);
    registry.registerInstaller('git', badInstaller);

    const all = await registry.listAll();

    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('local:a');
  });

  it('registerInstaller: allows overriding existing installer', async () => {
    const registry = new PluginInstallerRegistry({ pluginsDir: tempDir });

    const custom: PluginInstaller = {
      type: 'local',
      install: vi.fn().mockResolvedValue({
        id: 'local:custom',
        name: 'custom',
        version: '9.9.9',
        type: 'local',
        source: 'custom',
        path: '/custom',
        installedAt: 0,
      }),
      uninstall: vi.fn(),
      update: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    };

    registry.registerInstaller('local', custom);
    const result = await registry.install('local', 'custom');

    expect(custom.install).toHaveBeenCalled();
    expect(result.name).toBe('custom');
  });
});
