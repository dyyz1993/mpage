import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  downloadToFile,
  extractTarGz,
  flattenPackageRoot,
  verifyPlugin,
  safeCleanup,
  type PluginVerifyResult,
} from '../../src/plugin/installers/utils.js';

// `tar` invocation must actually run for the happy-path test; we use a
// module-level mock only in the dedicated command-shape assertion.

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'xcli-core-utils-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function buildTarGz(entries: Array<{ path: string; content: string }>): Buffer {
  const tarball: Buffer[] = [];
  for (const entry of entries) {
    const header = Buffer.alloc(512);
    const nameBuf = Buffer.from(entry.path, 'utf-8');
    nameBuf.copy(header, 0, 0, Math.min(nameBuf.length, 100));
    // Octal string fields, NUL/space terminated
    header.write('0000644\0', 100, 'ascii');
    header.write('0000000\0', 108, 'ascii');
    header.write('0000000\0', 116, 'ascii');
    const sizeOct = entry.content.length.toString(8).padStart(11, '0') + '\0';
    header.write(sizeOct, 124, 'ascii');
    // mtime: 8-byte octal + NUL
    header.write('00000000000\0', 136, 'ascii');
    // Skip 148-155 (checksum placeholder; fill with spaces)
    header.write('        ', 148, 'ascii');
    header.write('0', 156, 'ascii'); // typeflag = regular file
    // ustar magic + version (required by GNU tar / BSD tar strict mode)
    header.write('ustar\0', 257, 'ascii');
    header.write('00', 263, 'ascii');
    // uname / gname (owner/group)
    header.write('root\0', 265, 'ascii');
    header.write('root\0', 297, 'ascii');

    // Compute and write checksum
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += header[i];
    const chkStr = checksum.toString(8).padStart(6, '0') + '\0 ';
    header.write(chkStr, 148, 'ascii');

    tarball.push(header);
    const data = Buffer.from(entry.content, 'utf-8');
    tarball.push(data);
    const padLen = (512 - (data.length % 512)) % 512;
    if (padLen > 0) tarball.push(Buffer.alloc(padLen));
  }
  // End-of-archive: two 512-byte zero blocks
  tarball.push(Buffer.alloc(1024));
  return Buffer.concat(tarball);
}

function gzip(buffer: Buffer): Buffer {
  // Simple sync gzip wrapper using createGzip sync interface
  const { gzipSync } = require('node:zlib') as typeof import('node:zlib');
  return gzipSync(buffer);
}

describe('downloadToFile', () => {
  it('downloads remote URL body to destination file', async () => {
    const content = 'export default function() { return {}; }';
    const webStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(content));
        controller.close();
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: webStream,
      })
    );

    const dest = join(tempDir, 'plugin.js');
    await downloadToFile('https://example.com/plugin.js', dest);

    expect(existsSync(dest)).toBe(true);
    expect(readFileSync(dest, 'utf-8')).toBe(content);
  });

  it('copies file:// URL to destination', async () => {
    const src = join(tempDir, 'src.js');
    writeFileSync(src, '// local file', 'utf-8');
    const dest = join(tempDir, 'copied.js');

    await downloadToFile(`file://${src}`, dest);

    expect(readFileSync(dest, 'utf-8')).toBe('// local file');
  });

  it('throws on non-2xx HTTP response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
    );

    await expect(
      downloadToFile('https://example.com/missing', join(tempDir, 'out'))
    ).rejects.toThrow('Download failed: HTTP 404');
  });

  it('throws when response body is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: null,
      })
    );

    await expect(downloadToFile('https://example.com/empty', join(tempDir, 'out'))).rejects.toThrow(
      'No response body'
    );
  });
});

describe('extractTarGz', () => {
  it('extracts tar.gz into target directory (invokes tar -xzf)', () => {
    const tarball = buildTarGz([
      { path: 'index.js', content: '// entry' },
      { path: 'package.json', content: '{"name":"x"}' },
    ]);
    const gzPath = join(tempDir, 'pkg.tgz');
    writeFileSync(gzPath, gzip(tarball));

    const targetDir = join(tempDir, 'extracted');
    extractTarGz(gzPath, targetDir);

    expect(existsSync(join(targetDir, 'index.js'))).toBe(true);
    expect(existsSync(join(targetDir, 'package.json'))).toBe(true);
  });
});

