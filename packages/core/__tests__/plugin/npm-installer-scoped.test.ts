import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

import { NpmInstaller } from '../../src/plugin/installers/npm-installer.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

let tempDir: string;
let mockExec: ReturnType<typeof vi.fn>;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'npm-scoped-test-'));
  mockExec = vi.mocked(execSync);
  mockExec.mockReturnValue('');
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

function createScopedPlugin(
  nmDir: string,
  scope: string,
  name: string,
  version: string = '1.0.0'
): void {
  const scopedDir = join(nmDir, scope);
  mkdirSync(scopedDir, { recursive: true });
  const pkgDir = join(scopedDir, name);
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(
    join(pkgDir, 'package.json'),
    JSON.stringify({ name: `${scope}/${name}`, version }),
    'utf-8'
  );
}

function createRegularPlugin(nmDir: string, name: string, version: string = '1.0.0'): void {
  const pkgDir = join(nmDir, name);
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name, version }), 'utf-8');
}

describe('NpmInstaller - scoped packages', () => {
  it('list: lists scoped packages with correct id format', async () => {
    const nmDir = join(tempDir, 'node_modules');
    createScopedPlugin(nmDir, '@myorg', 'cool-plugin', '1.0.0');

    const installer = new NpmInstaller(tempDir);
    const list = await installer.list();

    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('npm:@myorg/cool-plugin');
    expect(list[0].name).toBe('@myorg/cool-plugin');
    expect(list[0].version).toBe('1.0.0');
  });

  it('list: skips scoped directories without package.json', async () => {
    const nmDir = join(tempDir, 'node_modules');
    const scopedDir = join(nmDir, '@myorg');
    mkdirSync(scopedDir, { recursive: true });

    mkdirSync(join(scopedDir, 'valid-plugin'), { recursive: true });
    writeFileSync(
      join(scopedDir, 'valid-plugin', 'package.json'),
      JSON.stringify({ name: '@myorg/valid-plugin', version: '1.0.0' }),
      'utf-8'
    );

    mkdirSync(join(scopedDir, 'invalid-dir'), { recursive: true });
    writeFileSync(join(scopedDir, 'invalid-dir', 'README.md'), 'no package.json', 'utf-8');

    const installer = new NpmInstaller(tempDir);
    const list = await installer.list();

    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('npm:@myorg/valid-plugin');
  });

  it('list: handles mixed regular and scoped packages', async () => {
    const nmDir = join(tempDir, 'node_modules');
    createRegularPlugin(nmDir, 'regular-pkg', '2.0.0');
    createScopedPlugin(nmDir, '@myorg', 'scoped-pkg', '1.0.0');
    createScopedPlugin(nmDir, '@another', 'another-plugin', '3.0.0');

    const installer = new NpmInstaller(tempDir);
    const list = await installer.list();

    expect(list).toHaveLength(3);
    const ids = list.map((p) => p.id).sort();
    expect(ids).toStrictEqual([
      'npm:@another/another-plugin',
      'npm:@myorg/scoped-pkg',
      'npm:regular-pkg',
    ]);

    const scopedPlugin = list.find((p) => p.id === 'npm:@myorg/scoped-pkg');
    expect(scopedPlugin?.name).toBe('@myorg/scoped-pkg');
    expect(scopedPlugin?.version).toBe('1.0.0');

    const regularPlugin = list.find((p) => p.id === 'npm:regular-pkg');
    expect(regularPlugin?.name).toBe('regular-pkg');
    expect(regularPlugin?.version).toBe('2.0.0');
  });
});
