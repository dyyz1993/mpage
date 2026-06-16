import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  GlobalStorage,
  CacheStorage,
  TmpStorage,
  CompositeStorage,
} from '../../src/plugin-storage.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'mpage-layered-storage-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// ─── GlobalStorage ───

describe('GlobalStorage', () => {
  it('get: returns null for non-existent key', async () => {
    const storage = new GlobalStorage(tempDir);
    expect(await storage.get('missing')).toBeNull();
  });

  it('set/get: stores and retrieves values', async () => {
    const storage = new GlobalStorage(tempDir);
    await storage.set('auth_token', 'token-123');
    expect(await storage.get<string>('auth_token')).toBe('token-123');
  });

  it('persists to global.json', async () => {
    const storage = new GlobalStorage(tempDir);
    await storage.set('key', 'value');

    const filePath = join(tempDir, 'global.json');
    expect(existsSync(filePath)).toBe(true);
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(raw.key).toBe('value');
  });

  it('shares data across instances (same configDir)', async () => {
    const s1 = new GlobalStorage(tempDir);
    await s1.set('shared', 'global-data');

    // New instance reads from same file
    const s2 = new GlobalStorage(tempDir);
    expect(await s2.get<string>('shared')).toBe('global-data');
  });

  it('delete: removes key', async () => {
    const storage = new GlobalStorage(tempDir);
    await storage.set('temp', 'x');
    await storage.delete('temp');
    expect(await storage.get('temp')).toBeNull();
  });

  it('keys: lists all keys', async () => {
    const storage = new GlobalStorage(tempDir);
    await storage.set('a', 1);
    await storage.set('b', 2);
    const keys = await storage.keys();
    expect(keys.sort()).toEqual(['a', 'b']);
  });

  it('handles corrupted JSON gracefully', async () => {
    const filePath = join(tempDir, 'global.json');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(filePath, '{broken!!!', 'utf-8');

    const storage = new GlobalStorage(tempDir);
    expect(await storage.keys()).toEqual([]);
  });
});

// ─── CacheStorage ───

describe('CacheStorage', () => {
  it('get: returns null for non-existent key', async () => {
    const cache = new CacheStorage('test-plugin', tempDir);
    expect(await cache.get('missing')).toBeNull();
  });

  it('set/get: stores and retrieves within TTL', async () => {
    const cache = new CacheStorage('test-plugin', tempDir);
    await cache.set('users', [{ name: 'Alice' }], 60_000);
    const result = await cache.get<Array<{ name: string }>>('users');
    expect(result).toEqual([{ name: 'Alice' }]);
  });

  it('returns null when cache entry has expired', async () => {
    const cache = new CacheStorage('test-plugin', tempDir);
    // maxAge = 1ms; sleep 5ms to ensure expiry
    await cache.set('stale', 'data', 1);
    await new Promise((r) => setTimeout(r, 5));
    expect(await cache.get('stale')).toBeNull();
  });

  it('get with maxAge override rejects stale cache', async () => {
    const cache = new CacheStorage('test-plugin', tempDir);
    // Stored with 60s TTL
    await cache.set('key', 'value', 60_000);
    // Wait 5ms, then only accept 0ms — entry is older than 0ms
    await new Promise((r) => setTimeout(r, 5));
    expect(await cache.get('key', 0)).toBeNull();
  });

  it('delete: removes cache entry', async () => {
    const cache = new CacheStorage('test-plugin', tempDir);
    await cache.set('temp', 'x', 60_000);
    await cache.delete('temp');
    expect(await cache.get('temp')).toBeNull();
  });

  it('clear: removes all cache entries', async () => {
    const cache = new CacheStorage('test-plugin', tempDir);
    await cache.set('a', 1, 60_000);
    await cache.set('b', 2, 60_000);
    await cache.clear();
    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBeNull();
  });

  it('isolates cache by pluginId', async () => {
    const c1 = new CacheStorage('plugin-a', tempDir);
    const c2 = new CacheStorage('plugin-b', tempDir);
    await c1.set('key', 'from-a', 60_000);
    await c2.set('key', 'from-b', 60_000);

    expect(await c1.get<string>('key')).toBe('from-a');
    expect(await c2.get<string>('key')).toBe('from-b');
  });
});

// ─── TmpStorage ───

