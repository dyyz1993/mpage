import type { PluginInstaller, PluginInstance, InstallOptions } from '../plugin-installer.js';
import * as fs from 'fs';
import * as path from 'path';

interface UrlPluginMeta {
  source: string;
}

export class UrlInstaller implements PluginInstaller {
  readonly type = 'url' as const;
  private pluginsDir: string;

  constructor(pluginsDir: string) {
    this.pluginsDir = pluginsDir;
  }

  private get urlPluginsDir(): string {
    return path.join(this.pluginsDir, 'url-plugins');
  }

  private metaPath(name: string): string {
    return path.join(this.urlPluginsDir, `${name}.meta.json`);
  }

  private saveMeta(name: string, meta: UrlPluginMeta): void {
    const dir = this.urlPluginsDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.metaPath(name), JSON.stringify(meta, null, 2), 'utf-8');
  }

  private loadMeta(name: string): UrlPluginMeta | null {
    const p = this.metaPath(name);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as UrlPluginMeta;
  }

  async install(source: string, _options?: InstallOptions): Promise<PluginInstance> {
    const url = new URL(source);
    const filename = path.basename(url.pathname) || 'plugin.js';
    const name = filename.replace(/\.(js|ts|mjs)$/, '');
    const targetPath = path.join(this.urlPluginsDir, filename);

    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to download plugin from ${source}: ${response.status}`);
    }

    const content = await response.text();

    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(targetPath, content, 'utf-8');
    this.saveMeta(name, { source });

    return {
      id: `url:${name}`,
      name,
      version: new Date().toISOString().split('T')[0],
      type: 'url',
      source,
      path: targetPath,
      installedAt: Date.now(),
    };
  }

  // eslint-disable-next-line require-await
  async uninstall(pluginId: string): Promise<void> {
    const [, name] = pluginId.split(':');
    const dir = this.urlPluginsDir;
    for (const ext of ['.js', '.ts', '.mjs']) {
      const filePath = path.join(dir, `${name}${ext}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    const meta = this.metaPath(name);
    if (fs.existsSync(meta)) {
      fs.unlinkSync(meta);
    }
  }

  // eslint-disable-next-line require-await
  async update(pluginId: string): Promise<PluginInstance> {
    const [, name] = pluginId.split(':');
    const meta = this.loadMeta(name);
    if (!meta) {
      throw new Error(`URL plugin update requires stored source URL for ${name}`);
    }
    return this.install(meta.source);
  }

  // eslint-disable-next-line require-await
  async list(): Promise<PluginInstance[]> {
    const dir = this.urlPluginsDir;
    if (!fs.existsSync(dir)) return [];

    return fs
      .readdirSync(dir)
      .filter((f) => /\.(js|ts|mjs)$/.test(f))
      .map((f) => {
        const name = f.replace(/\.(js|ts|mjs)$/, '');
        const meta = this.loadMeta(name);
        return {
          id: `url:${name}`,
          name,
          version: 'unknown',
          type: 'url' as const,
          source: meta?.source || '',
          path: path.join(dir, f),
          installedAt: fs.statSync(path.join(dir, f)).mtimeMs,
        };
      });
  }
}