describe('flattenPackageRoot', () => {
  it('flattens single package/ wrapper directory', () => {
    const pkgRoot = join(tempDir, 'package');
    mkdirSync(join(pkgRoot, 'src'), { recursive: true });
    writeFileSync(join(pkgRoot, 'index.js'), '// entry', 'utf-8');
    writeFileSync(join(pkgRoot, 'package.json'), '{}', 'utf-8');
    writeFileSync(join(pkgRoot, 'src', 'a.js'), '// a', 'utf-8');

    flattenPackageRoot(tempDir);

    expect(existsSync(join(tempDir, 'index.js'))).toBe(true);
    expect(existsSync(join(tempDir, 'package.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'src', 'a.js'))).toBe(true);
    expect(existsSync(pkgRoot)).toBe(false);
  });

  it('is a no-op when there are multiple top-level entries', () => {
    writeFileSync(join(tempDir, 'a.txt'), 'a', 'utf-8');
    writeFileSync(join(tempDir, 'b.txt'), 'b', 'utf-8');

    flattenPackageRoot(tempDir);

    expect(existsSync(join(tempDir, 'a.txt'))).toBe(true);
    expect(existsSync(join(tempDir, 'b.txt'))).toBe(true);
  });
});

describe('verifyPlugin', () => {
  it('accepts directory with index.ts', () => {
    const dir = join(tempDir, 'good');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.ts'), '// entry', 'utf-8');

    const result: PluginVerifyResult = verifyPlugin(dir);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts directory with index.js', () => {
    const dir = join(tempDir, 'good-js');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.js'), '// entry', 'utf-8');

    const result = verifyPlugin(dir);

    expect(result.valid).toBe(true);
  });

  it('rejects directory without entry file', () => {
    const dir = join(tempDir, 'empty');
    mkdirSync(dir, { recursive: true });

    const result = verifyPlugin(dir);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/No index\.ts or index\.js/);
  });

  it('warns when package.json is missing', () => {
    const dir = join(tempDir, 'no-pkg');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.ts'), '// entry', 'utf-8');

    const result = verifyPlugin(dir);

    expect(result.valid).toBe(true);
    expect(result.warnings).toContain('No package.json found');
  });

  it('warns when package.json lacks xcli metadata', () => {
    const dir = join(tempDir, 'no-meta');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.ts'), '// entry', 'utf-8');
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'p', version: '1.0.0' }));

    const result = verifyPlugin(dir);

    expect(result.valid).toBe(true);
    expect(result.warnings?.some((w) => w.includes('xcli'))).toBe(true);
  });

  it('warns on malformed package.json', () => {
    const dir = join(tempDir, 'bad-json');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.ts'), '// entry', 'utf-8');
    writeFileSync(join(dir, 'package.json'), '{not valid', 'utf-8');

    const result = verifyPlugin(dir);

    expect(result.valid).toBe(true);
    expect(result.warnings).toContain('Invalid package.json');
  });

  describe('metadataField option', () => {
    it('defaults to checking the xcli field', () => {
      const dir = join(tempDir, 'default-xcli');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.ts'), '// entry', 'utf-8');
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'p' }));

      const result = verifyPlugin(dir);

      expect(result.warnings).toContain('No xcli metadata in package.json');
    });

    it('passes silently when xcli metadata is present (default)', () => {
      const dir = join(tempDir, 'has-xcli');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.ts'), '// entry', 'utf-8');
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'p', xcli: { name: 'p', commands: [] } })
      );

      const result = verifyPlugin(dir);

      expect(result.warnings ?? []).not.toContain('No xcli metadata in package.json');
    });

    it('checks the custom metadataField when provided', () => {
      const dir = join(tempDir, 'xbrowser-style');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.ts'), '// entry', 'utf-8');
      // package.json with only `xbrowser` field (no `xcli`)
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({
          name: '@xbrowser/example',
          version: '1.0.0',
          xbrowser: {
            author: 'someone',
            commands: ['scrape'],
            site: 'https://example.com',
          },
        })
      );

      // Default call warns about missing xcli
      const defaultResult = verifyPlugin(dir);
      expect(defaultResult.warnings).toContain('No xcli metadata in package.json');

      // Custom call passes silently because xbrowser is present
      const customResult = verifyPlugin(dir, { metadataField: 'xbrowser' });
      expect(customResult.warnings ?? []).not.toContain('No xbrowser metadata in package.json');
    });

    it('warns with the custom field name when missing', () => {
      const dir = join(tempDir, 'missing-custom');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.ts'), '// entry', 'utf-8');
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'p', xcli: { name: 'p' } }));

      const result = verifyPlugin(dir, { metadataField: 'xbrowser' });

      expect(result.warnings).toContain('No xbrowser metadata in package.json');
    });
  });
});

describe('safeCleanup', () => {
  it('removes existing directory', () => {
    const dir = join(tempDir, 'to-remove');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'a.txt'), 'a', 'utf-8');

    safeCleanup(dir);

    expect(existsSync(dir)).toBe(false);
  });

  it('does not throw when directory does not exist', () => {
    expect(() => safeCleanup(join(tempDir, 'never-existed'))).not.toThrow();
  });
});
