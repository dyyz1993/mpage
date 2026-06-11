import { existsSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';

export type SourceType = 'local' | 'npm' | 'git' | 'url' | 'builtin';

const GIT_SCHEMES = /^(git\+https|git\+ssh|git\+|git@|git:\/\/|https?:\/\/.*\.git$|ssh:\/\/)/;
const HTTP_SCHEME = /^https?:\/\//;
const NPM_SCOPED = /^@[^/]+\/[^/@]+/;
const NPM_PLAIN = /^[^/]+$/;
const VERSION_SUFFIX = /@[\^~]?[\dx.*]+(-[\w.]+)?$/;

const isPathLike = (s: string): boolean => {
  if (s.startsWith('file://')) return true;
  if (s.startsWith('~/')) return true;
  if (s.startsWith('/')) return true;
  if (s.startsWith('./') || s.startsWith('../')) return true;
  if (existsSync(s)) {
    try {
      return statSync(s).isDirectory();
    } catch {
      return false;
    }
  }
  return false;
};

const isNpmName = (s: string): boolean => {
  if (NPM_SCOPED.test(s.split('@').slice(0, 2).join('@'))) return true;
  if (NPM_PLAIN.test(s.split('@')[0])) {
    return /^[\w.-]+(@[\^~]?[\dx.*]+(-[\w.]+)?)?$/.test(s);
  }
  return false;
};

const isGitUrl = (s: string): boolean => {
  if (GIT_SCHEMES.test(s)) return true;
  if (/\.git$/.test(s)) return true;
  // Unadorned github.com/owner/repo (and similar) URLs.
  return /^https?:\/\/(github\.com|gitlab\.com|bitbucket\.org|gitee\.com)\/[^/]+\/[^/]+/.test(s);
};

const isHttpUrl = (s: string): boolean => HTTP_SCHEME.test(s) && !/\.git$/.test(s);

/**
 * Classify a plugin source string into one of the supported installer types.
 *
 * Order of detection is significant:
 * 1. `local` — any path-like string or `file://` URL
 * 2. `git`   — anything that looks like a git URL
 * 3. `npm`   — a valid npm package name (with optional version)
 * 4. `url`   — plain http(s) URL
 *
 * @throws when the source cannot be classified.
 */
export function detectSourceType(source: string): SourceType {
  if (!source || !source.trim()) {
    throw new Error('Plugin source cannot be empty');
  }

  if (isPathLike(source)) return 'local';
  if (isGitUrl(source)) return 'git';
  if (isNpmName(source)) return 'npm';
  if (isHttpUrl(source)) return 'url';

  throw new Error(`Unrecognised plugin source: ${source}`);
}

const stripTrailing = (s: string): string => s.replace(/\/+$/, '');

const lastSegment = (s: string): string => {
  const cleaned = stripTrailing(s);
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || cleaned;
};

const stripGitSuffix = (s: string): string => s.replace(/\.git$/, '');

/**
 * Derive a plugin name from a source string and its already-detected type.
 *
 * The rules are:
 * - `local`: trailing path segment, with trailing slashes stripped
 * - `npm`:   package name (with scope if scoped), version stripped
 * - `git`:   last URL path segment, `.git` suffix removed
 * - `url`:   URL filename (extension stripped) or sanitised host as fallback
 * - `builtin`: returned unchanged (builtins are referenced by their own id)
 */
export function deriveName(source: string, type: SourceType): string {
  switch (type) {
    case 'local': {
      if (source.startsWith('file://')) {
        return stripGitSuffix(lastSegment(decodeURIComponent(new URL(source).pathname)));
      }
      return stripGitSuffix(lastSegment(source));
    }

    case 'npm': {
      if (source.startsWith('@')) {
        const slash = source.indexOf('/');
        if (slash < 0) return source;
        const tail = source.slice(slash + 1);
        const versionIdx = tail.search(VERSION_SUFFIX);
        const name = versionIdx >= 0 ? tail.slice(0, versionIdx) : tail;
        return `${source.slice(0, slash)}/${name}`;
      }
      const versionIdx = source.search(VERSION_SUFFIX);
      return versionIdx >= 0 ? source.slice(0, versionIdx) : source;
    }

    case 'git': {
      const cleaned = source
        .replace(/^git\+/, '')
        .replace(/^git:\/\//, '')
        .replace(/^ssh:\/\//, '');
      const scpStyle = cleaned.match(/^git@[^:]+:(.+)$/);
      const path = scpStyle ? scpStyle[1] : (cleaned.split('://').pop() ?? cleaned);
      return stripGitSuffix(basename(path.split('?')[0] ?? path));
    }

    case 'url': {
      const url = new URL(source);
      const filename = url.pathname.split('/').filter(Boolean).pop();
      if (filename) {
        return stripGitSuffix(filename.replace(/\.[^.]+$/, ''));
      }
      return url.hostname.replace(/[^a-z0-9.-]/gi, '-');
    }

    case 'builtin': {
      return source;
    }
  }
}

// Keep `resolve` referenced in the type system so tsc doesn't drop the import
// when downstream consumers inline-derive names. Not exported because callers
// should pass absolute sources only.
void resolve;
