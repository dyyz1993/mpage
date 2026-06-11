import {
  existsSync,
  readdirSync,
  cpSync,
  rmSync,
  mkdirSync,
  readFileSync,
  createWriteStream,
} from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

export interface PluginVerifyResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface VerifyPluginOptions {
  /**
   * package.json 内 metadata 字段名。
   * - 默认 `'xcli'`：通用消费者无需配置
   * - 消费者可显式传入自定义字段名（如 xbrowser 传 `'xbrowser'`）
   */
  metadataField?: string;
}

/**
 * Download a URL (or copy a `file://` URL) to a local destination path.
 *
 * Supports http(s) URLs via fetch streaming and local `file://` URLs via
 * `cpSync`. Throws on non-2xx HTTP responses or empty bodies.
 */
export async function downloadToFile(url: string, destPath: string): Promise<void> {
  if (url.startsWith('file://')) {
    const filePath = decodeURIComponent(new URL(url).pathname);
    cpSync(filePath, destPath, { force: true });
    return;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status} from ${url}`);
  }
  if (!res.body) {
    throw new Error(`No response body from ${url}`);
  }

  const nodeStream = Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]);
  await pipeline(nodeStream, createWriteStream(destPath));
}

/**
 * Extract a `.tar.gz` archive into the target directory by shelling out to
 * `tar -xzf`. Creates the target directory if it does not exist.
 */
export function extractTarGz(tarballPath: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });
  execSync(`tar -xzf "${tarballPath}" -C "${targetDir}"`, { stdio: 'pipe' });
}

/**
 * Flatten a single nested `package/` directory produced by npm tarballs.
 *
 * If `targetDir` contains exactly one subdirectory and no files, the contents
 * of that subdirectory are moved up one level and the wrapper is removed.
 * In all other cases the directory is left unchanged.
 */
export function flattenPackageRoot(targetDir: string): void {
  const entries = readdirSync(targetDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  const files = entries.filter((e) => !e.isDirectory());

  if (dirs.length !== 1 || files.length > 0) return;

  const pkgDir = resolve(targetDir, dirs[0].name);
  const items = readdirSync(pkgDir);
  for (const item of items) {
    const src = resolve(pkgDir, item);
    const dst = resolve(targetDir, item);
    cpSync(src, dst, { recursive: true, force: true });
  }
  rmSync(pkgDir, { recursive: true, force: true });
}

/**
 * Verify that `dir` looks like a valid plugin directory.
 *
 * Checks for an `index.ts` or `index.js` entry point. When `package.json`
 * exists, the parser checks for the presence of the metadata field specified
 * by `options.metadataField` (default `'xcli'`). Returns warnings instead of
 * failing for metadata issues.
 *
 * 消费者可通过 `options.metadataField` 自定义字段名：
 * - 通用消费者：默认 `'xcli'`
 * - xbrowser：传 `'xbrowser'` 以兼容现有插件
 */
export function verifyPlugin(dir: string, options: VerifyPluginOptions = {}): PluginVerifyResult {
  const metadataField = options.metadataField ?? 'xcli';
  const warnings: string[] = [];

  const indexPath = resolve(dir, 'index.ts');
  if (!existsSync(indexPath)) {
    const indexJs = resolve(dir, 'index.js');
    if (!existsSync(indexJs)) {
      return { valid: false, error: 'No index.ts or index.js entry point found', warnings };
    }
  }

  const pkgPath = resolve(dir, 'package.json');
  if (!existsSync(pkgPath)) {
    warnings.push('No package.json found');
  } else {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      if (!pkg[metadataField]) {
        warnings.push(`No ${metadataField} metadata in package.json`);
      }
    } catch {
      warnings.push('Invalid package.json');
    }
  }

  return { valid: true, warnings };
}

/**
 * Remove a directory tree, swallowing any errors (e.g. ENOENT, EPERM).
 * Useful in `finally` blocks where cleanup must not throw.
 */
export function safeCleanup(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
