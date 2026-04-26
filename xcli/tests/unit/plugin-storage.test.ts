import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PluginStorage } from '../../src/core/plugin-storage';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TMP_DIR = join(tmpdir(), 'xcli-test-plugin-storage');

describe('PluginStorage', () => {
  let storage: PluginStorage;

  beforeEach(() => {
    storage = new PluginStorage('test-unit-storage');
  });

  afterEach(async () => {
    await storage.clear();
    if (existsSync(TMP_DIR)) {
      rmSync(TMP_DIR, { recursive: true, force: true });
    }
  });

  it('should return null for non-existent key', async () => {
    expect(await storage.get('nonexistent')).toBeNull();
  });

  it('should set and get a value', async () => {
    await storage.set('name', 'test-value');
    expect(await storage.get('name')).toBe('test-value');
  });

  it('should set and get complex objects', async () => {
    const obj = { foo: 'bar', nested: { count: 42 } };
    await storage.set('obj', obj);
    expect(await storage.get('obj')).toEqual(obj);
  });

  it('should delete a key', async () => {
    await storage.set('to-delete', 'value');
    await storage.delete('to-delete');
    expect(await storage.get('to-delete')).toBeNull();
  });

  it('should not throw when deleting non-existent key', async () => {
    await expect(storage.delete('no-such-key')).resolves.toBeUndefined();
  });

  it('should clear all keys', async () => {
    await storage.set('a', 1);
    await storage.set('b', 2);
    await storage.clear();
    expect(await storage.keys()).toEqual([]);
  });

  it('should return all keys', async () => {
    await storage.set('x', 1);
    await storage.set('y', 2);
    await storage.set('z', 3);
    const keys = await storage.keys();
    expect(keys.sort()).toEqual(['x', 'y', 'z']);
  });

  it('should persist data to file', async () => {
    await storage.set('persist-key', 'persist-value');

    const storage2 = new PluginStorage('test-unit-storage');
    expect(await storage2.get('persist-key')).toBe('persist-value');
  });

  it('should return empty object when JSON file is corrupted', async () => {
    await storage.set('dummy', 1);

    const storageDir = join(process.env.HOME || tmpdir(), '.xcli', 'storage');
    const filePath = join(storageDir, 'test-corrupted-storage.json');
    mkdirSync(storageDir, { recursive: true });
    writeFileSync(filePath, '{ invalid json !!!', 'utf-8');

    const corruptedStorage = new PluginStorage('test-corrupted-storage');
    expect(await corruptedStorage.get('anything')).toBeNull();
    expect(await corruptedStorage.keys()).toEqual([]);
  });
});
