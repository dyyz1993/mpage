import type {
  PluginInstallerType,
  PluginInstance,
  InstallOptions,
  PluginInstaller,
} from './plugin-installer.js';
import { LocalInstaller } from './installers/local-installer.js';
import { NpmInstaller } from './installers/npm-installer.js';
import { GitInstaller } from './installers/git-installer.js';
import { UrlInstaller } from './installers/url-installer.js';
import { BuiltinInstaller } from './installers/builtin-installer.js';

export interface InstallerRegistryConfig {
  pluginsDir: string;
  builtinDir?: string;
}

export class PluginInstallerRegistry {
  private installers: Map<PluginInstallerType, PluginInstaller> = new Map();

  constructor(config: InstallerRegistryConfig) {
    this.installers.set('local', new LocalInstaller(config.pluginsDir));
    this.installers.set('npm', new NpmInstaller(config.pluginsDir));
    this.installers.set('git', new GitInstaller(config.pluginsDir));
    this.installers.set('url', new UrlInstaller(config.pluginsDir));
    if (config.builtinDir) {
      this.installers.set('builtin', new BuiltinInstaller(config.builtinDir));
    }
  }

  registerInstaller(type: PluginInstallerType, installer: PluginInstaller): void {
    this.installers.set(type, installer);
  }

  getInstaller(type: PluginInstallerType): PluginInstaller | undefined {
    return this.installers.get(type);
  }

  // eslint-disable-next-line require-await
  async install(
    type: PluginInstallerType,
    source: string,
    options?: InstallOptions
  ): Promise<PluginInstance> {
    const installer = this.installers.get(type);
    if (!installer) throw new Error(`No installer registered for type: ${type}`);
    return installer.install(source, options);
  }

  // eslint-disable-next-line require-await
  async uninstall(pluginId: string): Promise<void> {
    const type = pluginId.split(':')[0] as PluginInstallerType;
    const installer = this.installers.get(type);
    if (!installer) throw new Error(`No installer for type: ${type}`);
    return installer.uninstall(pluginId);
  }

  // eslint-disable-next-line require-await
  async update(pluginId: string): Promise<PluginInstance> {
    const type = pluginId.split(':')[0] as PluginInstallerType;
    const installer = this.installers.get(type);
    if (!installer) throw new Error(`No installer for type: ${type}`);
    return installer.update(pluginId);
  }

  async listAll(): Promise<PluginInstance[]> {
    const results: PluginInstance[] = [];
    for (const installer of this.installers.values()) {
      try {
        const plugins = await installer.list();
        results.push(...plugins);
      } catch {
        // skip failed installer
      }
    }
    return results;
  }
}
