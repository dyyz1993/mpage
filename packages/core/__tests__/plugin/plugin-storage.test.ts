import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PluginStorage } from '../../src/plugin-storage.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'mpage-storage-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('PluginStorage', () => {
  it('get: returns null for non-existent key', async () => {
    const storage = new PluginStorage('test-plugin', tempDir);
    const result = await storage.get('missing');
    expect(result).toBeNull();
  });

  it('set/get: stores and retrieves a value', async () => {
    const storage = new PluginStorage('test-plugin', tempDir);
    await storage.set('name', 'hello');
    const result = await storage.get<string>('name');
    expect(result).toBe('hello');
  });

  it('set/get: stores objects', async () => {
    const storage = new PluginStorage('test-plugin', tempDir);
    await storage.set('config', { theme: 'dark', lang: 'en' });
    const result = await storage.get<{ theme: string; lang: string }>('config');
    expect(result).toEqual({ theme: 'dark', lang: 'en' });
  });

  it('set/get: stores numbers and booleans', async () => {
    const storage = new PluginStorage('test-plugin', tempDir);
    await storage.set('count', 42);
    await storage.set('active', true);
    expect(await storage.get<number>('count')).toBe(42);
    expect(await storage.get<boolean>('active')).toBe(true);
  });

  it('set: overwrites existing value', async () => {
    const storage = new PluginStorage('test-plugin', tempDir);
    await storage.set('key', 'v1');
    await storage.set('key', 'v2');
    expect(await storage.get<string>('key')).toBe('v2');
  });

  it('delete: removes a key', async () => {
    const storage = new PluginStorage('test-plugin', tempDir);
    await storage.set('to-delete', 'value');
    await storage.delete('to-delete');
    expect(await storage.get('to-delete')).toBeNull();
  });

  it('delete: is no-op for non-existent key', async () => {
    const storage = new PluginStorage('test-plugin', tempDir);
    await expect(storage.delete('nonexistent')).resolves.toBeUndefined();
  });

  it('clear: removes all keys', async () => {
    const storage = new PluginStorage('test-plugin', tempDir);
    await storage.set('a', 1);
    await storage.set('b', 2);
    await storage.clear();
    expect(await storage.get('a')).toBeNull();
    expect(await storage.get('b')).toBeNull();
    expect(await storage.keys()).toEqual([]);
  });

  it('keys: lists all stored keys', async () => {
    const storage = new PluginStorage('test-plugin', tempDir);
    await storage.set('alpha', 1);
    await storage.set('beta', 2);
    await storage.set('gamma', 3);
    const result = await storage.keys();
    expect(result.sort()).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('keys: returns empty array when no data', async () => {
    const storage = new PluginStorage('test-plugin', tempDir);
    const result = await storage.keys();
    expect(result).toEqual([]);
  });

  it('persists data to JSON file', async () => {
    const storage = new PluginStorage('persist-test', tempDir);
    await storage.set('token', 'abc123');
    await storage.set('count', 99);

    const filePath = join(tempDir, 'persist-test.json');
    expect(existsSync(filePath)).toBe(true);

    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(raw.token).toBe('abc123');
    expect(raw.count).toBe(99);
  });

  it('reads existing data from JSON file on construction', async () => {
    const filePath = join(tempDir, 'rehydrate-test.json');
    const data = { existing: 'data', num: 42 };
    const { writeFileSync } = await import('node:fs');
    writeFileSync(filePath, JSON.stringify(data), 'utf-8');

    const storage = new PluginStorage('rehydrate-test', tempDir);
    expect(await storage.get<string>('existing')).toBe('data');
    expect(await storage.get<number>('num')).toBe(42);
  });

  it('handles corrupted JSON file gracefully', async () => {
    const filePath = join(tempDir, 'corrupt-test.json');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(filePath, '{invalid json!!!', 'utf-8');

    const storage = new PluginStorage('corrupt-test', tempDir);
    expect(await storage.keys()).toEqual([]);
    await storage.set('new', 'value');
    expect(await storage.get<string>('new')).toBe('value');
  });

  it('auto-creates storage directory when it does not exist', () => {
    const deepDir = join(tempDir, 'a', 'b', 'c');
    expect(existsSync(deepDir)).toBe(false);

    const storage = new PluginStorage('nested-test', deepDir);
    expect(existsSync(deepDir)).toBe(true);
  });

  it('different plugin IDs create different files', async () => {
    const s1 = new PluginStorage('plugin-a', tempDir);
    const s2 = new PluginStorage('plugin-b', tempDir);

    await s1.set('key', 'from-a');
    await s2.set('key', 'from-b');

    expect(await s1.get<string>('key')).toBe('from-a');
    expect(await s2.get<string>('key')).toBe('from-b');
  });

  it('survives set → delete → set cycle', async () => {
    const storage = new PluginStorage('cycle-test', tempDir);
    await storage.set('x', 'first');
    await storage.delete('x');
    await storage.set('x', 'second');

    expect(await storage.get<string>('x')).toBe('second');

    const filePath = join(tempDir, 'cycle-test.json');
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(raw.x).toBe('second');
  });
});
