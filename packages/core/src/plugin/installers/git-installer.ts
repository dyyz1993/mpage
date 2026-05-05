import type { PluginInstaller, PluginInstance, InstallOptions } from '../plugin-installer.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class GitInstaller implements PluginInstaller {
  readonly type = 'git' as const;
  private pluginsDir: string;

  constructor(pluginsDir: string) {
    this.pluginsDir = pluginsDir;
  }

  // eslint-disable-next-line require-await
  async install(source: string, options?: InstallOptions): Promise<PluginInstance> {
    let repoUrl = source;
    if (source.startsWith('github:')) {
      repoUrl = `https://github.com/${source.slice(7)}`;
    }
    if (!repoUrl.endsWith('.git')) {
      repoUrl += '.git';
    }

    const nameMatch = repoUrl.match(/\/([^/]+?)(\.git)?$/);
    const name = nameMatch?.[1] || 'unknown-plugin';
    const targetDir = path.join(this.pluginsDir, name);

    if (fs.existsSync(targetDir)) {
      if (options?.force) {
        fs.rmSync(targetDir, { recursive: true });
      } else {
        throw new Error(`Plugin already exists at ${targetDir}. Use --force to overwrite.`);
      }
    }

    try {
      execSync(`git clone ${repoUrl} ${targetDir}`, { stdio: 'pipe' });
    } catch {
      throw new Error(`Failed to clone ${repoUrl}`);
    }

    const pkgPath = path.join(targetDir, 'package.json');
    let version = '0.0.0';
    let pkgName = name;

    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
        name?: string;
        version?: string;
      };
      pkgName = pkg.name || pkgName;
      version = pkg.version || version;
    }

    return {
      id: `git:${name}`,
      name: pkgName,
      version,
      type: 'git',
      source,
      path: targetDir,
      installedAt: Date.now(),
    };
  }

  // eslint-disable-next-line require-await
  async uninstall(pluginId: string): Promise<void> {
    const [, name] = pluginId.split(':');
    const targetDir = path.join(this.pluginsDir, name);
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true });
    }
  }

  // eslint-disable-next-line require-await
  async update(pluginId: string): Promise<PluginInstance> {
    const [, name] = pluginId.split(':');
    const targetDir = path.join(this.pluginsDir, name);

    if (fs.existsSync(path.join(targetDir, '.git'))) {
      try {
        execSync(`git -C ${targetDir} pull`, { stdio: 'pipe' });
      } catch {
        // pull failed, use current
      }
    }

    const pkgPath = path.join(targetDir, 'package.json');
    let version = '0.0.0';
    let pkgName = name;

    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
        name?: string;
        version?: string;
      };
      pkgName = pkg.name || pkgName;
      version = pkg.version || version;
    }

    let remoteUrl = '';
    try {
      remoteUrl = execSync(`git -C ${targetDir} remote get-url origin`, {
        encoding: 'utf-8',
      }).trim();
    } catch {
      // no remote
    }

    return {
      id: `git:${name}`,
      name: pkgName,
      version,
      type: 'git',
      source: remoteUrl,
      path: targetDir,
      installedAt: Date.now(),
    };
  }

  // eslint-disable-next-line require-await
  async list(): Promise<PluginInstance[]> {
    const plugins: PluginInstance[] = [];
    if (!fs.existsSync(this.pluginsDir)) return plugins;

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!fs.existsSync(path.join(this.pluginsDir, entry.name, '.git'))) continue;

      const pkgPath = path.join(this.pluginsDir, entry.name, 'package.json');
      let version = '0.0.0';
      let pkgName = entry.name;

      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
          name?: string;
          version?: string;
        };
        pkgName = pkg.name || pkgName;
        version = pkg.version || version;
      }

      plugins.push({
        id: `git:${entry.name}`,
        name: pkgName,
        version,
        type: 'git',
        source: '',
        path: path.join(this.pluginsDir, entry.name),
        installedAt: fs.statSync(path.join(this.pluginsDir, entry.name)).mtimeMs,
      });
    }

    return plugins;
  }
}
