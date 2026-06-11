import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Shared dependencies automatically provisioned into the plugin install
 * directory so plugins can `import` them without each one bundling their
 * own copy. Adjust ranges carefully — these versions are part of the
 * public contract for plugin authors.
 */
export const SHARED_PLUGIN_DEPENDENCIES: Record<string, string> = {
  zod: '^3.24.0',
  '@dyyz1993/xcli-core': '^0.13.0',
};

const DEFAULT_DESCRIPTION = 'xcli plugins — shared dependencies';

interface PackageJsonShape {
  name?: string;
  version?: string;
  description?: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Ensure the plugins directory has a `node_modules` containing the shared
 * dependencies plugins may import.
 *
 * Strategy:
 * 1. If `node_modules/zod` is already present, treat the directory as
 *    fully provisioned and return without changes.
 * 2. Otherwise, create or merge a `package.json` declaring the shared
 *    dependencies (preserving any existing entries), and run `npm install`.
 * 3. If `npm install` fails (offline, network, etc.) the failure is
 *    downgraded to a console warning so installation of the plugin itself
 *    is not blocked.
 */
export function ensurePluginDependencies(pluginsDir: string): void {
  const zodProbe = join(pluginsDir, 'node_modules', 'zod');
  if (existsSync(zodProbe)) return;

  mkdirSync(pluginsDir, { recursive: true });

  const pkgPath = join(pluginsDir, 'package.json');
  let pkg: PackageJsonShape = {};
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJsonShape;
    } catch {
      // Corrupt package.json: start from a blank object.
      pkg = {};
    }
  }

  const existingDeps: Record<string, string> = { ...(pkg.dependencies ?? {}) };
  let needsInstall = false;

  for (const [dep, version] of Object.entries(SHARED_PLUGIN_DEPENDENCIES)) {
    if (!existingDeps[dep]) {
      existingDeps[dep] = version;
      needsInstall = true;
    }
  }

  if (!needsInstall && existsSync(join(pluginsDir, 'node_modules'))) return;

  pkg.dependencies = existingDeps;
  pkg.private = true;
  pkg.description = pkg.description ?? DEFAULT_DESCRIPTION;

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

  try {
    execSync('npm install --production --no-package-lock --no-fund --no-audit', {
      cwd: pluginsDir,
      stdio: 'pipe',
      timeout: 60_000,
      env: { ...process.env, NODE_ENV: 'production' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[xcli-core] Failed to install shared plugin dependencies: ${msg}`);
  }
}
