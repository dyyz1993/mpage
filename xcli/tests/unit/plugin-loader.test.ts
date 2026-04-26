import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PluginLoader } from '../../src/core/plugin-loader';
import { PluginStorage } from '../../src/core/plugin-storage';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TMP_DIR = join(tmpdir(), 'xcli-test-plugin-loader');

function writePluginFile(name: string, code: string): string {
  const pluginDir = join(TMP_DIR, name);
  mkdirSync(pluginDir, { recursive: true });
  const filePath = join(pluginDir, 'index.ts');
  writeFileSync(filePath, code, 'utf-8');
  return filePath;
}

const SIMPLE_PLUGIN_CODE = [
  'export default function(xcli) {',
  "  xcli.createSite({ name: 'test-site', url: 'https://example.com' });",
  '}',
].join('\n');

const BAD_PLUGIN_CODE = "throw new Error('intentional failure');";

const GOOD_PLUGIN_CODE = [
  'export default function(xcli) {',
  "  xcli.createSite({ name: 'good-site', url: 'https://good.com' });",
  '}',
].join('\n');

const CLEANUP_PLUGIN_CODE = [
  'export default function(xcli) {',
  "  xcli.createSite({ name: 'cleanup-plugin', url: 'https://cleanup.com' });",
  '}',
].join('\n');

const OVERRIDE_V1_CODE = [
  'export default function(xcli) {',
  "  xcli.createSite({ name: 'override-site', url: 'https://v1.com' });",
  '}',
].join('\n');

const OVERRIDE_V2_CODE = [
  'export default function(xcli) {',
  "  xcli.createSite({ name: 'override-site', url: 'https://v2.com' });",
  '}',
].join('\n');

describe('PluginLoader', () => {
  let loader: PluginLoader;

  beforeEach(() => {
    loader = new PluginLoader();
    mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TMP_DIR)) {
      rmSync(TMP_DIR, { recursive: true, force: true });
    }
  });

  it('should load a plugin from function successfully', async () => {
    const setup = vi.fn();
    await loader.loadFromFunction(setup);
    expect(setup).toHaveBeenCalledWith(loader.getAPI());
  });

  it('should load a plugin that registers a site', async () => {
    const pluginPath = writePluginFile('test-plugin', SIMPLE_PLUGIN_CODE);

    const instance = await loader.loadPlugin(pluginPath, 'test-plugin');
    expect(instance.loaded).toBe(true);
    expect(instance.status).toBe('loaded');

    const site = loader.getSite('test-site');
    expect(site).toBeDefined();
    expect(site?.name).toBe('test-site');
  });

  it('should not block other plugins when one fails to load', async () => {
    const badPluginPath = writePluginFile('bad-plugin', BAD_PLUGIN_CODE);
    const goodPluginPath = writePluginFile('good-plugin', GOOD_PLUGIN_CODE);

    await expect(loader.loadPlugin(badPluginPath, 'bad-plugin')).rejects.toThrow(
      'intentional failure'
    );

    const goodInstance = await loader.loadPlugin(goodPluginPath, 'good-plugin');
    expect(goodInstance.loaded).toBe(true);
    expect(loader.getSite('good-site')).toBeDefined();
  });

  it('should clean up registrations when plugin is unloaded', async () => {
    const pluginPath = writePluginFile('cleanup-plugin', CLEANUP_PLUGIN_CODE);

    await loader.loadPlugin(pluginPath, 'cleanup-plugin');
    expect(loader.getSite('cleanup-plugin')).toBeDefined();

    await loader.unloadPlugin('cleanup-plugin');
    expect(loader.getSite('cleanup-plugin')).toBeUndefined();
    expect(loader.getPlugin('cleanup-plugin')).toBeUndefined();
  });

  it('should persist storage across plugin lifecycle', async () => {
    const storage = new PluginStorage('test-storage-persist');
    await storage.set('key1', 'value1');
    await storage.set('key2', { nested: true });

    const storage2 = new PluginStorage('test-storage-persist');
    expect(await storage2.get('key1')).toBe('value1');
    expect(await storage2.get('key2')).toEqual({ nested: true });

    await storage.clear();
  });

  it('should override same-name plugin', async () => {
    const v1Path = writePluginFile('override-v1', OVERRIDE_V1_CODE);
    const v2Path = writePluginFile('override-v2', OVERRIDE_V2_CODE);

    await loader.loadPlugin(v1Path, 'override-site');
    expect(loader.getSite('override-site')?.url).toBe('https://v1.com');

    await loader.loadPlugin(v2Path, 'override-site');
    expect(loader.getSite('override-site')?.url).toBe('https://v2.com');
  });
});
