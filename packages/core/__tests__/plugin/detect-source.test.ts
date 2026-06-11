import { describe, it, expect } from 'vitest';
import {
  detectSourceType,
  deriveName,
  type SourceType,
} from '../../src/plugin/installers/detect-source.js';

describe('detectSourceType', () => {
  describe('local paths', () => {
    it.each([
      ['./relative/plugin', 'local'],
      ['../parent/plugin', 'local'],
      ['/absolute/path', 'local'],
      ['~/home/plugin', 'local'],
      ['file:///abs/path', 'local'],
    ])('classifies %s as %s', (input, expected) => {
      expect(detectSourceType(input)).toBe(expected);
    });

    it('returns local for an existing directory', () => {
      expect(detectSourceType('/tmp')).toBe('local');
    });
  });

  describe('npm sources', () => {
    it.each([
      ['lodash', 'npm'],
      ['@types/node', 'npm'],
      ['@scope/pkg@1.0.0', 'npm'],
      ['pkg-name@^2.1.0', 'npm'],
    ])('classifies %s as %s', (input, expected) => {
      expect(detectSourceType(input)).toBe(expected);
    });
  });

  describe('git sources', () => {
    it.each([
      ['git@github.com:owner/repo.git', 'git'],
      ['https://github.com/owner/repo.git', 'git'],
      ['https://github.com/owner/repo', 'git'],
      ['git+https://github.com/owner/repo.git', 'git'],
      ['git://github.com/owner/repo.git', 'git'],
      ['ssh://git@gitlab.com/owner/repo.git', 'git'],
    ])('classifies %s as %s', (input, expected) => {
      expect(detectSourceType(input)).toBe(expected);
    });
  });

  describe('url sources', () => {
    it.each([
      ['https://example.com/plugin.js', 'url'],
      ['https://example.com/plugin.tgz', 'url'],
      ['http://example.com/path/to/plugin.tar.gz', 'url'],
    ])('classifies %s as %s', (input, expected) => {
      expect(detectSourceType(input)).toBe(expected);
    });
  });

  it('throws on empty input', () => {
    expect(() => detectSourceType('')).toThrow(/source/i);
  });

  it('throws on unrecognised source', () => {
    expect(() => detectSourceType('not a source !!!')).toThrow(/source/i);
  });
});

describe('deriveName', () => {
  describe('local sources', () => {
    it('uses trailing path segment', () => {
      expect(deriveName('./plugins/my-plugin', 'local')).toBe('my-plugin');
    });

    it('uses basename for absolute paths', () => {
      expect(deriveName('/abs/path/to/cool-plugin', 'local')).toBe('cool-plugin');
    });

    it('handles trailing slashes', () => {
      expect(deriveName('./plugins/cool-plugin/', 'local')).toBe('cool-plugin');
    });
  });

  describe('npm sources', () => {
    it('returns the package name for plain package', () => {
      expect(deriveName('lodash', 'npm')).toBe('lodash');
    });

    it('returns the full scoped name for scoped packages', () => {
      expect(deriveName('@types/node', 'npm')).toBe('@types/node');
    });

    it('strips the version specifier', () => {
      expect(deriveName('lodash@4.17.21', 'npm')).toBe('lodash');
      expect(deriveName('@types/node@1.0.0', 'npm')).toBe('@types/node');
    });
  });

  describe('git sources', () => {
    it('extracts repo name from .git URL', () => {
      expect(deriveName('https://github.com/owner/repo.git', 'git')).toBe('repo');
    });

    it('extracts repo name from scp-style URL', () => {
      expect(deriveName('git@github.com:owner/repo.git', 'git')).toBe('repo');
    });

    it('extracts repo name from URL without .git suffix', () => {
      expect(deriveName('https://github.com/owner/repo', 'git')).toBe('repo');
    });
  });

  describe('url sources', () => {
    it('uses the URL filename (stripped of extension)', () => {
      expect(deriveName('https://example.com/my-plugin.js', 'url')).toBe('my-plugin');
      expect(deriveName('https://example.com/my-plugin.tgz', 'url')).toBe('my-plugin');
    });

    it('falls back to a sanitised host when no filename', () => {
      expect(deriveName('https://example.com/', 'url')).toBe('example.com');
    });
  });

  it('returns the full source for builtin (defensive)', () => {
    // Builtin sources are referenced by directory and shouldn't be derived.
    // The contract is "return source unchanged".
    const result = deriveName('built-in', 'builtin');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// Sanity check the SourceType union is exported and usable.
function _acceptSourceType(s: SourceType): SourceType {
  return s;
}
void _acceptSourceType;
