import type { PluginInstaller, PluginInstance, InstallOptions } from '../plugin-installer.js';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
  cpSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  downloadToFile,
  extractTarGz,
  flattenPackageRoot,
  verifyPlugin,
  safeCleanup,
} from './utils.js';

interface NpmVersionMeta {
  dist?: { tarball?: string };
  main?: string;
}

interface NpmPackageMeta {
  'dist-tags'?: Record<string, string>;
  versions: Record<string, NpmVersionMeta>;
}

const encodeName = (name: string): string =>
  name.startsWith('@') ? `@${encodeURIComponent(name.slice(1))}` : encodeURIComponent(name);

const resolveRegistry = (registry: string | undefined, name: string): string => {
  const base = registry ?? 'https://registry.npmjs.org';
  return `${base.replace(/\/+$/, '')}/${encodeName(name)}`;
};

const stripScope = (name: string): string => {
  if (!name.startsWith('@')) return name;
  const slash = name.indexOf('/');
  return slash >= 0 ? name.slice(slash + 1) : name;
};

const scopedPath = (pluginsDir: string, name: string): string => {
  if (name.startsWith('@')) {
    const slash = name.indexOf('/');
    if (slash < 0) return join(pluginsDir, 'node_modules', stripScope(name));
    return join(pluginsDir, 'node_modules', name.slice(0, slash), name.slice(slash + 1));
  }
  return join(pluginsDir, 'node_modules', name);
};

/**
 * Plugin installer for the npm registry.
 *
 * Implementation follows the `fetch registry → download tarball → extract
 * → flatten package/ root → verify` pipeline used by the rest of the
 * installer family. We do not shell out to `npm install` so installation
 * works in environments where the npm CLI is unavailable or undesired
 * (e.g. inside a daemon process).
 */
export class NpmInstaller implements PluginInstaller {
  readonly type = 'npm' as const;
  private readonly pluginsDir: string;

  constructor(pluginsDir: string) {
    this.pluginsDir = pluginsDir;
  }

  async install(source: string, options?: InstallOptions): Promise<PluginInstance> {
    const meta = await this.fetchMeta(source, options?.registry);
    const version = options?.version ?? meta['dist-tags']?.latest;
    if (!version) {
      throw new Error(`No version available for "${source}"`);
    }
    const tarballUrl = meta.versions[version]?.dist?.tarball;
    if (!tarballUrl) {
      throw new Error(`No tarball URL for ${source}@${version}`);
    }

    const installPath = scopedPath(this.pluginsDir, source);
    const tmpRoot = join(
      tmpdir(),
      `xcli-core-npm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    mkdirSync(tmpRoot, { recursive: true });

    try {
      const tarballPath = join(tmpRoot, `${stripScope(source)}.tgz`);
      await downloadToFile(tarballUrl, tarballPath);

      const extractDir = join(tmpRoot, 'extracted');
      extractTarGz(tarballPath, extractDir);
      flattenPackageRoot(extractDir);

      const verify = verifyPlugin(extractDir);
      if (!verify.valid) {
        throw new Error(`Invalid npm plugin: ${verify.error}`);
      }

      if (existsSync(installPath)) {
        rmSync(installPath, { recursive: true, force: true });
      }
      mkdirSync(installPath, { recursive: true });
      cpSync(extractDir, installPath, { recursive: true, force: true });

      const pkgPath = join(installPath, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
        name: string;
        version: string;
        _npmSource?: { name: string; version: string };
      };
      if (!pkg._npmSource) {
        pkg._npmSource = { name: source, version };
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
      }

      return {
        id: `npm:${source}`,
        name: pkg.name ?? source,
        version: pkg.version ?? version,
        type: 'npm',
        source,
        path: installPath,
        installedAt: Date.now(),
      };
    } finally {
      safeCleanup(tmpRoot);
    }
  }

  uninstall(pluginId: string): Promise<void> {
    const name = pluginId.slice(pluginId.indexOf(':') + 1);
    if (!name) return Promise.resolve();
    const target = scopedPath(this.pluginsDir, name);
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
    }
    // If the @scope directory is now empty, remove it too.
    if (name.startsWith('@')) {
      const slash = name.indexOf('/');
      if (slash > 0) {
        const scopeDir = join(this.pluginsDir, 'node_modules', name.slice(0, slash));
        if (existsSync(scopeDir)) {
          try {
            const remaining = readdirSync(scopeDir);
            if (remaining.length === 0) rmSync(scopeDir, { recursive: true, force: true });
          } catch {
            /* best-effort cleanup */
          }
        }
      }
    }
    return Promise.resolve();
  }

  async update(pluginId: string): Promise<PluginInstance> {
    const name = pluginId.slice(pluginId.indexOf(':') + 1);
    if (!name) {
      throw new Error(`Cannot update: invalid plugin id "${pluginId}"`);
    }
    await this.uninstall(pluginId);
    return this.install(name);
  }

  list(): Promise<PluginInstance[]> {
    const nmPath = join(this.pluginsDir, 'node_modules');
    if (!existsSync(nmPath)) return Promise.resolve([]);

    const plugins: PluginInstance[] = [];
    const entries = readdirSync(nmPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      if (entry.name.startsWith('@')) {
        const scoped = readdirSync(join(nmPath, entry.name), { withFileTypes: true });
        for (const sub of scoped) {
          if (!sub.isDirectory()) continue;
          const pkg = this.tryReadPackage(join(nmPath, entry.name, sub.name));
          if (pkg) {
            plugins.push({
              id: `npm:${entry.name}/${sub.name}`,
              name: `${entry.name}/${sub.name}`,
              version: pkg.version,
              type: 'npm',
              source: `${entry.name}/${sub.name}`,
              path: join(nmPath, entry.name, sub.name),
              installedAt: 0,
            });
          }
        }
      } else {
        const pkg = this.tryReadPackage(join(nmPath, entry.name));
        if (pkg) {
          plugins.push({
            id: `npm:${entry.name}`,
            name: pkg.name ?? entry.name,
            version: pkg.version,
            type: 'npm',
            source: entry.name,
            path: join(nmPath, entry.name),
            installedAt: 0,
          });
        }
      }
    }

    return Promise.resolve(plugins);
  }

  private async fetchMeta(name: string, registry: string | undefined): Promise<NpmPackageMeta> {
    const url = resolveRegistry(registry, name);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Package "${name}" not found on npm (HTTP ${res.status})`);
    }
    return (await res.json()) as NpmPackageMeta;
  }

  private tryReadPackage(dir: string): { name?: string; version: string } | null {
    const pkgPath = join(dir, 'package.json');
    if (!existsSync(pkgPath)) return null;
    try {
      return JSON.parse(readFileSync(pkgPath, 'utf-8')) as { name?: string; version: string };
    } catch {
      return null;
    }
  }
}
