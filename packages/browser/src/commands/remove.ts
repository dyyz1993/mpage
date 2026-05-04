import { rmSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CommandValues, Core } from '@xcli/core';

const GLOBAL_PLUGINS_DIR = join(homedir(), '.xcli', 'plugins');
const LOCAL_PLUGINS_DIR = '.xcli/plugins';
const STORAGE_DIR = join(homedir(), '.xcli', 'storage');

function resolvePluginDir(
  name: string,
  isGlobal: boolean
): { dir: string; location: string } | null {
  if (isGlobal) {
    const globalDir = join(GLOBAL_PLUGINS_DIR, name);
    if (existsSync(globalDir)) return { dir: globalDir, location: '[global]' };
    const localDir = join(LOCAL_PLUGINS_DIR, name);
    if (existsSync(localDir)) return { dir: localDir, location: '[local]' };
  } else {
    const localDir = join(LOCAL_PLUGINS_DIR, name);
    if (existsSync(localDir)) return { dir: localDir, location: '[local]' };
    const globalDir = join(GLOBAL_PLUGINS_DIR, name);
    if (existsSync(globalDir)) return { dir: globalDir, location: '[global]' };
  }
  return null;
}

function cleanupStorage(pluginName: string): void {
  const storageFile = join(STORAGE_DIR, `${pluginName}.json`);
  if (existsSync(storageFile)) {
    try {
      unlinkSync(storageFile);
    } catch {
      // ignore cleanup errors
    }
  }
}

export async function removeCommand(args: string[], values: CommandValues, core?: Core) {
  const isGlobal = Boolean(values.global || values.g || (!values.project && !values.p));
  const name = args[0];

  if (!name) {
    console.error('Usage: xcli remove <name> [--global|--project]');
    console.error('');
    console.error('Flags:');
    console.error('  -g, --global    卸载全局插件 (默认)');
    console.error('  -p, --project  卸载本地插件');
    process.exit(1);
  }

  const resolved = resolvePluginDir(name, isGlobal);
  if (!resolved) {
    console.error(`Plugin "${name}" not found`);
    process.exit(1);
  }

  const instance = core?.loader.getPlugin(name);
  if (instance && instance.loaded) {
    try {
      await core?.loader.unloadPlugin(name);
      console.log(`Unloaded: ${name}`);
    } catch (err) {
      console.error(
        `Warning: failed to unload plugin "${name}": ${err instanceof Error ? err.message : err}`
      );
    }
  }

  cleanupStorage(name);

  rmSync(resolved.dir, { recursive: true, force: true });
  console.log(`Removed: ${name} ${resolved.location}`);
  console.log(`  Plugin directory: ${resolved.dir}`);

  const storageFile = join(STORAGE_DIR, `${name}.json`);
  if (!existsSync(storageFile)) {
    console.log(`  Storage cleaned: ${storageFile}`);
  }
}
