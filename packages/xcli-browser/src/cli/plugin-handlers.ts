import {
  type CommandValues,
  type CommandArgs,
  ok,
  fail,
  type CommandResult,
  PluginInstallerRegistry,
  type InstallerRegistryConfig,
  type PluginInstallerType,
} from '@dyyz1993/xcli-core';
import { join } from 'path';
import { homedir } from 'os';

function getPluginsDir(): string {
  return join(process.cwd(), '.xcli', 'plugins');
}

function createRegistry(): PluginInstallerRegistry {
  const config: InstallerRegistryConfig = {
    pluginsDir: getPluginsDir(),
    builtinDir: join(homedir(), '.xcli', 'builtins'),
  };
  return new PluginInstallerRegistry(config);
}

function detectSourceType(source: string): PluginInstallerType {
  if (source.startsWith('./') || source.startsWith('../') || source.startsWith('/')) {
    return 'local';
  }
  if (source.startsWith('git+') || source.endsWith('.git')) {
    return 'git';
  }
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return 'url';
  }
  return 'npm';
}

export async function handlePluginInstall(
  args: CommandArgs,
  values: CommandValues
): Promise<CommandResult> {
  const source = args[0];
  if (!source) {
    return fail('Missing plugin source', ['Usage: xcli-browser plugin install <source>']);
  }

  const registry = createRegistry();
  const type = detectSourceType(source);
  const force = values.force as boolean;

  try {
    const instance = await registry.install(type, source, { force });
    return ok(
      { id: instance.id, name: instance.name, version: instance.version, type: instance.type },
      [`Plugin '${instance.name}' installed`]
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(msg);
  }
}

export async function handlePluginUninstall(
  args: CommandArgs,
  _values: CommandValues
): Promise<CommandResult> {
  const pluginId = args[0];
  if (!pluginId) {
    return fail('Missing plugin id', ['Usage: xcli-browser plugin uninstall <id>']);
  }

  const registry = createRegistry();
  try {
    await registry.uninstall(pluginId);
    return ok(null, [`Plugin '${pluginId}' uninstalled`]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(msg);
  }
}

export async function handlePluginList(
  _args: CommandArgs,
  _values: CommandValues
): Promise<CommandResult> {
  const registry = createRegistry();
  try {
    const plugins = await registry.listAll();
    if (plugins.length === 0) {
      return ok(
        [],
        ['No plugins installed. Use "xcli-browser plugin install <source>" to install one.']
      );
    }
    return ok(
      plugins.map((p) => ({
        id: p.id,
        name: p.name,
        version: p.version,
        type: p.type,
      }))
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(msg);
  }
}

export function handlePluginHelp(): string {
  return [
    'Usage: xcli-browser plugin <command>',
    '',
    'Commands:',
    '  install <source>       Install plugin (local/npm/git/url)',
    '  uninstall <id>         Uninstall plugin',
    '  list                   List installed plugins',
    '',
    'Examples:',
    '  xcli-browser plugin install ./my-plugin',
    '  xcli-browser plugin install xcli-plugin-baidu',
    '  xcli-browser plugin install git+https://github.com/user/plugin.git',
  ].join('\n');
}
