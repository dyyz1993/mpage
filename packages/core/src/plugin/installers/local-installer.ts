import type { PluginInstaller, PluginInstance, InstallOptions } from '../plugin-installer.js';
import * as fs from 'fs';
import * as path from 'path';

export class LocalInstaller implements PluginInstaller {
  readonly type = 'local' as const;
  private pluginsDir: string;

  constructor(pluginsDir: string) {
    this.pluginsDir = pluginsDir;
  }

  // eslint-disable-next-line require-await
  async install(source: string, _options?: InstallOptions): Promise<PluginInstance> {
    const resolvedPath = path.isAbsolute(source) ? source : path.resolve(this.pluginsDir, source);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Plugin directory not found: ${resolvedPath}`);
    }

    const indexPath = fs.existsSync(path.join(resolvedPath, 'index.ts'))
      ? path.join(resolvedPath, 'index.ts')
      : path.join(resolvedPath, 'index.js');

    if (!fs.existsSync(indexPath)) {
      throw new Error(`Plugin entry not found: ${indexPath}`);
    }

    const pkgPath = path.join(resolvedPath, 'package.json');
    let name = path.basename(resolvedPath);
    let version = '0.0.0';

    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
        name?: string;
        version?: string;
      };
      name = pkg.name || name;
      version = pkg.version || version;
    }

    return {
      id: `local:${name}`,
      name,
      version,
      type: 'local',
      source,
      path: resolvedPath,
      installedAt: Date.now(),
    };
  }

  // eslint-disable-next-line require-await
  async uninstall(pluginId: string): Promise<void> {
    const [prefix] = pluginId.split(':');
    if (prefix !== 'local') return;
  }

  // eslint-disable-next-line require-await
  async update(pluginId: string): Promise<PluginInstance> {
    const [, name] = pluginId.split(':');
    return this.install(name);
  }

  async list(): Promise<PluginInstance[]> {
    if (!fs.existsSync(this.pluginsDir)) return [];

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
    const plugins: PluginInstance[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;

      try {
        const instance = await this.install(entry.name);
        plugins.push(instance);
      } catch {
        // skip invalid plugins
      }
    }

    return plugins;
  }
}
