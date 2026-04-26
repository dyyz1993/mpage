import { readdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CommandValues } from '../core/types';
import { globalLoader } from '../core/plugin-loader';

const GLOBAL_PLUGINS_DIR = join(homedir(), '.xcli', 'plugins');
const LOCAL_PLUGINS_DIR = '.xcli/plugins';

interface PluginInfo {
  name: string;
  version: string;
  location: string;
  path: string;
}

export async function pluginsCommand(args: string[], values: CommandValues) {
  const action = args[0] || 'list';
  const filterGlobal = values.global || values.g;
  const filterLocal = values.project || values.p;

  if (action === 'list' || action === 'ls') {
    const allPlugins = getAllPlugins();

    let plugins = allPlugins;
    if (filterGlobal) {
      plugins = plugins.filter((p) => p.location === 'global');
    } else if (filterLocal) {
      plugins = plugins.filter((p) => p.location === 'local');
    }

    if (plugins.length === 0) {
      console.log('No plugins found');
      return;
    }

    const loadedPlugins = globalLoader.getLoadedPlugins();
    const loadedMap = new Map(loadedPlugins.map((p) => [p.id, p]));

    console.log('Installed plugins:');
    for (const plugin of plugins) {
      const locLabel = plugin.location === 'global' ? '[global]' : '[local]';
      const instance = loadedMap.get(plugin.name);
      const statusLabel = instance ? `[${instance.status}]` : '[unloaded]';
      console.log(
        `  ${plugin.name.padEnd(20)} v${plugin.version.padEnd(8)} ${locLabel.padEnd(9)} ${statusLabel}`
      );
    }
    return;
  }

  if (action === 'info') {
    const name = args[1];
    if (!name) {
      console.error('Usage: xcli plugins info <name>');
      return;
    }

    const globalPath = join(GLOBAL_PLUGINS_DIR, name);
    const localPath = join(LOCAL_PLUGINS_DIR, name);

    let found = false;
    for (const [pluginPath, location] of [
      [globalPath, 'global'],
      [localPath, 'local'],
    ] as const) {
      if (existsSync(pluginPath)) {
        const pkgPath = join(pluginPath, 'package.json');
        console.log(`Name: ${name}`);
        console.log(`Location: ${location}`);
        console.log(`Path: ${pluginPath}`);
        if (existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            console.log(`Version: ${pkg.version}`);
            console.log(`Description: ${pkg.description || 'N/A'}`);
          } catch {
            // ignore parse error
          }
        }
        const instance = globalLoader.getPlugin(name);
        if (instance) {
          console.log(`Status: ${instance.status}`);
          console.log(`Loaded: ${instance.loaded}`);
          console.log(`Commands: ${instance.getRegisteredCommands().join(', ') || 'none'}`);
          console.log(`Flags: ${instance.getRegisteredFlags().join(', ') || 'none'}`);
          console.log(`Tools: ${instance.getRegisteredTools().join(', ') || 'none'}`);
          if (instance.error) {
            console.log(`Error: ${instance.error.message}`);
          }
        } else {
          console.log('Status: not loaded');
        }
        found = true;
        break;
      }
    }

    if (!found) {
      console.error(`Plugin "${name}" not found`);
    }
    return;
  }

  if (action === 'reload') {
    const name = args[1];
    if (!name) {
      console.error('Usage: xcli plugins reload <name>');
      return;
    }
    try {
      const instance = await globalLoader.reloadPlugin(name);
      console.log(`Plugin "${name}" reloaded (status: ${instance.status})`);
    } catch (err) {
      console.error(
        `Failed to reload plugin "${name}": ${err instanceof Error ? err.message : err}`
      );
    }
    return;
  }

  if (action === 'unload') {
    const name = args[1];
    if (!name) {
      console.error('Usage: xcli plugins unload <name>');
      return;
    }
    try {
      await globalLoader.unloadPlugin(name);
      console.log(`Plugin "${name}" unloaded`);
    } catch (err) {
      console.error(
        `Failed to unload plugin "${name}": ${err instanceof Error ? err.message : err}`
      );
    }
    return;
  }

  console.log('Usage: xcli plugins <list|info|reload|unload> [--global|--project]');
}

function getAllPlugins(): PluginInfo[] {
  const plugins: PluginInfo[] = [];

  if (existsSync(GLOBAL_PLUGINS_DIR)) {
    const entries = readdirSync(GLOBAL_PLUGINS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        plugins.push({
          name: entry.name,
          version: getPluginVersion(join(GLOBAL_PLUGINS_DIR, entry.name)),
          location: 'global',
          path: join(GLOBAL_PLUGINS_DIR, entry.name),
        });
      }
    }
  }

  if (existsSync(LOCAL_PLUGINS_DIR)) {
    const entries = readdirSync(LOCAL_PLUGINS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        plugins.push({
          name: entry.name,
          version: getPluginVersion(join(LOCAL_PLUGINS_DIR, entry.name)),
          location: 'local',
          path: join(LOCAL_PLUGINS_DIR, entry.name),
        });
      }
    }
  }

  return plugins;
}

function getPluginVersion(pluginPath: string): string {
  const pkgPath = join(pluginPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      return pkg.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }
  return '1.0.0';
}
