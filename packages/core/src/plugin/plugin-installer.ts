export type PluginInstallerType = 'local' | 'npm' | 'git' | 'url' | 'builtin';

export interface InstallOptions {
  force?: boolean;
  version?: string;
  registry?: string;
}

export interface PluginInstance {
  id: string;
  name: string;
  version: string;
  type: PluginInstallerType;
  source: string;
  path: string;
  installedAt: number;
}

export interface PluginInstaller {
  readonly type: PluginInstallerType;
  install(source: string, options?: InstallOptions): Promise<PluginInstance>;
  uninstall(pluginId: string): Promise<void>;
  update(pluginId: string): Promise<PluginInstance>;
  list(): Promise<PluginInstance[]>;
}
