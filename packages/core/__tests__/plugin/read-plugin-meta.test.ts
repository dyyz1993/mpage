import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readPluginMeta } from '../../src/plugin-loader.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'xcli-core-meta-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function writePkgJson(dir: string, pkg: Record<string, unknown>): void {
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg), 'utf-8');
}

describe('readPluginMeta', () => {
  it('reads name from default xcli field when present', () => {
    const dir = join(tempDir, 'default-xcli');
    mkdirSync(dir, { recursive: true });
    writePkgJson(dir, {
      name: 'pkg-name',
      version: '1.0.0',
      xcli: { name: 'meta-name', commands: ['a', 'b'] },
    });

    const meta = readPluginMeta(dir);

    expect(meta).not.toBeNull();
    expect(meta?.name).toBe('meta-name');
    expect(meta?.version).toBe('1.0.0');
    expect(meta?.commands).toEqual(['a', 'b']);
  });

  it('reads from xbrowser field when metadataField is "xbrowser"', () => {
    const dir = join(tempDir, 'xbrowser-style');
    mkdirSync(dir, { recursive: true });
    writePkgJson(dir, {
      name: '@xbrowser/example',
      version: '2.0.0',
      xbrowser: {
        author: 'someone',
        commands: ['scrape', 'verify'],
        site: 'https://example.com',
      },
    });

    const meta = readPluginMeta(dir, { metadataField: 'xbrowser' });

    expect(meta).not.toBeNull();
    expect(meta?.name).toBe('@xbrowser/example'); // falls back to top-level name
    expect(meta?.version).toBe('2.0.0');
    expect(meta?.commands).toEqual(['scrape', 'verify']);
  });

  it('uses top-level name as fallback when custom field has no name', () => {
    const dir = join(tempDir, 'no-name-in-custom');
    mkdirSync(dir, { recursive: true });
    writePkgJson(dir, {
      name: 'fallback-name',
      xbrowser: { commands: ['x'] }, // no name field inside
    });

    const meta = readPluginMeta(dir, { metadataField: 'xbrowser' });

    expect(meta?.name).toBe('fallback-name');
    expect(meta?.commands).toEqual(['x']);
  });

  it('returns null when package.json is missing', () => {
    const dir = join(tempDir, 'no-pkg');
    mkdirSync(dir, { recursive: true });

    const meta = readPluginMeta(dir);

    expect(meta).toBeNull();
  });

  it('returns null when name is missing everywhere', () => {
    const dir = join(tempDir, 'no-name');
    mkdirSync(dir, { recursive: true });
    writePkgJson(dir, { xcli: { commands: ['x'] } });

    const meta = readPluginMeta(dir);

    expect(meta).toBeNull();
  });
});