describe('TmpStorage', () => {
  it('path: returns a path under tmp dir', () => {
    const tmp = new TmpStorage('test-cli', 'plugin-a');
    const p = tmp.path('file.txt');
    expect(p).toContain('test-cli');
    expect(p).toContain('plugin-a');
    expect(p).toContain('file.txt');
  });

  it('write/read: stores and reads file content', async () => {
    const tmp = new TmpStorage('test-cli', 'plugin-a');
    await tmp.write('data.bin', Buffer.from('hello'));
    const data = await tmp.read('data.bin');
    expect(data.toString()).toBe('hello');
  });

  it('write: accepts string data', async () => {
    const tmp = new TmpStorage('test-cli', 'plugin-a');
    await tmp.write('note.txt', 'some text');
    const data = await tmp.read('note.txt');
    expect(data.toString()).toBe('some text');
  });

  it('clean: removes tmp directory', async () => {
    const tmp = new TmpStorage('test-cli', 'plugin-a');
    await tmp.write('file.txt', 'data');
    const p = tmp.path('file.txt');
    expect(existsSync(p)).toBe(true);

    await tmp.clean();
    // The dir for this plugin is cleaned
    expect(existsSync(tmp.path('.'))).toBe(false);
  });

  it('isolates by pluginId', () => {
    const t1 = new TmpStorage('cli', 'plugin-a');
    const t2 = new TmpStorage('cli', 'plugin-b');
    expect(t1.path('f.txt')).not.toBe(t2.path('f.txt'));
  });
});

// ─── CompositeStorage ───

describe('CompositeStorage', () => {
  it('exposes all four storage layers', () => {
    const cs = new CompositeStorage('test-plugin', tempDir, 'test-cli');
    expect(cs.plugin).toBeDefined();
    expect(cs.global).toBeDefined();
    expect(cs.cache).toBeDefined();
    expect(cs.tmp).toBeDefined();
  });

  it('top-level get/set delegates to plugin layer', async () => {
    const cs = new CompositeStorage('test-plugin', tempDir, 'test-cli');
    await cs.set('key', 'top-level-value');

    // Top-level read
    expect(await cs.get<string>('key')).toBe('top-level-value');
    // Plugin layer has same data
    expect(await cs.plugin.get<string>('key')).toBe('top-level-value');
  });

  it('top-level delete delegates to plugin layer', async () => {
    const cs = new CompositeStorage('test-plugin', tempDir, 'test-cli');
    await cs.set('key', 'value');
    await cs.delete('key');
    expect(await cs.get('key')).toBeNull();
    expect(await cs.plugin.get('key')).toBeNull();
  });

  it('top-level clear delegates to plugin layer', async () => {
    const cs = new CompositeStorage('test-plugin', tempDir, 'test-cli');
    await cs.set('a', 1);
    await cs.set('b', 2);
    await cs.clear();
    expect(await cs.keys()).toEqual([]);
  });

  it('top-level keys delegates to plugin layer', async () => {
    const cs = new CompositeStorage('test-plugin', tempDir, 'test-cli');
    await cs.set('alpha', 1);
    await cs.set('beta', 2);
    const keys = await cs.keys();
    expect(keys.sort()).toEqual(['alpha', 'beta']);
  });

  it('plugin and global are isolated', async () => {
    const cs = new CompositeStorage('test-plugin', tempDir, 'test-cli');
    await cs.plugin.set('key', 'plugin-data');
    await cs.global.set('key', 'global-data');

    expect(await cs.plugin.get<string>('key')).toBe('plugin-data');
    expect(await cs.global.get<string>('key')).toBe('global-data');
  });

  it('cache layer supports TTL', async () => {
    const cs = new CompositeStorage('test-plugin', tempDir, 'test-cli');
    await cs.cache.set('cached', { data: 'x' }, 60_000);
    expect(await cs.cache.get<{ data: string }>('cached')).toEqual({ data: 'x' });

    // Expired
    await cs.cache.set('expired', 'old', 1);
    await new Promise((r) => setTimeout(r, 5));
    expect(await cs.cache.get('expired')).toBeNull();
  });

  it('tmp layer provides file operations', async () => {
    const cs = new CompositeStorage('test-plugin', tempDir, 'test-cli');
    await cs.tmp.write('test.txt', 'tmp content');
    const data = await cs.tmp.read('test.txt');
    expect(data.toString()).toBe('tmp content');
  });

  it('backward compat: existing ctx.storage.get/set code works', async () => {
    // Simulates old code that only uses ctx.storage.get/set (no layered access)
    const cs = new CompositeStorage('legacy-plugin', tempDir, 'test-cli');

    // Old-style usage
    await cs.set('auth_token', 'legacy-token');
    const token = await cs.get<string>('auth_token');
    expect(token).toBe('legacy-token');

    // Data is in plugin layer file
    const filePath = join(tempDir, 'storage', 'legacy-plugin.json');
    expect(existsSync(filePath)).toBe(true);
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(raw.auth_token).toBe('legacy-token');
  });
});
