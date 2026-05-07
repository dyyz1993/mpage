import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

import { GitInstaller } from '../../src/plugin/installers/git-installer.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'mpage-test-'));
  vi.mocked(execSync).mockClear();
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('GitInstaller - Branch Coverage', () => {
  describe('install - error handling', () => {
    it('should throw when git clone fails with network error', async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Could not resolve host: github.com');
      });

      const installer = new GitInstaller(tempDir);
      await expect(installer.install('https://github.com/user/network-fail')).rejects.toThrow(
        'Failed to clone https://github.com/user/network-fail.git'
      );
    });

    it('should throw when git clone fails with auth error', async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Authentication failed');
      });

      const installer = new GitInstaller(tempDir);
      await expect(installer.install('github:private/repo')).rejects.toThrow(
        'Failed to clone https://github.com/private/repo.git'
      );
    });
  });

  describe('install - package.json handling', () => {
    it('should handle package.json with missing name field', async () => {
      vi.mocked(execSync).mockImplementation((_cmd: string) => {
        const pluginDir = join(tempDir, 'repo-without-name');
        if (!existsSync(pluginDir)) mkdirSync(pluginDir, { recursive: true });
        writeFileSync(join(pluginDir, 'package.json'), JSON.stringify({ version: '1.0.0' }));
        return '';
      });

      const installer = new GitInstaller(tempDir);
      const result = await installer.install('github:user/repo-without-name');

      expect(result.name).toBe('repo-without-name');
      expect(result.version).toBe('1.0.0');
    });

    it('should handle package.json with missing version field', async () => {
      vi.mocked(execSync).mockImplementation((_cmd: string) => {
        const pluginDir = join(tempDir, 'repo-without-version');
        if (!existsSync(pluginDir)) mkdirSync(pluginDir, { recursive: true });
        writeFileSync(join(pluginDir, 'package.json'), JSON.stringify({ name: 'custom-name' }));
        return '';
      });

      const installer = new GitInstaller(tempDir);
      const result = await installer.install('github:user/repo-without-version');

      expect(result.name).toBe('custom-name');
      expect(result.version).toBe('0.0.0');
    });

    it('should handle malformed package.json', async () => {
      vi.mocked(execSync).mockImplementation((_cmd: string) => {
        const pluginDir = join(tempDir, 'malformed-repo');
        if (!existsSync(pluginDir)) mkdirSync(pluginDir, { recursive: true });
        writeFileSync(join(pluginDir, 'package.json'), '{invalid json}', 'utf-8');
        return '';
      });

      const installer = new GitInstaller(tempDir);
      await expect(installer.install('github:user/malformed-repo')).rejects.toThrow();
    });
  });

  describe('update - git pull failure handling', () => {
    it('should silently continue when git pull fails', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('git -C') && cmd.includes('pull')) {
          throw new Error('Could not resolve origin');
        }
        if (cmd.includes('remote get-url')) return 'https://github.com/user/update-fail.git\n';
        return '';
      });

      const pluginDir = join(tempDir, 'update-fail');
      mkdirSync(pluginDir, { recursive: true });
      mkdirSync(join(pluginDir, '.git'), { recursive: true });
      writeFileSync(
        join(pluginDir, 'package.json'),
        JSON.stringify({ name: 'update-fail', version: '1.0.0' })
      );

      const installer = new GitInstaller(tempDir);
      const result = await installer.update('git:update-fail');

      expect(result).toBeDefined();
      expect(result.id).toBe('git:update-fail');
      expect(result.source).toBe('https://github.com/user/update-fail.git');
    });

    it('should use current version when pull fails and no package.json', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('git -C') && cmd.includes('pull')) {
          throw new Error('Network error');
        }
        if (cmd.includes('remote get-url')) return 'https://github.com/user/no-pkg.git\n';
        return '';
      });

      const pluginDir = join(tempDir, 'no-pkg');
      mkdirSync(pluginDir, { recursive: true });
      mkdirSync(join(pluginDir, '.git'), { recursive: true });

      const installer = new GitInstaller(tempDir);
      const result = await installer.update('git:no-pkg');

      expect(result.name).toBe('no-pkg');
      expect(result.version).toBe('0.0.0');
    });
  });

  describe('update - package.json handling', () => {
    it('should handle missing package.json during update', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('remote get-url')) return 'https://github.com/user/missing-pkg.git\n';
        return '';
      });

      const pluginDir = join(tempDir, 'missing-pkg');
      mkdirSync(pluginDir, { recursive: true });
      mkdirSync(join(pluginDir, '.git'), { recursive: true });

      const installer = new GitInstaller(tempDir);
      const result = await installer.update('git:missing-pkg');

      expect(result.name).toBe('missing-pkg');
      expect(result.version).toBe('0.0.0');
      expect(result.source).toBe('https://github.com/user/missing-pkg.git');
    });

    it('should handle malformed package.json during update', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('remote get-url')) return 'https://github.com/user/bad-json.git\n';
        return '';
      });

      const pluginDir = join(tempDir, 'bad-json');
      mkdirSync(pluginDir, { recursive: true });
      mkdirSync(join(pluginDir, '.git'), { recursive: true });
      writeFileSync(join(pluginDir, 'package.json'), '{invalid}', 'utf-8');

      const installer = new GitInstaller(tempDir);
      await expect(installer.update('git:bad-json')).rejects.toThrow();
    });

    it('should use default name when package.json has no name', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('remote get-url')) return 'https://github.com/user/no-name.git\n';
        return '';
      });

      const pluginDir = join(tempDir, 'no-name');
      mkdirSync(pluginDir, { recursive: true });
      mkdirSync(join(pluginDir, '.git'), { recursive: true });
      writeFileSync(join(pluginDir, 'package.json'), JSON.stringify({ version: '2.0.0' }));

      const installer = new GitInstaller(tempDir);
      const result = await installer.update('git:no-name');

      expect(result.name).toBe('no-name');
      expect(result.version).toBe('2.0.0');
    });
  });

  describe('update - remote URL handling', () => {
    it('should handle missing remote URL gracefully', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('remote get-url')) {
          throw new Error('fatal: No such remote: origin');
        }
        return '';
      });

      const pluginDir = join(tempDir, 'no-remote');
      mkdirSync(pluginDir, { recursive: true });
      mkdirSync(join(pluginDir, '.git'), { recursive: true });
      writeFileSync(
        join(pluginDir, 'package.json'),
        JSON.stringify({ name: 'no-remote', version: '1.0.0' })
      );

      const installer = new GitInstaller(tempDir);
      const result = await installer.update('git:no-remote');

      expect(result.name).toBe('no-remote');
      expect(result.source).toBe('');
    });
  });

  describe('list - file system scanning', () => {
    it('should skip files (non-directories) in plugins directory', async () => {
      const installer = new GitInstaller(tempDir);
      writeFileSync(join(tempDir, 'some-file.txt'), 'content', 'utf-8');

      const list = await installer.list();

      expect(list).toHaveLength(0);
    });

    it('should handle directories without package.json', async () => {
      const pluginDir = join(tempDir, 'no-pkg-dir');
      mkdirSync(pluginDir, { recursive: true });
      mkdirSync(join(pluginDir, '.git'), { recursive: true });

      const installer = new GitInstaller(tempDir);
      const list = await installer.list();

      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('git:no-pkg-dir');
      expect(list[0].name).toBe('no-pkg-dir');
      expect(list[0].version).toBe('0.0.0');
    });

    it('should handle malformed package.json in listed plugin', async () => {
      const pluginDir = join(tempDir, 'malformed-list');
      mkdirSync(pluginDir, { recursive: true });
      mkdirSync(join(pluginDir, '.git'), { recursive: true });
      writeFileSync(join(pluginDir, 'package.json'), '{bad json}', 'utf-8');

      const installer = new GitInstaller(tempDir);
      await expect(installer.list()).rejects.toThrow();
    });

    it('should use directory name when package.json has no name field', async () => {
      const pluginDir = join(tempDir, 'list-no-name');
      mkdirSync(pluginDir, { recursive: true });
      mkdirSync(join(pluginDir, '.git'), { recursive: true });
      writeFileSync(join(pluginDir, 'package.json'), JSON.stringify({ version: '3.0.0' }));

      const installer = new GitInstaller(tempDir);
      const list = await installer.list();

      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('list-no-name');
      expect(list[0].version).toBe('3.0.0');
    });

    it('should handle mixed valid and invalid directories', async () => {
      const validDir = join(tempDir, 'valid');
      mkdirSync(validDir, { recursive: true });
      mkdirSync(join(validDir, '.git'), { recursive: true });
      writeFileSync(
        join(validDir, 'package.json'),
        JSON.stringify({ name: 'valid', version: '1.0.0' })
      );

      const noGitDir = join(tempDir, 'no-git');
      mkdirSync(noGitDir, { recursive: true });
      writeFileSync(join(noGitDir, 'package.json'), '{}');

      const fileEntry = join(tempDir, 'file-entry');
      writeFileSync(fileEntry, 'content', 'utf-8');

      const installer = new GitInstaller(tempDir);
      const list = await installer.list();

      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('valid');
    });
  });

  describe('force flag - additional coverage', () => {
    it('should throw error when directory exists without force flag', async () => {
      const existingDir = join(tempDir, 'existing');
      mkdirSync(existingDir, { recursive: true });
      writeFileSync(join(existingDir, 'data.txt'), 'old data', 'utf-8');

      const installer = new GitInstaller(tempDir);
      await expect(installer.install('github:user/existing')).rejects.toThrow(
        'Plugin already exists'
      );
      expect(existsSync(join(existingDir, 'data.txt'))).toBe(true);
    });
  });
});
