import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';

import { NpmInstaller } from '../../src/plugin/installers/npm-installer.js';

// ─── tarball helpers ────────────────────────────────────────────────

function buildTarGz(entries: Array<{ path: string; content: string }>): Buffer {
  const tarball: Buffer[] = [];
  for (const entry of entries) {
    const header = Buffer.alloc(512);
    Buffer.from(entry.path).copy(header, 0, 0, Math.min(entry.path.length, 100));
    header.write('0000644\0', 100);
    header.write('0000000\0', 108);
    header.write('0000000\0', 116);
    header.write(entry.content.length.toString(8).padStart(11, '0') + '\0', 124);
    header.write('00000000000\0', 136);
    header.write('        ', 148);
    header.write('0', 156);
    header.write('ustar\0', 257);
    header.write('00', 263);
    header.write('root\0', 265);
    header.write('root\0', 297);
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += header[i];
    header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    tarball.push(header);
    const data = Buffer.from(entry.content);
    tarball.push(data);
    const pad = (512 - (data.length % 512)) % 512;
    if (pad) tarball.push(Buffer.alloc(pad));
  }
  tarball.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(tarball));
}

const NESTED_TARBALL = (pkg: { name: string; version: string }): Buffer =>
  buildTarGz([
    {
      path: 'package/index.ts',
      content: '// plugin entry',
    },
    {
      path: 'package/package.json',
      content: JSON.stringify({ name: pkg.name, version: pkg.version }),
    },
  ]);

const FLAT_TARBALL = (pkg: { name: string; version: string }): Buffer =>
  buildTarGz([
    { path: 'index.ts', content: '// plugin entry' },
    { path: 'package.json', content: JSON.stringify({ name: pkg.name, version: pkg.version }) },
  ]);

// ─── fetch mocking ─────────────────────────────────────────────────

type FetchResponder = (url: string) => Promise<Response>;

const stubFetch = (responder: FetchResponder): ReturnType<typeof vi.fn> => {
  const mock = vi.fn(responder) as unknown as ReturnType<typeof vi.fn>;
  vi.stubGlobal('fetch', mock);
  return mock;
};

const makeResponse = (body: Buffer | string, status = 200): Response => {
  const buf = typeof body === 'string' ? Buffer.from(body) : body;
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(buf);
        controller.close();
      },
    }),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    json: () => Promise.resolve(JSON.parse(buf.toString('utf-8'))),
    text: () => Promise.resolve(buf.toString('utf-8')),
    arrayBuffer: () =>
      Promise.resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
    blob: () => Promise.resolve(new Blob([buf])),
    formData: () => Promise.reject(new Error('not implemented in test')),
    clone: () => makeResponse(body, status),
  } as unknown as Response;
};

// ─── test lifecycle ────────────────────────────────────────────────

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'xcli-core-npm-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── tests ─────────────────────────────────────────────────────────

