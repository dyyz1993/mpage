import type { PluginInstaller, PluginInstance, InstallOptions } from '../plugin-installer.js';
import * as fs from 'fs';
import * as path from 'path';

export class BuiltinInstaller implements PluginInstaller {
  readonly type = 'builtin' as const;
  private builtinDir: string;

  constructor(builtinDir: string) {
    this.builtinDir = builtinDir;
  }

  // eslint-disable-next-line require-await
  async install(source: string, _options?: InstallOptions): Promise<PluginInstance> {
    const pluginPath = path.join(this.builtinDir, source);

    if (!fs.existsSync(pluginPath)) {
      throw new Error(`Built-in plugin not found: ${source}`);
    }

    const pkgPath = path.join(pluginPath, 'package.json');
    let name = source;
    let version = '1.0.0';

    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
        name?: string;
        version?: string;
      };
      name = pkg.name || name;
      version = pkg.version || version;
    }

    return {
      id: `builtin:${source}`,
      name,
      version,
      type: 'builtin',
      source,
      path: pluginPath,
      installedAt: Date.now(),
    };
  }

  // eslint-disable-next-line require-await
  async uninstall(_pluginId: string): Promise<void> {
    throw new Error('Cannot uninstall built-in plugins');
  }

  // eslint-disable-next-line require-await
  async update(_pluginId: string): Promise<PluginInstance> {
    throw new Error('Built-in plugins are updated with the CLI');
  }

  async list(): Promise<PluginInstance[]> {
    if (!fs.existsSync(this.builtinDir)) return [];

    const entries = fs.readdirSync(this.builtinDir, { withFileTypes: true });
    const plugins: PluginInstance[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;

      try {
        const instance = await this.install(entry.name);
        plugins.push(instance);
      } catch {
        // skip invalid
      }
    }

    return plugins;
  }
}
