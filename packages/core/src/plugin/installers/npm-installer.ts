import type { PluginInstaller, PluginInstance, InstallOptions } from '../plugin-installer.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class NpmInstaller implements PluginInstaller {
  readonly type = 'npm' as const;
  private pluginsDir: string;

  constructor(pluginsDir: string) {
    this.pluginsDir = pluginsDir;
  }

  // eslint-disable-next-line require-await
  async install(source: string, options?: InstallOptions): Promise<PluginInstance> {
    const version = options?.version ? `@${options.version}` : '';
    const registry = options?.registry ? `--registry=${options.registry}` : '';

    try {
      execSync(`npm install ${source}${version} ${registry} --prefix ${this.pluginsDir}`, {
        stdio: 'pipe',
        encoding: 'utf-8',
      });
    } catch (e: unknown) {
      const err = e as { stderr?: string };
      throw new Error(`Failed to install ${source}: ${err.stderr || 'unknown error'}`);
    }

    const pkgPath = path.join(this.pluginsDir, 'node_modules', source, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      throw new Error(`Package ${source} installed but package.json not found`);
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      name: string;
      version: string;
    };

    return {
      id: `npm:${source}`,
      name: pkg.name,
      version: pkg.version,
      type: 'npm',
      source,
      path: path.join(this.pluginsDir, 'node_modules', source),
      installedAt: Date.now(),
    };
  }

  // eslint-disable-next-line require-await
  async uninstall(pluginId: string): Promise<void> {
    const [, name] = pluginId.split(':');
    try {
      execSync(`npm uninstall ${name} --prefix ${this.pluginsDir}`, { stdio: 'pipe' });
    } catch {
      // already uninstalled or not found
    }
  }

  // eslint-disable-next-line require-await
  async update(pluginId: string): Promise<PluginInstance> {
    const [, name] = pluginId.split(':');
    try {
      execSync(`npm update ${name} --prefix ${this.pluginsDir}`, { stdio: 'pipe' });
    } catch {
      // update failed, return current
    }
    return this.install(name);
  }

  async list(): Promise<PluginInstance[]> {
    const nmPath = path.join(this.pluginsDir, 'node_modules');
    if (!fs.existsSync(nmPath)) return [];

    const plugins: PluginInstance[] = [];
    const entries = fs.readdirSync(nmPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const scanDir = entry.name.startsWith('@') ? path.join(nmPath, entry.name) : nmPath;
      const pkgPrefix = entry.name.startsWith('@') ? `${entry.name}/` : '';

      if (entry.name.startsWith('@')) {
        const scoped = fs.readdirSync(scanDir, { withFileTypes: true });
        for (const sub of scoped) {
          if (!sub.isDirectory()) continue;
          const pkgJsonPath = path.join(scanDir, sub.name, 'package.json');
          if (!fs.existsSync(pkgJsonPath)) continue;
          try {
            const instance = await this.install(`${pkgPrefix}${sub.name}`);
            plugins.push(instance);
          } catch {
            // skip invalid
          }
        }
      } else {
        const pkgJsonPath = path.join(nmPath, entry.name, 'package.json');
        if (!fs.existsSync(pkgJsonPath)) continue;
        try {
          const instance = await this.install(entry.name);
          plugins.push(instance);
        } catch {
          // skip invalid
        }
      }
    }

    return plugins;
  }
}