describe('NpmInstaller.install', () => {
  it('fetches package metadata from registry, downloads tarball, and installs to pluginsDir/node_modules/<name>', async () => {
    const tarball = FLAT_TARBALL({ name: 'cool-plugin', version: '1.2.3' });
    const fetchMock = stubFetch(async (url) => {
      if (url.endsWith('/cool-plugin')) {
        return makeResponse(
          JSON.stringify({
            'dist-tags': { latest: '1.2.3' },
            versions: {
              '1.2.3': {
                dist: { tarball: 'https://registry.example.com/cool-plugin/-/1.2.3.tgz' },
              },
            },
          })
        );
      }
      if (url.endsWith('/1.2.3.tgz')) return makeResponse(tarball);
      return makeResponse('not found', 404);
    });

    const installer = new NpmInstaller(tempDir);
    const result = await installer.install('cool-plugin');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.id).toBe('npm:cool-plugin');
    expect(result.name).toBe('cool-plugin');
    expect(result.version).toBe('1.2.3');
    expect(result.type).toBe('npm');

    const installPath = join(tempDir, 'node_modules', 'cool-plugin');
    expect(existsSync(join(installPath, 'index.ts'))).toBe(true);
    expect(existsSync(join(installPath, 'package.json'))).toBe(true);
  });

  it('flattens a nested package/ directory inside the tarball', async () => {
    const tarball = NESTED_TARBALL({ name: 'nested-pkg', version: '0.5.0' });
    stubFetch(async (url) => {
      if (url.endsWith('/nested-pkg')) {
        return makeResponse(
          JSON.stringify({
            'dist-tags': { latest: '0.5.0' },
            versions: { '0.5.0': { dist: { tarball: 'https://x/nested.tgz' } } },
          })
        );
      }
      return makeResponse(tarball);
    });

    const installer = new NpmInstaller(tempDir);
    await installer.install('nested-pkg');

    const installPath = join(tempDir, 'node_modules', 'nested-pkg');
    expect(existsSync(join(installPath, 'index.ts'))).toBe(true);
    expect(existsSync(join(installPath, 'package', 'index.ts'))).toBe(false);
  });

  it('throws when the registry returns 404', async () => {
    stubFetch(async () => makeResponse('not found', 404));

    const installer = new NpmInstaller(tempDir);
    await expect(installer.install('missing-pkg')).rejects.toThrow(/not found on npm/);
  });

  it('throws when the tarball URL is missing from version metadata', async () => {
    stubFetch(async (url) => {
      if (url.endsWith('/broken-pkg')) {
        return makeResponse(
          JSON.stringify({
            'dist-tags': { latest: '1.0.0' },
            versions: { '1.0.0': { dist: {} } },
          })
        );
      }
      return makeResponse('noop', 200);
    });

    const installer = new NpmInstaller(tempDir);
    await expect(installer.install('broken-pkg')).rejects.toThrow(/No tarball/);
  });

  it('uses the provided registry option for the metadata request', async () => {
    const tarball = FLAT_TARBALL({ name: 'reg-pkg', version: '1.0.0' });
    const fetchMock = stubFetch(async (url) => {
      if (url.startsWith('https://my-registry.example.com/')) {
        return makeResponse(
          JSON.stringify({
            'dist-tags': { latest: '1.0.0' },
            versions: { '1.0.0': { dist: { tarball: 'https://cdn/reg-pkg.tgz' } } },
          })
        );
      }
      if (url === 'https://cdn/reg-pkg.tgz') return makeResponse(tarball);
      return makeResponse('not found', 404);
    });

    const installer = new NpmInstaller(tempDir);
    await installer.install('reg-pkg', { registry: 'https://my-registry.example.com' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://my-registry.example.com/reg-pkg')
    );
  });

  it('uses the explicit version when provided', async () => {
    const tarball = FLAT_TARBALL({ name: 'ver-pkg', version: '2.0.0' });
    const fetchMock = stubFetch(async (url) => {
      if (url.endsWith('/ver-pkg')) {
        return makeResponse(
          JSON.stringify({
            'dist-tags': { latest: '1.0.0' },
            versions: { '2.0.0': { dist: { tarball: 'https://cdn/2.0.0.tgz' } } },
          })
        );
      }
      if (url.endsWith('/2.0.0.tgz')) return makeResponse(tarball);
      return makeResponse('not found', 404);
    });

    const installer = new NpmInstaller(tempDir);
    const result = await installer.install('ver-pkg', { version: '2.0.0' });

    expect(result.version).toBe('2.0.0');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/2.0.0.tgz'));
  });

  it('installs scoped packages into node_modules/@scope/<name>', async () => {
    const tarball = FLAT_TARBALL({ name: '@myorg/scoped', version: '1.0.0' });
    stubFetch(async (url) => {
      if (url.includes('/@myorg%2Fscoped') || url.endsWith('/@myorg/scoped')) {
        return makeResponse(
          JSON.stringify({
            'dist-tags': { latest: '1.0.0' },
            versions: { '1.0.0': { dist: { tarball: 'https://cdn/scoped.tgz' } } },
          })
        );
      }
      return makeResponse(tarball);
    });

    const installer = new NpmInstaller(tempDir);
    const result = await installer.install('@myorg/scoped');

    expect(result.id).toBe('npm:@myorg/scoped');
    expect(existsSync(join(tempDir, 'node_modules', '@myorg', 'scoped', 'index.ts'))).toBe(true);
  });
});

