export type {
  PluginInstallerType,
  InstallOptions,
  PluginInstance as InstalledPluginInstance,
  PluginInstaller,
} from './plugin-installer.js';

export { LocalInstaller } from './installers/local-installer.js';
export { NpmInstaller } from './installers/npm-installer.js';
export { GitInstaller } from './installers/git-installer.js';
export { UrlInstaller } from './installers/url-installer.js';
export { BuiltinInstaller } from './installers/builtin-installer.js';

export { PluginInstallerRegistry } from './plugin-installer-registry.js';
export type { InstallerRegistryConfig } from './plugin-installer-registry.js';

// Utility functions for plugin installation
export {
  downloadToFile,
  extractTarGz,
  flattenPackageRoot,
  safeCleanup,
} from './installers/index.js';
export type { PluginVerifyResult } from './installers/index.js';
