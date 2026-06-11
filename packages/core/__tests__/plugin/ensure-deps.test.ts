import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync as _realExecSync } from 'node:child_process';

import {
  ensurePluginDependencies,
  SHARED_PLUGIN_DEPENDENCIES,
} from '../../src/plugin/installers/ensure-deps.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Reach into the module-level mock so tests can observe invocations.
import { execSync } from 'node:child_process';
const mockedExecSync = vi.mocked(execSync);

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'xcli-core-deps-test-'));
  mockedExecSync.mockReset();
  mockedExecSync.mockImplementation(() => Buffer.from('') as never);
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function makeZodInstalled(): void {
  mkdirSync(join(tempDir, 'node_modules', 'zod'), { recursive: true });
  writeFileSync(join(tempDir, 'node_modules', 'zod', 'package.json'), '{"name":"zod"}');
}

describe('SHARED_PLUGIN_DEPENDENCIES', () => {
  it('lists zod and xcli-core', () => {
    expect(SHARED_PLUGIN_DEPENDENCIES).toHaveProperty('zod');
    expect(SHARED_PLUGIN_DEPENDENCIES).toHaveProperty('@dyyz1993/xcli-core');
  });

  it('uses semver-compatible ranges', () => {
    for (const [name, range] of Object.entries(SHARED_PLUGIN_DEPENDENCIES)) {
      expect(range, `${name} should use a semver range`).toMatch(/^\^?\d/);
    }
  });
});

describe('ensurePluginDependencies', () => {
  it('is a no-op when node_modules/zod already exists', () => {
    makeZodInstalled();

    ensurePluginDependencies(tempDir);

    // Neither package.json was created nor npm install invoked.
    expect(existsSync(join(tempDir, 'package.json'))).toBe(false);
    expect(mockedExecSync).not.toHaveBeenCalled();
  });

  it('creates package.json with shared deps when missing', () => {
    ensurePluginDependencies(tempDir);

    const pkgPath = join(tempDir, 'package.json');
    expect(existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
      dependencies: Record<string, string>;
      private: boolean;
    };
    expect(pkg.private).toBe(true);
    expect(pkg.dependencies.zod).toBe(SHARED_PLUGIN_DEPENDENCIES.zod);
    expect(pkg.dependencies['@dyyz1993/xcli-core']).toBe(
      SHARED_PLUGIN_DEPENDENCIES['@dyyz1993/xcli-core']
    );
  });

  it('runs npm install in the plugins directory', () => {
    ensurePluginDependencies(tempDir);

    expect(mockedExecSync).toHaveBeenCalledTimes(1);
    const [cmd, opts] = mockedExecSync.mock.calls[0] as [string, { cwd: string }];
    expect(cmd).toMatch(/^npm install/);
    expect(cmd).toMatch(/--production/);
    expect(opts.cwd).toBe(tempDir);
  });

  it('merges with existing package.json without losing fields', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'my-plugins',
        version: '1.0.0',
        dependencies: { 'left-pad': '1.0.0' },
      })
    );

    ensurePluginDependencies(tempDir);

    const pkg = JSON.parse(readFileSync(join(tempDir, 'package.json'), 'utf-8')) as {
      name: string;
      version: string;
      dependencies: Record<string, string>;
    };
    expect(pkg.name).toBe('my-plugins');
    expect(pkg.version).toBe('1.0.0');
    expect(pkg.dependencies['left-pad']).toBe('1.0.0');
    expect(pkg.dependencies.zod).toBeDefined();
  });

  it('does not overwrite existing dep versions', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        dependencies: { zod: '3.0.0' },
      })
    );

    ensurePluginDependencies(tempDir);

    const pkg = JSON.parse(readFileSync(join(tempDir, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies.zod).toBe('3.0.0');
  });

  it('skips npm install when deps are already declared and node_modules exists', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { ...SHARED_PLUGIN_DEPENDENCIES } })
    );
    mkdirSync(join(tempDir, 'node_modules', 'zod'), { recursive: true });

    ensurePluginDependencies(tempDir);

    expect(mockedExecSync).not.toHaveBeenCalled();
  });

  it('runs npm install when deps are declared but node_modules is missing', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ dependencies: { ...SHARED_PLUGIN_DEPENDENCIES } })
    );

    ensurePluginDependencies(tempDir);

    expect(mockedExecSync).toHaveBeenCalledTimes(1);
  });

  it('recoveres from a corrupt package.json by treating it as empty', () => {
    writeFileSync(join(tempDir, 'package.json'), '{not valid json');

    ensurePluginDependencies(tempDir);

    const pkg = JSON.parse(readFileSync(join(tempDir, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies.zod).toBe(SHARED_PLUGIN_DEPENDENCIES.zod);
  });

  it('warns but does not throw when npm install fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockedExecSync.mockImplementation(() => {
      throw new Error('network error');
    });

    expect(() => ensurePluginDependencies(tempDir)).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('uses a generic description that is not bound to a host project', () => {
    ensurePluginDependencies(tempDir);
    const pkg = JSON.parse(readFileSync(join(tempDir, 'package.json'), 'utf-8')) as {
      description?: string;
    };
    // The description must not name a specific host project so that
    // the function is reusable from xcli-core in any consumer.
    expect(pkg.description).toBeDefined();
    expect(pkg.description?.toLowerCase()).not.toMatch(/xbrowser/);
  });
});

// Reference _realExecSync so the import isn't tree-shaken in environments
// that pre-evaluate the mock. (The mock is loaded before this module.)
void _realExecSync;