describe('NpmInstaller.uninstall', () => {
  it('removes the package directory from node_modules', async () => {
    const pkgPath = join(tempDir, 'node_modules', 'to-remove');
    mkdirSync(join(pkgPath, 'src'), { recursive: true });
    writeFileSync(join(pkgPath, 'index.ts'), '// entry');
    writeFileSync(join(pkgPath, 'package.json'), '{}');

    const installer = new NpmInstaller(tempDir);
    await installer.uninstall('npm:to-remove');

    expect(existsSync(pkgPath)).toBe(false);
  });

  it('removes the entire @scope directory when last scoped package is removed', async () => {
    const pkgPath = join(tempDir, 'node_modules', '@myorg', 'last-one');
    mkdirSync(pkgPath, { recursive: true });
    writeFileSync(join(pkgPath, 'index.ts'), '// entry');

    const installer = new NpmInstaller(tempDir);
    await installer.uninstall('npm:@myorg/last-one');

    expect(existsSync(join(tempDir, 'node_modules', '@myorg'))).toBe(false);
  });

  it('is a no-op when the package does not exist', async () => {
    const installer = new NpmInstaller(tempDir);
    await expect(installer.uninstall('npm:nothing-here')).resolves.toBeUndefined();
  });
});

describe('NpmInstaller.update', () => {
  it('fetches latest version, replaces existing install', async () => {
    const oldPath = join(tempDir, 'node_modules', 'upd-pkg');
    mkdirSync(oldPath, { recursive: true });
    writeFileSync(join(oldPath, 'index.ts'), '// old');
    writeFileSync(
      join(oldPath, 'package.json'),
      JSON.stringify({ name: 'upd-pkg', version: '0.0.1' })
    );

    const tarball = FLAT_TARBALL({ name: 'upd-pkg', version: '2.5.0' });
    stubFetch(async (url) => {
      if (url.endsWith('/upd-pkg')) {
        return makeResponse(
          JSON.stringify({
            'dist-tags': { latest: '2.5.0' },
            versions: { '2.5.0': { dist: { tarball: 'https://cdn/upd.tgz' } } },
          })
        );
      }
      return makeResponse(tarball);
    });

    const installer = new NpmInstaller(tempDir);
    const result = await installer.update('npm:upd-pkg');

    expect(result.version).toBe('2.5.0');
    const newIndex = readFileSync(join(oldPath, 'index.ts'), 'utf-8');
    expect(newIndex).toBe('// plugin entry');
  });
});

describe('NpmInstaller.list', () => {
  it('returns empty when node_modules does not exist', async () => {
    const installer = new NpmInstaller(tempDir);
    expect(await installer.list()).toStrictEqual([]);
  });

  it('lists non-scoped packages from node_modules', async () => {
    const aDir = join(tempDir, 'node_modules', 'a-pkg');
    mkdirSync(aDir, { recursive: true });
    writeFileSync(join(aDir, 'index.ts'), '// a');
    writeFileSync(join(aDir, 'package.json'), JSON.stringify({ name: 'a-pkg', version: '1.0.0' }));

    const installer = new NpmInstaller(tempDir);
    const list = await installer.list();

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'npm:a-pkg', name: 'a-pkg', version: '1.0.0' });
  });

  it('lists scoped packages from node_modules/@scope/<name>', async () => {
    const scopedDir = join(tempDir, 'node_modules', '@s', 'pkg');
    mkdirSync(scopedDir, { recursive: true });
    writeFileSync(join(scopedDir, 'index.ts'), '// s');
    writeFileSync(
      join(scopedDir, 'package.json'),
      JSON.stringify({ name: '@s/pkg', version: '0.1.0' })
    );

    const installer = new NpmInstaller(tempDir);
    const list = await installer.list();

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'npm:@s/pkg', name: '@s/pkg' });
  });

  it('skips non-plugin directories (no package.json)', async () => {
    mkdirSync(join(tempDir, 'node_modules', 'orphan'), { recursive: true });
    writeFileSync(join(tempDir, 'node_modules', 'orphan', 'index.ts'), '// orphan');

    const installer = new NpmInstaller(tempDir);
    const list = await installer.list();

    expect(list).toStrictEqual([]);
  });
});
